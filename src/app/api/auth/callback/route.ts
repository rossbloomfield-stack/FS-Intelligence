import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isApprovedEmail } from "@/lib/auth/access";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);
    if (!isApprovedEmail(data.user?.email)) {
      await supabase.auth.signOut();
      const denied = new URL("/intelligence/login", url.origin);
      denied.searchParams.set("error", "not-approved");
      return NextResponse.redirect(denied);
    }
  }

  return NextResponse.redirect(new URL("/intelligence", url.origin));
}
