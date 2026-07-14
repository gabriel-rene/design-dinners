// Server-only: this module creates a cookie-bound Supabase client (see
// `./supabase/server`). Import it only from Server Components, Server
// Actions, or Route Handlers.
//
// `requireAdmin` is the single source of truth for admin authorization.
// `proxy.ts` also redirects unauthenticated visitors away from `/admin/*`,
// but that is UX only (avoids a flash of protected content / an extra
// round-trip); it must never be treated as the enforcement boundary since a
// matcher change could silently stop covering a route. Every admin page and
// every admin server action must call this function directly.
import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export async function requireAdmin(): Promise<{
  supabase: SupabaseClient;
  user: User;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  // `is_admin()` is a security-definer SQL function (see
  // supabase/migrations/20260714000000_init.sql) that checks the caller's
  // JWT email against `public.admins`. The `admins` table itself has RLS
  // enabled with no select policy, so it cannot be queried directly here.
  const { data: isAdmin } = await supabase.rpc("is_admin");

  if (!isAdmin) {
    redirect("/admin/no-autorizado");
  }

  return { supabase, user };
}
