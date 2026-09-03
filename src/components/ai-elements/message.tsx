import type { IntelligenceUIMessage } from "@/lib/intelligence/evidence";
import { StructuredAnswer } from "@/components/intelligence-chat/structured-answer";
import { AnalysisAnswer } from "@/components/intelligence-chat/analysis-answer";

export function MessageResponse({children}:{children:React.ReactNode}){return <div className="message-response">{children}</div>}

export function Message({message,onEvidence,onAsk}:{message:IntelligenceUIMessage;onEvidence:(referenceId?:string)=>void;onAsk:(question:string)=>void}) {
  const text = message.parts.filter((part): part is Extract<typeof part,{type:"text"}> => part.type === "text").map((part)=>part.text).join("");
  const evidence=message.parts.find(part=>part.type==="data-evidence")?.data;
  const structured=message.parts.find(part=>part.type==="data-structuredAnswer")?.data;
  const analysis=message.parts.find(part=>part.type==="data-analysis")?.data;
  const researchStatus=message.parts.find(part=>part.type==="data-researchStatus")?.data;
  return <article className={`chat-message chat-message-${message.role}`}>
   {message.role==="user"?<><p className="chat-role">You</p><MessageResponse>{text}</MessageResponse></>:analysis?<AnalysisAnswer analysis={analysis} evidence={evidence??null} onEvidence={onEvidence} onAsk={onAsk}/>:researchStatus?.stage!=="complete"?<p className="research-status" role="status"><span aria-hidden="true"/>{researchStatus?.label??"Reviewing approved market evidence…"}</p>:<MessageResponse>{text}</MessageResponse>}
   {message.role==="assistant"&&analysis&&structured&&<details className="structured-disclosure"><summary>View structured records</summary><StructuredAnswer answer={structured}/></details>}
  </article>;
}
