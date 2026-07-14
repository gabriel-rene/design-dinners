"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

// Shared by /admin (authenticated + allowlisted) and /admin/no-autorizado
// (authenticated but not allowlisted) — both need a way out of the session.
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
