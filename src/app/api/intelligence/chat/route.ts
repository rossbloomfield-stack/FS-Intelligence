import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";
import { createClient } from "@/lib/supabase/server";
import { isApprovedEmail } from "@/lib/auth/access";
import { answerForEvidenceCount } from "@/lib/intelligence/evidence-readiness";
import { makeEvidencePackage,rankEvidence,validateEvidence,type IntelligenceUIMessage } from "@/lib/intelligence/evidence";

export const maxDuration=30;
function messageText(message:UIMessage|undefined){return message?.parts.filter((p):p is Extract<typeof p,{type:"text"}>=>p.type==="text").map(p=>p.text).join("").trim()??"";}
export async function POST(request:Request){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user||!isApprovedEmail(user.email))return Response.json({error:"Unauthorized"},{status:401});
 const body=await request.json() as {id?:string;messages?:IntelligenceUIMessage[]};
 const question=messageText(body.messages?.at(-1));
 if(!question||question.length>4000)return Response.json({error:"A valid question is required"},{status:400});
 const {data:sourceRows}=await supabase.from("sources").select("id,title,publisher,url,publication_date,source_type,primary_source,credibility_tier,evidence_classification,notes").eq("approved_public",true).limit(25);
 const references=validateEvidence(rankEvidence(sourceRows??[]));
 const evidence=makeEvidencePackage(references);
 const answer=answerForEvidenceCount(references.length);
 const title=question.length>72?`${question.slice(0,69)}…`:question;
 const conversationId=body.id??crypto.randomUUID();
 await supabase.from("conversations").upsert({id:conversationId,user_id:user.id,title,status:"active",context:{},updated_at:new Date().toISOString()},{onConflict:"id"});
 await supabase.from("conversation_messages").insert({conversation_id:conversationId,user_id:user.id,role:"user",content:{text:question}});
 const stream=createUIMessageStream<IntelligenceUIMessage>({originalMessages:body.messages,execute:({writer})=>{writer.write({type:"data-evidence",id:"answer-evidence",data:evidence});writer.write({type:"text-start",id:"answer"});writer.write({type:"text-delta",id:"answer",delta:answer});writer.write({type:"text-end",id:"answer"});},onEnd:async({responseMessage})=>{const {data:stored}=await supabase.from("conversation_messages").insert({conversation_id:conversationId,user_id:user.id,role:"assistant",content:responseMessage,confidence:evidence.confidence,freshness:evidence.freshness}).select("id").single();if(stored&&references.length)await supabase.from("conversation_references").insert(references.map(item=>({conversation_id:conversationId,message_id:stored.id,source_id:item.sourceId,reference_snapshot:item,rank:item.rank,support_strength:item.supportStrength==="supporting"?"direct":item.supportStrength==="counter"?"corroborating":"contextual"})));}});
 return createUIMessageStreamResponse({stream,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
}
