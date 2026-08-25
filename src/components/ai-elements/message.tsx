import type { UIMessage } from "ai";
export function Message({ message }: { message: UIMessage }) {
  const text = message.parts.filter((part): part is Extract<typeof part,{type:"text"}> => part.type === "text").map((part)=>part.text).join("");
  return <article className={`chat-message chat-message-${message.role}`}><p className="chat-role">{message.role === "user" ? "You" : "Market Intelligence"}</p><div className="message-response">{text}</div></article>;
}
