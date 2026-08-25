import { makeEvidencePackage,validateEvidence,type EvidencePackage,type EvidenceReference } from "@/lib/intelligence/evidence";
import { assessFreshness,type FreshnessAssessment } from "@/lib/intelligence/freshness";
import type { IntelligenceQueryPlan } from "@/lib/intelligence/query-planner";

export type IntelligenceSourceRow={id:string;title:string|null;publisher:string|null;url:string|null;publication_date:string|null;source_type:string|null;primary_source:boolean|null;credibility_tier:number|null;evidence_classification:string|null;notes:string|null};
export type DomainAvailability=Record<string,number>;
export type RetrievalResult={references:EvidenceReference[];evidence:EvidencePackage;freshnessAssessment:FreshnessAssessment;domainAvailability:DomainAvailability;gaps:string[]};

const stopWords=new Set(["about","after","before","could","does","doing","from","have","into","irish","most","should","that","their","the","this","what","which","with","would","your"]);
export function retrieveFinancialIntelligence(question:string,plan:IntelligenceQueryPlan,rows:IntelligenceSourceRow[],now=new Date(),domainAvailability:DomainAvailability={}):RetrievalResult{
  const terms=tokenise(question);
  const organisations=plan.organisations.flatMap(item=>[item.name,item.slug.replaceAll("-"," ")]).map(value=>value.toLocaleLowerCase("en-IE"));
  const ranked=rows.map(row=>({row,score:scoreRow(row,terms,organisations,plan)})).filter(item=>item.score>0).sort((a,b)=>b.score-a.score||dateValue(b.row.publication_date)-dateValue(a.row.publication_date)).slice(0,10).map(({row},index)=>toReference(row,index));
  const references=validateEvidence(ranked);
  const freshnessAssessment=assessFreshness(plan,references.map(item=>item.publicationDate),now);
  const evidence=makeEvidencePackage(references);
  const gaps:string[]=[];
  if(!references.length)gaps.push("No approved source directly matched the question.");
  if(plan.organisations.length&&!references.some(ref=>organisations.some(name=>referenceHaystack(ref).includes(name))))gaps.push("No organisation-specific evidence matched the resolved company.");
  const unavailable=plan.evidenceNeeds.filter(item=>item in domainAvailability&&domainAvailability[item]===0);
  if(unavailable.length)gaps.push(`Structured evidence is not populated for: ${unavailable.join(", ")}.`);
  if(freshnessAssessment.requiresFreshResearch)gaps.push(freshnessAssessment.reason);
  return {references,evidence,freshnessAssessment,domainAvailability,gaps:[...new Set(gaps)]};
}

function scoreRow(row:IntelligenceSourceRow,terms:string[],organisations:string[],plan:IntelligenceQueryPlan){
  const text=haystack(row);
  const organisationMatches=organisations.filter(name=>text.includes(name)).length;
  if(organisations.length&&organisationMatches===0)return 0;
  let relevance=terms.filter(term=>text.includes(term)).length*3+organisationMatches*10;
  if(["regulatory_question","compliance_question"].includes(plan.intent)&&/(regulatory|legislation|central bank|european union)/i.test(text))relevance+=3;
  if(plan.regulations.some(regulation=>text.includes(regulation.toLocaleLowerCase("en-IE"))))relevance+=10;
  if(plan.intent==="financial_performance"&&/company_results/i.test(row.source_type??""))relevance+=7;
  if(plan.intent==="ai_transformation"&&/artificial intelligence|\bai\b/i.test(text))relevance+=7;
  if(plan.intent==="market_overview")relevance+=1;
  if(relevance===0)return 0;
  return relevance+(row.primary_source?2:0)+((row.credibility_tier??99)<=2?1:0);
}
function tokenise(value:string){return [...new Set(value.toLocaleLowerCase("en-IE").match(/[a-z0-9]{3,}/g)??[])].filter(item=>!stopWords.has(item))}
function haystack(row:Pick<IntelligenceSourceRow,"title"|"publisher"|"notes"|"source_type"|"evidence_classification">){return [row.title,row.publisher,row.notes,row.source_type,row.evidence_classification].filter(Boolean).join(" ").toLocaleLowerCase("en-IE")}
function referenceHaystack(row:EvidenceReference){return [row.title,row.publisher,row.claimSupported,row.sourceType,row.classification].filter(Boolean).join(" ").toLocaleLowerCase("en-IE")}
function toReference(row:IntelligenceSourceRow,index:number):EvidenceReference{return {id:`ref-${index+1}`,sourceId:row.id,title:row.title?.trim()||"Untitled source",publisher:row.publisher?.trim()||"Publisher not recorded",url:row.url!,publicationDate:row.publication_date,sourceType:row.source_type?.trim()||"Source",primary:Boolean(row.primary_source),classification:row.evidence_classification,claimSupported:row.notes?.trim()||"Relevant background evidence",supportStrength:"supporting",rank:index+1}}
function dateValue(value:string|null){const parsed=value?Date.parse(value):0;return Number.isNaN(parsed)?0:parsed}
