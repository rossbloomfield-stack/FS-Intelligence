import type { EvidenceReference } from "@/lib/intelligence/evidence";
import type { IntelligenceQueryPlan,ResolvedOrganisation } from "@/lib/intelligence/query-planner";

export type CompanyIntelligenceCard={id:string;slug:string;name:string;sector:string;jurisdiction:string|null;strategySummary:string|null;digitalAssessment:string|null;aiAssessment:string|null;strategicTheme:string|null;financialHighlights:string[];evidenceReferenceIds:string[]};
export type ProductIntelligenceCard={id:string;provider:string;name:string;category:string;features:string[];journey:string|null;pricing:string|null;sourceReferenceId:string|null;thumbnailUrl:string|null};
export type TimelineItem={id:string;date:string|null;label:string;summary:string;organisationNames:string[];sourceId:string|null;referenceId:string|null};
export type StructuredAnswer=
 | {kind:"company_comparison";title:string;companies:CompanyIntelligenceCard[];limitations:string[]}
 | {kind:"company_cards";title:string;companies:CompanyIntelligenceCard[];limitations:string[]}
 | {kind:"product_comparison";title:string;products:ProductIntelligenceCard[];limitations:string[]}
 | {kind:"timeline";title:string;events:TimelineItem[];limitations:string[]};

export type StructuredKnowledge={
 strategyProfiles:Array<{id:string;organisation_id:string;organisation_name?:string;strategy_summary:string;effective_at:string;confidence:"high"|"medium"|"low"|"insufficient"}>;
 financialMetrics:Array<{id:string;organisation_id:string;organisation_name?:string;metric:string;value:number;unit:string;period_end:string;source_id:string}>;
 digitalCapabilities:Array<{id:string;organisation_id:string;organisation_name?:string;capability:string;status:string;maturity:number|null;assessment:string|null;source_id:string}>;
 digitalBenchmarks:Array<{id:string;organisation_id:string|null;organisation_name?:string;category:string;assessment:string|null;maturity:number|null}>;
 aiInitiatives:Array<{id:string;organisation_id:string;organisation_name?:string;use_case:string;maturity:string;objective:string;last_changed:string|null}>;
 competitorUpdates:Array<{id:string;organisation_id:string;organisation_name?:string;strategic_theme:string|null;customer_implication:string|null;commercial_implication:string|null}>;
 timelineEvents:TimelineItem[];
 products:ProductIntelligenceCard[];
};

export function buildStructuredAnswer(plan:IntelligenceQueryPlan,knowledge:StructuredKnowledge,references:EvidenceReference[]):StructuredAnswer|null{
 const limitations:string[]=[];
 const companies=plan.organisations.map(organisation=>companyCard(organisation,knowledge,references));
 if(companies.some(item=>!item.digitalAssessment))limitations.push("Digital capability evidence is unavailable for one or more organisations.");
 if(companies.some(item=>!item.aiAssessment))limitations.push("AI maturity evidence is unavailable for one or more organisations.");
 if(plan.intent==="company_comparison")return {kind:"company_comparison",title:`${companies.map(item=>item.name).join(" and ")} — evidence comparison`,companies,limitations};
 if(plan.intent==="product_comparison")return {kind:"product_comparison",title:"Product comparison",products:knowledge.products,limitations:knowledge.products.length?limitations:["No verified product records match this question."]};
 if(plan.intent==="ownership_ma"||plan.timeframe.label==="historical")return {kind:"timeline",title:"Verified timeline",events:knowledge.timelineEvents.map(event=>({...event,referenceId:references.find(reference=>reference.sourceId===event.sourceId)?.id??null})),limitations:knowledge.timelineEvents.length?limitations:["No verified dated events match this question."]};
 if(companies.length)return {kind:"company_cards",title:companies.length===1?"Company intelligence":"Companies in this answer",companies,limitations};
 return null;
}

function companyCard(organisation:ResolvedOrganisation,knowledge:StructuredKnowledge,references:EvidenceReference[]):CompanyIntelligenceCard{
 const strategy=knowledge.strategyProfiles.find(item=>item.organisation_id===organisation.id);
 const capabilities=knowledge.digitalCapabilities.filter(item=>item.organisation_id===organisation.id);
 const digital=knowledge.digitalBenchmarks.find(item=>item.organisation_id===organisation.id);
 const ai=knowledge.aiInitiatives.find(item=>item.organisation_id===organisation.id);
 const update=knowledge.competitorUpdates.find(item=>item.organisation_id===organisation.id);
 const names=[organisation.name.toLocaleLowerCase("en-IE"),organisation.slug.replaceAll("-"," ")];
 const evidenceReferenceIds=references.filter(reference=>names.some(name=>[reference.title,reference.publisher,reference.claimSupported].join(" ").toLocaleLowerCase("en-IE").includes(name))).map(reference=>reference.id);
 const digitalAssessment=capabilities.length?capabilities.slice(0,3).map(item=>`${humanise(item.capability)}: ${humanise(item.status)}${item.maturity?` (${item.maturity}/5)`:""}`).join(" · "):digital?.assessment??(digital?.maturity!=null?`Maturity ${digital.maturity}/5`:null);
 const financialHighlights=knowledge.financialMetrics.filter(item=>item.organisation_id===organisation.id).slice(0,3).map(item=>`${humanise(item.metric)}: ${item.value.toLocaleString("en-IE")} ${item.unit} (${item.period_end})`);
 return {id:organisation.id,slug:organisation.slug,name:organisation.name,sector:organisation.sector,jurisdiction:organisation.jurisdiction,strategySummary:strategy?.strategy_summary??null,digitalAssessment,aiAssessment:ai?`${ai.maturity} — ${ai.use_case}`:null,strategicTheme:update?.strategic_theme??null,financialHighlights,evidenceReferenceIds};
}

function humanise(value:string){return value.replaceAll("_"," ").replace(/^./,letter=>letter.toUpperCase())}
