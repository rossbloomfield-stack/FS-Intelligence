import type { Metadata } from "next";
import { IntelligenceChat } from "@/components/intelligence-chat/intelligence-chat";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:{absolute:"Market Intelligence | Irish Life"},description:"Evidence-linked conversational intelligence for Irish financial services.",robots:{index:false,follow:false}};
export default async function Page(){const user=await requireUser();const supabase=await createClient();const {data}=await supabase.from("conversations").select("id,title,updated_at").eq("user_id",user.id).order("updated_at",{ascending:false}).limit(30);return <IntelligenceChat initialHistory={data??[]}/>;}
