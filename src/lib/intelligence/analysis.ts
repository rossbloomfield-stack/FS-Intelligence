import type { EvidencePackage,IntelligenceAnalysis } from "@/lib/intelligence/evidence";

export type ModelAnalysis={headline:string;executiveSummary:string;evidenceFindings:Array<{title:string;analysis:string;referenceIds:string[]}>;strategicInterpretation:string|null;irishMarketImplication:string|null;counterEvidence:string[];whatToWatch:string[];confidenceReason:string;followUpQuestions:string[]};

export function normaliseAnalysis(value:ModelAnalysis,evidence:EvidencePackage):IntelligenceAnalysis{
 const allowedIds=new Set(evidence.references.map(reference=>reference.id));
 const evidenceFindings=value.evidenceFindings.map(finding=>({...finding,referenceIds:[...new Set(finding.referenceIds.filter(id=>allowedIds.has(id)))]})).filter(finding=>finding.referenceIds.length>0);
 return {...value,evidenceFindings,confidence:evidence.confidence,generatedBy:"model"};
}

export function fallbackAnalysis(evidence:EvidencePackage):IntelligenceAnalysis{
 if(!evidence.references.length)return insufficientAnalysis(evidence);
 return {
  headline:"Verified evidence was found, but contextual synthesis is temporarily unavailable.",
  executiveSummary:"The supporting material is available for inspection. I have not converted source notes into a strategic conclusion because the analysis service did not complete reliably.",
  evidenceFindings:evidence.references.slice(0,4).map(reference=>({title:reference.title,analysis:reference.claimSupported,referenceIds:[reference.id]})),
  strategicInterpretation:null,irishMarketImplication:null,
  counterEvidence:["No model-generated interpretation has been presented."],whatToWatch:[],confidence:evidence.confidence,
  confidenceReason:"Confidence describes the retrieved evidence footprint, not a completed strategic interpretation.",
  followUpQuestions:["Show me the strongest primary evidence.","Which evidence is most recent?"],generatedBy:"fallback",
 };
}

export function unavailableDailyBriefingAnalysis(evidence:EvidencePackage):IntelligenceAnalysis{return {
 headline:"No verified daily developments are available yet.",
 executiveSummary:"Nothing published within the current briefing window has completed verification. Older material has not been presented as today's news.",
 evidenceFindings:[],strategicInterpretation:null,irishMarketImplication:null,
 counterEvidence:["Current coverage is insufficient for a reliable daily ranking."],
 whatToWatch:["This briefing will update as new monitored sources complete verification."],confidence:evidence.confidence,
 confidenceReason:"No verified reference falls within the current daily briefing window.",
 followUpQuestions:["What are the most important developments in the latest verified evidence?","Which sources are currently monitored?"],generatedBy:"fallback",
};}

function insufficientAnalysis(evidence:EvidencePackage):IntelligenceAnalysis{return {
 headline:"There is not enough approved evidence to answer this reliably.",
 executiveSummary:"The current evidence store does not contain a sufficiently direct, verified match for this question. I have not substituted a plausible-sounding answer for missing evidence.",
 evidenceFindings:[],strategicInterpretation:null,irishMarketImplication:null,counterEvidence:["Evidence coverage is currently insufficient."],
 whatToWatch:["Add or verify primary evidence for this topic before drawing a conclusion."],confidence:evidence.confidence,
 confidenceReason:"No directly relevant approved reference was retrieved.",
 followUpQuestions:["What evidence is available on the nearest related topic?","Which organisations are covered in the current evidence base?"],generatedBy:"fallback",
};}
