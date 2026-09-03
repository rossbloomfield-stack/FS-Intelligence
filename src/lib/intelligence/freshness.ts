import type { IntelligenceQueryPlan } from "@/lib/intelligence/query-planner";
export type FreshnessAssessment={requiresFreshResearch:boolean;reason:string;knowledgeCutoff:string|null};
export function assessFreshness(plan:IntelligenceQueryPlan,publicationDates:Array<string|null>,now=new Date()):FreshnessAssessment{
  const valid=publicationDates.map(value=>value?Date.parse(value):NaN).filter(Number.isFinite);
  const latest=valid.length?new Date(Math.max(...valid)).toISOString().slice(0,10):null;
  if(plan.intent==="regulatory_question"||plan.intent==="compliance_question")return {requiresFreshResearch:true,reason:"Regulatory status requires current primary-source validation.",knowledgeCutoff:latest};
  if(plan.timeframe.currentInformationRequired)return {requiresFreshResearch:true,reason:"The question explicitly requests current information.",knowledgeCutoff:latest};
  if(!latest)return {requiresFreshResearch:true,reason:"No dated evidence establishes a reliable knowledge cutoff.",knowledgeCutoff:null};
  const ageDays=(now.getTime()-Date.parse(latest))/86_400_000;
  return {requiresFreshResearch:ageDays>120,reason:ageDays>120?"The newest relevant evidence is older than 120 days.":"Persistent evidence is recent enough for retrieval.",knowledgeCutoff:latest};
}
