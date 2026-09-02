import type { UIMessage } from "ai";
import type { StructuredAnswer } from "@/lib/intelligence/structured-answer";

export type EvidenceConfidence="high"|"medium"|"low"|"insufficient";
export type EvidenceSupport="supporting"|"counter"|"contextual";
export type EvidenceReference={id:string;sourceId:string;title:string;publisher:string;url:string;publicationDate:string|null;sourceType:string;primary:boolean;classification:string|null;claimSupported:string;supportStrength:EvidenceSupport;rank:number};
export type EvidencePackage={confidence:EvidenceConfidence;freshness:"persistent_knowledge"|"persistent_plus_fresh"|"fresh_research";checkedAt:string;references:EvidenceReference[];primaryCount:number};
export type IntelligenceFinding={title:string;analysis:string;referenceIds:string[]};
export type IntelligenceAnalysis={
 headline:string;
 executiveSummary:string;
 evidenceFindings:IntelligenceFinding[];
 strategicInterpretation:string|null;
 irishMarketImplication:string|null;
 counterEvidence:string[];
 whatToWatch:string[];
 confidence:EvidenceConfidence;
 confidenceReason:string;
 followUpQuestions:string[];
 generatedBy:"model"|"fallback";
};
export type IntelligenceResearchStatus={stage:"retrieving"|"analysing"|"complete";label:string};
export type IntelligenceUIMessage=UIMessage<never,{evidence:EvidencePackage;structuredAnswer:StructuredAnswer;analysis:IntelligenceAnalysis;researchStatus:IntelligenceResearchStatus}>;

type SourceRow={id:string;title:string|null;publisher:string|null;url:string|null;publication_date:string|null;source_type:string|null;primary_source:boolean|null;credibility_tier:number|null;evidence_classification:string|null;notes:string|null};

export function rankEvidence(rows:SourceRow[]):EvidenceReference[]{
 return rows.filter((row)=>isSafeUrl(row.url)).sort((a,b)=>Number(b.primary_source)-Number(a.primary_source)||(a.credibility_tier??99)-(b.credibility_tier??99)||dateValue(b.publication_date)-dateValue(a.publication_date)).slice(0,10).map((row,index)=>({id:`ref-${index+1}`,sourceId:row.id,title:row.title?.trim()||"Untitled source",publisher:row.publisher?.trim()||"Publisher not recorded",url:row.url!,publicationDate:row.publication_date,sourceType:row.source_type?.trim()||"Source",primary:Boolean(row.primary_source),classification:row.evidence_classification,claimSupported:row.notes?.trim()||"Relevant background evidence",supportStrength:"supporting",rank:index+1}));
}
export function makeEvidencePackage(references:EvidenceReference[],checkedAt=new Date().toISOString()):EvidencePackage{
 const primaryCount=references.filter((item)=>item.primary).length;
 const confidence:EvidenceConfidence=references.length===0?"insufficient":primaryCount>=2&&references.length>=3?"high":primaryCount>=1?"medium":"low";
 return {confidence,freshness:"persistent_knowledge",checkedAt,references,primaryCount};
}
export function validateEvidence(references:EvidenceReference[]){
 const seen=new Set<string>();return references.filter((item)=>item.sourceId&&isSafeUrl(item.url)&&!seen.has(item.sourceId)&&seen.add(item.sourceId));
}
function isSafeUrl(url:string|null):url is string{if(!url)return false;try{const parsed=new URL(url);return parsed.protocol==="https:"||parsed.protocol==="http:"}catch{return false}}
function dateValue(value:string|null){const parsed=value?Date.parse(value):0;return Number.isNaN(parsed)?0:parsed}
