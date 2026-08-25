import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";
import { createClient } from "@/lib/supabase/server";
import { isApprovedEmail } from "@/lib/auth/access";
import { answerForEvidenceCount } from "@/lib/intelligence/evidence-readiness";

export const maxDuration=30;
function messageText(message:UIMessage|undefined){return message?.parts.filter((p):p is Extract<typeof p,{type:"text"}>=>p.type==="text").map(p=>p.text).join("").trim()??"";}
export async function POST(request:Request){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user||!isApprovedEmail(user.email))return Response.json({error:"Unauthorized"},{status:401});
 const body=await request.json() as {id?:string;messages?:UIMessage[]};
 const question=messageText(body.messages?.at(-1));
 if(!question||question.length>4000)return Response.json({error:"A valid question is required"},{status:400});
 const {count}=await supabase.from("sources").select("id",{count:"exact",head:true}).eq("approved_public",true);
 const answer=answerForEvidenceCount(count??0);
 const title=question.length>72?`${question.slice(0,69)}…`:question;
 const conversationId=body.id??crypto.randomUUID();
 await supabase.from("conversations").upsert({id:conversationId,user_id:user.id,title,status:"active",context:{},updated_at:new Date().toISOString()},{onConflict:"id"});
 await supabase.from("conversation_messages").insert({conversation_id:conversationId,user_id:user.id,role:"user",content:{text:question}});
 const stream=createUIMessageStream({originalMessages:body.messages,execute:({writer})=>{writer.write({type:"text-start",id:"answer"});writer.write({type:"text-delta",id:"answer",delta:answer});writer.write({type:"text-end",id:"answer"});},onEnd:async({responseMessage})=>{await supabase.from("conversation_messages").insert({conversation_id:conversationId,user_id:user.id,role:"assistant",content:responseMessage,confidence:"insufficient",freshness:"persistent_knowledge"});}});
 return createUIMessageStreamResponse({stream,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
}
