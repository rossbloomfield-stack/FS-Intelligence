import type { Metadata } from "next";
import { IntelligenceChat } from "@/components/intelligence-chat/intelligence-chat";
import { requireUser } from "@/lib/supabase/auth";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:{absolute:"Market Intelligence | Irish Life"},description:"Evidence-linked conversational intelligence for Irish financial services.",robots:{index:false,follow:false}};
export default async function Page(){await requireUser();return <IntelligenceChat conversationId={crypto.randomUUID()}/>;}
