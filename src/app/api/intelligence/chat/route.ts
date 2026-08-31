import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isApprovedEmail } from "@/lib/auth/access";
import { answerForRetrieval } from "@/lib/intelligence/evidence-readiness";
import { type IntelligenceUIMessage } from "@/lib/intelligence/evidence";
import { attachAliases,resolveOrganisations } from "@/lib/intelligence/entity-resolver";
import { planIntelligenceQuery } from "@/lib/intelligence/query-planner";
import { retrieveFinancialIntelligence } from "@/lib/intelligence/retriever";
import { buildStructuredAnswer,type StructuredKnowledge } from "@/lib/intelligence/structured-answer";

export const maxDuration=30;
const requestSchema=z.object({id:z.string().uuid().optional(),messages:z.array(z.object({id:z.string(),role:z.enum(["user","assistant","system"]),parts:z.array(z.unknown())}).passthrough()).min(1)});
function messageText(message:UIMessage|undefined){return message?.parts.filter((p):p is Extract<typeof p,{type:"text"}>=>p.type==="text").map(p=>p.text).join("").trim()??"";}
export async function POST(request:Request){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user||!isApprovedEmail(user.email))return Response.json({error:"Unauthorized"},{status:401});
 const parsed=requestSchema.safeParse(await request.json());
 if(!parsed.success)return Response.json({error:"A valid chat request is required"},{status:400});
 const body=parsed.data as {id?:string;messages:IntelligenceUIMessage[]};
 const question=messageText(body.messages.at(-1));
 if(!question||question.length>4000)return Response.json({error:"A valid question is required"},{status:400});
 const [{data:sourceRows},{data:organisationRows},{data:aliasRows}]=await Promise.all([
  supabase.from("sources").select("id,title,publisher,url,publication_date,source_type,primary_source,credibility_tier,evidence_classification,notes").eq("approved_public",true).limit(100),
  supabase.from("organisations").select("id,slug,name,sector,jurisdiction").eq("active",true),
  supabase.from("organisation_aliases").select("organisation_id,alias"),
 ]);
 const catalogue=attachAliases(organisationRows??[],aliasRows??[]);
 const organisations=resolveOrganisations(question,catalogue);
 const plan=planIntelligenceQuery(question,organisations);
 const domainAvailability=await loadDomainAvailability(supabase,plan.evidenceNeeds);
 const retrieval=retrieveFinancialIntelligence(question,plan,sourceRows??[],new Date(),domainAvailability);
 const {references,evidence,gaps}=retrieval;
 const structuredKnowledge=await loadStructuredKnowledge(supabase,plan,references);
 const structuredAnswer=buildStructuredAnswer(plan,structuredKnowledge,references);
 const answer=answerForRetrieval(references.length,gaps);
 const title=question.length>72?`${question.slice(0,69)}…`:question;
 const conversationId=body.id??crypto.randomUUID();
 await supabase.from("conversations").upsert({id:conversationId,user_id:user.id,title,status:"active",context:{queryPlan:plan,answerMode:structuredAnswer?.kind??"quick_answer",freshnessAssessment:retrieval.freshnessAssessment,domainAvailability,gaps},updated_at:new Date().toISOString()},{onConflict:"id"});
 await supabase.from("conversation_messages").insert({conversation_id:conversationId,user_id:user.id,role:"user",content:{text:question},intent:plan.intent});
 if(organisations.length)await supabase.from("conversation_entities").upsert(organisations.map(item=>({conversation_id:conversationId,entity_type:"organisation",entity_id:item.id,entity_label:item.name})),{onConflict:"conversation_id,entity_type,entity_id",ignoreDuplicates:true});
 const stream=createUIMessageStream<IntelligenceUIMessage>({originalMessages:body.messages,execute:({writer})=>{writer.write({type:"data-evidence",id:"answer-evidence",data:evidence});if(structuredAnswer)writer.write({type:"data-structuredAnswer",id:"answer-structure",data:structuredAnswer});writer.write({type:"text-start",id:"answer"});writer.write({type:"text-delta",id:"answer",delta:answer});writer.write({type:"text-end",id:"answer"});},onEnd:async({responseMessage})=>{const {data:stored}=await supabase.from("conversation_messages").insert({conversation_id:conversationId,user_id:user.id,role:"assistant",content:responseMessage,confidence:evidence.confidence,freshness:evidence.freshness}).select("id").single();if(stored&&references.length)await supabase.from("conversation_references").insert(references.map(item=>({conversation_id:conversationId,message_id:stored.id,source_id:item.sourceId,reference_snapshot:item,rank:item.rank,support_strength:item.supportStrength==="supporting"?"direct":item.supportStrength==="counter"?"corroborating":"contextual"})));}});
 return createUIMessageStreamResponse({stream,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
}

async function loadDomainAvailability(supabase:Awaited<ReturnType<typeof createClient>>,evidenceNeeds:string[]){
 const tableByNeed:Record<string,"candidate_events"|"regulatory_items"|"ai_initiatives"|"ownership_events"|"organisation_relationships"|"digital_capabilities"|"company_strategy_profiles"|"company_financial_metrics"|"products">={
  recent_material_events:"candidate_events",regulatory_items:"regulatory_items",primary_regulation:"regulatory_items",ai_initiatives:"ai_initiatives",
  ownership_events:"ownership_events",organisation_relationships:"organisation_relationships",digital_capabilities:"digital_capabilities",competitor_pages:"products",
  strategy_profile:"company_strategy_profiles",financial_metrics:"company_financial_metrics",products:"products",
 };
 const needs=[...new Set(evidenceNeeds)];
 const results=await Promise.all(needs.map(async need=>{
  const table=tableByNeed[need];
  if(!table)return [need,0] as const;
  const {count}=await supabase.from(table).select("id",{count:"exact",head:true});
  return [need,count??0] as const;
 }));
 return Object.fromEntries(results);
}

async function loadStructuredKnowledge(supabase:Awaited<ReturnType<typeof createClient>>,plan:ReturnType<typeof planIntelligenceQuery>,references:import("@/lib/intelligence/evidence").EvidenceReference[]):Promise<StructuredKnowledge>{
 const organisationIds=plan.organisations.map(item=>item.id);
 const emptyResult={data:[]};
 let productQuery=supabase.from("products").select("id,organisation_id,name,category,key_features,online_journey,pricing,fees,source_id").eq("approved",true).order("last_verified_at",{ascending:false}).limit(30);
 if(organisationIds.length)productQuery=productQuery.in("organisation_id",organisationIds);
 else if(plan.products.length)productQuery=productQuery.in("category",plan.products);
 const [strategies,metrics,capabilities,products,digital,ai,updates,eventLinks]=await Promise.all([
  organisationIds.length?supabase.from("company_strategy_profiles").select("id,organisation_id,strategy_summary,effective_at,confidence").in("organisation_id",organisationIds).eq("approved",true).order("effective_at",{ascending:false}).limit(30):Promise.resolve(emptyResult),
  organisationIds.length?supabase.from("company_financial_metrics").select("id,organisation_id,metric,value,unit,period_end,source_id").in("organisation_id",organisationIds).eq("approved",true).order("period_end",{ascending:false}).limit(50):Promise.resolve(emptyResult),
  organisationIds.length?supabase.from("digital_capabilities").select("id,organisation_id,capability,status,maturity,assessment,source_id").in("organisation_id",organisationIds).eq("approved",true).order("last_verified_at",{ascending:false}).limit(50):Promise.resolve(emptyResult),
  plan.intent==="product_comparison"||organisationIds.length?productQuery:Promise.resolve(emptyResult),
  organisationIds.length?supabase.from("digital_benchmarks").select("id,organisation_id,category,assessment,maturity").in("organisation_id",organisationIds).order("updated_at",{ascending:false}).limit(30):Promise.resolve(emptyResult),
  organisationIds.length?supabase.from("ai_initiatives").select("id,organisation_id,use_case,maturity,objective,last_changed").in("organisation_id",organisationIds).order("last_changed",{ascending:false}).limit(30):Promise.resolve(emptyResult),
  organisationIds.length?supabase.from("competitor_updates").select("id,organisation_id,strategic_theme,customer_implication,commercial_implication").in("organisation_id",organisationIds).order("updated_at",{ascending:false}).limit(30):Promise.resolve(emptyResult),
  organisationIds.length?supabase.from("event_organisations").select("organisation_id,candidate_events(id,title,event_date,announcement_date,source_publication_date,factual_summary)").in("organisation_id",organisationIds).limit(50):Promise.resolve(emptyResult),
 ]);
 const knowledgeOrganisationIds=[...new Set([...organisationIds,...(products.data??[]).map(item=>item.organisation_id)])];
 const organisationNames=new Map<string,string>();
 const {data:names}=knowledgeOrganisationIds.length?await supabase.from("organisations").select("id,name").in("id",knowledgeOrganisationIds):{data:[]};
 for(const item of names??[])organisationNames.set(item.id,item.name);
 const eventIds=(eventLinks.data??[]).flatMap(link=>{const event=Array.isArray(link.candidate_events)?link.candidate_events[0]:link.candidate_events;return event?[event.id]:[]});
 const {data:eventSources}=eventIds.length?await supabase.from("event_sources").select("event_id,source_id").in("event_id",eventIds):{data:[]};
 const sourceByEvent=new Map((eventSources??[]).map(item=>[item.event_id,item.source_id]));
 const timelineById=new Map<string,StructuredKnowledge["timelineEvents"][number]>();
 for(const link of eventLinks.data??[]){
  const event=Array.isArray(link.candidate_events)?link.candidate_events[0]:link.candidate_events;
  if(!event)continue;
  const organisationName=organisationNames.get(link.organisation_id)??"Organisation";
  const existing=timelineById.get(event.id);
  if(existing){existing.organisationNames=[...new Set([...existing.organisationNames,organisationName])];continue}
  timelineById.set(event.id,{id:event.id,date:event.event_date??event.announcement_date??event.source_publication_date,label:event.title,summary:event.factual_summary,organisationNames:[organisationName],sourceId:sourceByEvent.get(event.id)??null,referenceId:null});
 }
 const timelineEvents=[...timelineById.values()].sort((a,b)=>(b.date??"").localeCompare(a.date??""));
 const referenceBySource=new Map(references.map(reference=>[reference.sourceId,reference.id]));
 const productCards=(products.data??[]).map(product=>({id:product.id,provider:organisationNames.get(product.organisation_id)??"Organisation",name:product.name,category:product.category,features:product.key_features??[],journey:product.online_journey,pricing:product.pricing??product.fees,sourceReferenceId:referenceBySource.get(product.source_id)??null,thumbnailUrl:null}));
 return {strategyProfiles:strategies.data??[],financialMetrics:(metrics.data??[]).map(item=>({...item,value:Number(item.value)})),digitalCapabilities:capabilities.data??[],digitalBenchmarks:digital.data??[],aiInitiatives:ai.data??[],competitorUpdates:updates.data??[],timelineEvents,products:productCards};
}
