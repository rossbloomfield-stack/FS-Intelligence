import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isApprovedEmail } from "@/lib/auth/access";

const DEFAULT_DESTINATION = "/intelligence";

function safeDestination(value: string | null) {
  if (!value) return DEFAULT_DESTINATION;

  try {
    const base = "https://market-intelligence.invalid";
    const destination = new URL(value, base);
    const isIntelligenceRoute =
      destination.pathname === DEFAULT_DESTINATION ||
      destination.pathname.startsWith(`${DEFAULT_DESTINATION}/`);

    if (
      destination.origin !== base ||
      !isIntelligenceRoute ||
      destination.pathname === "/intelligence/login"
    ) {
      return DEFAULT_DESTINATION;
    }

    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return DEFAULT_DESTINATION;
  }
}

function loginRedirect(url: URL, error: "invalid-or-expired" | "missing-session" | "not-approved", next: string) {
  const login = new URL("/intelligence/login", url.origin);
  login.searchParams.set("error", error);
  login.searchParams.set("next", next);
  return NextResponse.redirect(login);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeDestination(url.searchParams.get("next"));
  const supabase = await createClient();
  let email: string | undefined;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) {
      return loginRedirect(url, "invalid-or-expired", next);
    }

    email = data.user.email;
  } else {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return loginRedirect(url, "missing-session", next);
    }

    email = data.user.email;
  }

  if (!isApprovedEmail(email)) {
    await supabase.auth.signOut();
    return loginRedirect(url, "not-approved", next);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
