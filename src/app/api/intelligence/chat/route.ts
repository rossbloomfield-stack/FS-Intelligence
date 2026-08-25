import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isApprovedEmail } from "@/lib/auth/access";
import { answerForRetrieval } from "@/lib/intelligence/evidence-readiness";
import { type IntelligenceUIMessage } from "@/lib/intelligence/evidence";
import { attachAliases,resolveOrganisations } from "@/lib/intelligence/entity-resolver";
import { planIntelligenceQuery } from "@/lib/intelligence/query-planner";
import { retrieveFinancialIntelligence } from "@/lib/intelligence/retriever";

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
 const answer=answerForRetrieval(references.length,gaps);
 const title=question.length>72?`${question.slice(0,69)}…`:question;
 const conversationId=body.id??crypto.randomUUID();
 await supabase.from("conversations").upsert({id:conversationId,user_id:user.id,title,status:"active",context:{queryPlan:plan,freshnessAssessment:retrieval.freshnessAssessment,domainAvailability,gaps},updated_at:new Date().toISOString()},{onConflict:"id"});
 await supabase.from("conversation_messages").insert({conversation_id:conversationId,user_id:user.id,role:"user",content:{text:question},intent:plan.intent});
 if(organisations.length)await supabase.from("conversation_entities").upsert(organisations.map(item=>({conversation_id:conversationId,entity_type:"organisation",entity_id:item.id,entity_label:item.name})),{onConflict:"conversation_id,entity_type,entity_id",ignoreDuplicates:true});
 const stream=createUIMessageStream<IntelligenceUIMessage>({originalMessages:body.messages,execute:({writer})=>{writer.write({type:"data-evidence",id:"answer-evidence",data:evidence});writer.write({type:"text-start",id:"answer"});writer.write({type:"text-delta",id:"answer",delta:answer});writer.write({type:"text-end",id:"answer"});},onEnd:async({responseMessage})=>{const {data:stored}=await supabase.from("conversation_messages").insert({conversation_id:conversationId,user_id:user.id,role:"assistant",content:responseMessage,confidence:evidence.confidence,freshness:evidence.freshness}).select("id").single();if(stored&&references.length)await supabase.from("conversation_references").insert(references.map(item=>({conversation_id:conversationId,message_id:stored.id,source_id:item.sourceId,reference_snapshot:item,rank:item.rank,support_strength:item.supportStrength==="supporting"?"direct":item.supportStrength==="counter"?"corroborating":"contextual"})));}});
 return createUIMessageStreamResponse({stream,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
}

async function loadDomainAvailability(supabase:Awaited<ReturnType<typeof createClient>>,evidenceNeeds:string[]){
 const tableByNeed:Record<string,"candidate_events"|"regulatory_items"|"ai_initiatives"|"ownership_events"|"organisation_relationships"|"digital_benchmarks">={
  recent_material_events:"candidate_events",regulatory_items:"regulatory_items",primary_regulation:"regulatory_items",ai_initiatives:"ai_initiatives",
  ownership_events:"ownership_events",organisation_relationships:"organisation_relationships",digital_capabilities:"digital_benchmarks",competitor_pages:"digital_benchmarks",
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
