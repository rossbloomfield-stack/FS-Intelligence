import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function authenticateAdminRequest() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;
  if (user.app_metadata.role === "admin") return { db, user };
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return profile?.role === "admin" ? { db, user } : null;
}
