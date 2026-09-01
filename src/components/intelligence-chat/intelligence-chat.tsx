"use client";
import { FormEvent,useCallback,useMemo,useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowRight,FileText,LockKeyhole,Send,Square } from "lucide-react";
import { Conversation } from "@/components/ai-elements/conversation";
import { Message } from "@/components/ai-elements/message";
import { EvidencePanel } from "@/components/intelligence-chat/evidence-panel";
import type { EvidencePackage,IntelligenceUIMessage } from "@/lib/intelligence/evidence";

const prompts=["What matters most this week?","What has changed in the last 30 days?","Where is AI investment accelerating?","What should an Irish financial-services CEO watch?"];
const chatTransport=new DefaultChatTransport({api:"/api/intelligence/chat"});
export function IntelligenceChat({conversationId,initialHistory=[]}:{conversationId:string;initialHistory?:{id:string;title:string;updated_at:string}[]}){
 const [input,setInput]=useState("");const [evidenceOpen,setEvidenceOpen]=useState(false);
 const {messages,sendMessage,status,stop,error}=useChat<IntelligenceUIMessage>({id:conversationId,transport:chatTransport});
 const busy=status==="submitted"||status==="streaming";
 const evidence=useMemo(()=>{for(let index=messages.length-1;index>=0;index--){const part=messages[index].parts.find(item=>item.type==="data-evidence");if(part)return part.data}return null as EvidencePackage|null},[messages]);
 const closeEvidence=useCallback(()=>setEvidenceOpen(false),[]);
 async function ask(text:string){const value=text.trim();if(!value||busy)return;setInput("");setEvidenceOpen(false);await sendMessage({text:value});}
 function submit(e:FormEvent){e.preventDefault();void ask(input);}
 return <div className="conversation-workspace"><aside className="conversation-history"><p className="chat-brand">Irish Life<span>Market Intelligence</span></p><button className="new-conversation" onClick={()=>location.reload()}>＋ New conversation</button><h2>Conversations</h2>{initialHistory.length?<ol>{initialHistory.map(item=><li key={item.id}>{item.title}</li>)}</ol>:<p className="empty-history">Your approved conversations will appear here.</p>}</aside><section className="conversation-main">{messages.length===0?<div className="conversation-empty"><p className="eyebrow">MARKET INTELLIGENCE</p><h1>What would you like to understand about the market?</h1><p>Ask across verified hard and soft signals, competitor developments and external intelligence.</p><div className="prompt-grid">{prompts.map(prompt=><button key={prompt} onClick={()=>void ask(prompt)}>{prompt}<ArrowRight size={18}/></button>)}</div></div>:<><Conversation className="message-list">{messages.map(message=><Message key={message.id} message={message}/>)}</Conversation><button className="view-evidence" onClick={()=>setEvidenceOpen(true)}><FileText size={18}/> View evidence</button></>}<form className="conversation-composer" onSubmit={submit}><label className="sr-only" htmlFor="intelligence-question">Ask a question</label><textarea id="intelligence-question" maxLength={4000} rows={3} value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask a question about the market, competitors, regulation, or emerging risks…"/><div><span>{input.length} / 4000</span>{busy?<button type="button" aria-label="Stop generating" onClick={stop}><Square size={18}/></button>:<button type="submit" aria-label="Send question" disabled={!input.trim()}><Send size={19}/></button>}</div></form>{error&&<p role="alert" className="chat-error">The request could not be completed. Please try again.</p>}<p className="grounded-note"><LockKeyhole size={14}/> Answers are grounded in approved market evidence.</p></section><aside className="conversation-context"><EvidencePanel evidence={evidence} open onClose={()=>{}}/></aside><EvidencePanel mobile evidence={evidence} open={evidenceOpen} onClose={closeEvidence}/></div>;
}
