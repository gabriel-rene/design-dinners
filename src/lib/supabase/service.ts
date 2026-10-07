// Server-only Supabase client with the SERVICE ROLE key. It bypasses RLS, so
// only call it after your own checks: validation + rate limits for public
// actions, requireAdmin() for admin ones. Never import from a client component.
import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const hasServiceConfig = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

let cached: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role is not configured.");
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
