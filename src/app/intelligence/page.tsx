import type { Metadata } from "next";
import { IntelligenceChat } from "@/components/intelligence-chat/intelligence-chat";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { getSignalIntelligenceConfig } from "@/lib/intelligence/signals/config";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:{absolute:"Market Intelligence | Irish Life"},description:"Evidence-linked conversational intelligence for Irish financial services.",robots:{index:false,follow:false}};
export default async function Page(){await requireUser();const db=await createClient();const config=getSignalIntelligenceConfig();const signals=config.intelligenceFeedEnabled?await db.from("intelligence_signals").select("id,title,summary,confidence_score,signal_score,independent_source_count,corroboration_count,intelligence_signal_observations!inner(observation_id)").eq("approved",true).in("status",["emerging","active","confirmed","mature","contradicted"]).order("signal_score",{ascending:false}).limit(3):{data:[]};return <IntelligenceChat conversationId={crypto.randomUUID()} noteworthySignals={(signals.data??[]).map(signal=>({id:signal.id,title:signal.title,summary:signal.summary,confidenceScore:Number(signal.confidence_score??0),signalScore:Number(signal.signal_score??0),independentSourceCount:signal.independent_source_count,observationCount:signal.corroboration_count+1}))}/>;}
