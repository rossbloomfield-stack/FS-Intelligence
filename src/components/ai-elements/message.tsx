import type { IntelligenceUIMessage } from "@/lib/intelligence/evidence";
import { StructuredAnswer } from "@/components/intelligence-chat/structured-answer";
export function Message({ message }: { message: IntelligenceUIMessage }) {
  const text = message.parts.filter((part): part is Extract<typeof part,{type:"text"}> => part.type === "text").map((part)=>part.text).join("");
  const evidence=message.parts.find(part=>part.type==="data-evidence")?.data;
  const structured=message.parts.find(part=>part.type==="data-structuredAnswer")?.data;
  return <article className={`chat-message chat-message-${message.role}`}><p className="chat-role">{message.role === "user" ? "You" : "Market Intelligence"}</p><div className="message-response">{text}</div>{message.role==="assistant"&&structured&&<StructuredAnswer answer={structured}/>} {message.role==="assistant"&&evidence&&<p className="answer-provenance"><strong>{evidence.confidence==="insufficient"?"Insufficient evidence":`${evidence.confidence[0].toUpperCase()+evidence.confidence.slice(1)} confidence`}</strong> · {evidence.references.length} references · {evidence.primaryCount} primary</p>}</article>;
}
