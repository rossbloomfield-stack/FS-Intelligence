"use client";
import { FormEvent,KeyboardEvent,useCallback,useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowRight,LockKeyhole,Plus,Send,Square } from "lucide-react";
import { Conversation } from "@/components/ai-elements/conversation";
import { Message } from "@/components/ai-elements/message";
import { EvidencePanel } from "@/components/intelligence-chat/evidence-panel";
import type { EvidencePackage,IntelligenceUIMessage } from "@/lib/intelligence/evidence";

const prompts=[
 {label:"CEO brief",question:"What are the three developments Irish financial-services CEOs should care about most right now?"},
 {label:"Competitive momentum",question:"Which competitors are gaining strategic momentum, and why?"},
 {label:"AI and transformation",question:"What are Irish financial-services firms doing with AI in production?"},
 {label:"Market change",question:"What has materially changed in Irish financial services in the last 30 days?"},
 {label:"Regulation",question:"Which regulatory developments should a CEO care about this quarter?"},
 {label:"Forward view",question:"What could disrupt the Irish financial-services market over the next three years?"},
];

const chatTransport=new DefaultChatTransport({api:"/api/intelligence/chat"});

export function IntelligenceChat({conversationId}:{conversationId:string}){
 const [input,setInput]=useState("");
 const [evidenceOpen,setEvidenceOpen]=useState(false);
 const [selectedReferenceId,setSelectedReferenceId]=useState<string>();
 const {messages,sendMessage,status,stop,error}=useChat<IntelligenceUIMessage>({id:conversationId,transport:chatTransport});
 const busy=status==="submitted"||status==="streaming";
 const evidence=latestEvidence(messages);
 const hasConversation=messages.length>0;

 const closeEvidence=useCallback(()=>{setEvidenceOpen(false);setSelectedReferenceId(undefined)},[]);
 const openEvidence=useCallback((referenceId?:string)=>{setSelectedReferenceId(referenceId);setEvidenceOpen(true)},[]);

 async function ask(text:string){const value=text.trim();if(!value||busy)return;setInput("");closeEvidence();await sendMessage({text:value});}
 function submit(event:FormEvent){event.preventDefault();void ask(input);}
 function composerKeyDown(event:KeyboardEvent<HTMLTextAreaElement>){if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();void ask(input)}}
 function retry(){const lastQuestion=[...messages].reverse().find(message=>message.role==="user");if(lastQuestion)void ask(lastQuestion.parts.filter(part=>part.type==="text").map(part=>part.text).join(""));}

 return <div className={`conversation-workspace${hasConversation?" conversation-active":""}`}>
  <section className="conversation-main" aria-label="Market intelligence conversation">
   {hasConversation&&<div className="conversation-toolbar"><span>Market intelligence</span><button type="button" onClick={()=>location.reload()}><Plus size={16}/> New conversation</button></div>}
   {!hasConversation?<><EmptyState/><ComposerDock input={input} setInput={setInput} busy={busy} hasConversation={false} onSubmit={submit} onKeyDown={composerKeyDown} onStop={stop}/><PromptSuggestions onAsk={ask}/></>:<Conversation className="message-list" aria-busy={busy}>{messages.map(message=><Message key={message.id} message={message} onEvidence={openEvidence} onAsk={ask}/>)}</Conversation>}
   {error&&<div role="alert" className="chat-error"><strong>The analysis could not be completed.</strong><span>Your question is still here. Try again, or ask it in a different way.</span><button type="button" onClick={retry}>Try again</button></div>}
   {hasConversation&&<ComposerDock input={input} setInput={setInput} busy={busy} hasConversation onSubmit={submit} onKeyDown={composerKeyDown} onStop={stop}/>}
  </section>
  <EvidencePanel mobile evidence={evidence} open={evidenceOpen} selectedReferenceId={selectedReferenceId} onClose={closeEvidence}/>
 </div>;
}

function EmptyState(){return <div className="conversation-empty"><p className="eyebrow">IRISH FINANCIAL SERVICES</p><h1>What do you want to know about the market?</h1><p>Ask for a conclusion, comparison or strategic implication. The answer will distinguish evidence from interpretation and link back to its sources.</p></div>}

function PromptSuggestions({onAsk}:{onAsk:(question:string)=>Promise<void>}){return <section className="prompt-suggestions" aria-labelledby="suggested-questions"><div className="prompt-heading"><span id="suggested-questions">Suggested questions</span><small>Choose one to begin</small></div><div className="prompt-grid">{prompts.map(prompt=><button type="button" key={prompt.question} onClick={()=>void onAsk(prompt.question)}><span><small>{prompt.label}</small>{prompt.question}</span><ArrowRight size={18}/></button>)}</div></section>}

function ComposerDock({input,setInput,busy,hasConversation,onSubmit,onKeyDown,onStop}:{input:string;setInput:(value:string)=>void;busy:boolean;hasConversation:boolean;onSubmit:(event:FormEvent)=>void;onKeyDown:(event:KeyboardEvent<HTMLTextAreaElement>)=>void;onStop:()=>void}){return <div className="composer-dock"><form className="conversation-composer" onSubmit={onSubmit}><label className="sr-only" htmlFor="intelligence-question">Ask Market Intelligence</label><textarea id="intelligence-question" maxLength={4000} rows={2} value={input} onChange={event=>setInput(event.target.value)} onKeyDown={onKeyDown} placeholder={hasConversation?"Ask a follow-up question…":"Ask about a company, competitor, product, regulation or market change…"}/><div><span>{input.length>0?`${input.length} / 4000`:"Enter to send · Shift + Enter for a new line"}</span>{busy?<button type="button" aria-label="Stop generating" onClick={onStop}><Square size={17}/></button>:<button type="submit" aria-label="Send question" disabled={!input.trim()}><Send size={18}/></button>}</div></form><p className="grounded-note"><LockKeyhole size={14}/> Answers use approved market evidence and show their sources.</p></div>}

function latestEvidence(messages:IntelligenceUIMessage[]){for(let index=messages.length-1;index>=0;index--){const part=messages[index].parts.find(item=>item.type==="data-evidence");if(part)return part.data}return null as EvidencePackage|null}
