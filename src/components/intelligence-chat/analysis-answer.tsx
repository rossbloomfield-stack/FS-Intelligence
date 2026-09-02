"use client";
import { ArrowRight,FileText } from "lucide-react";
import type { EvidencePackage,IntelligenceAnalysis } from "@/lib/intelligence/evidence";

export function AnalysisAnswer({analysis,evidence,onEvidence,onAsk}:{analysis:IntelligenceAnalysis;evidence:EvidencePackage|null;onEvidence:(referenceId?:string)=>void;onAsk:(question:string)=>void}){
 return <div className="analysis-answer">
  <div className="analysis-lead"><p className="analysis-kicker">HEADLINE FINDING</p><h2>{analysis.headline}</h2><p>{analysis.executiveSummary}</p></div>
  {analysis.evidenceFindings.length>0&&<section className="analysis-section" aria-labelledby="evidence-shows"><h3 id="evidence-shows">What the evidence shows</h3><ol className="analysis-findings">{analysis.evidenceFindings.map((finding,index)=><li key={`${finding.title}-${index}`}><span>{index+1}</span><div><h4>{finding.title}</h4><p>{finding.analysis} <Citations referenceIds={finding.referenceIds} onEvidence={onEvidence}/></p></div></li>)}</ol></section>}
  {analysis.strategicInterpretation&&<section className="analysis-section analysis-interpretation"><p className="analysis-kicker">STRATEGIC INTERPRETATION</p><p>{analysis.strategicInterpretation}</p></section>}
  {analysis.irishMarketImplication&&<section className="analysis-section"><h3>Irish-market implication</h3><p>{analysis.irishMarketImplication}</p></section>}
  {analysis.counterEvidence.length>0&&<section className="analysis-section analysis-counter"><h3>Counter-evidence and limits</h3><ul>{analysis.counterEvidence.map(item=><li key={item}>{item}</li>)}</ul></section>}
  {analysis.whatToWatch.length>0&&<section className="analysis-section"><h3>What to watch</h3><ul>{analysis.whatToWatch.map(item=><li key={item}>{item}</li>)}</ul></section>}
  <button type="button" className="evidence-summary" onClick={()=>onEvidence()} disabled={!evidence?.references.length}><FileText size={18}/><span><strong>{confidenceLabel(analysis.confidence)} evidence</strong><small>{evidence?.references.length??0} references · {evidence?.primaryCount??0} primary</small></span><ArrowRight size={18}/></button>
  <p className="confidence-reason">{analysis.confidenceReason}</p>
  <section className="follow-up-section" aria-labelledby="follow-up-heading"><h3 id="follow-up-heading">Continue the analysis</h3><div>{analysis.followUpQuestions.map(question=><button type="button" key={question} onClick={()=>onAsk(question)}>{question}<ArrowRight size={16}/></button>)}</div></section>
 </div>;
}

function Citations({referenceIds,onEvidence}:{referenceIds:string[];onEvidence:(referenceId?:string)=>void}){return <>{referenceIds.map(id=><button type="button" className="inline-citation" key={id} onClick={()=>onEvidence(id)} aria-label={`Open reference ${referenceNumber(id)}`}>[{referenceNumber(id)}]</button>)}</>}
function referenceNumber(id:string){return id.replace("ref-","")}
function confidenceLabel(value:IntelligenceAnalysis["confidence"]){return value==="insufficient"?"Insufficient":value[0].toUpperCase()+value.slice(1)}
