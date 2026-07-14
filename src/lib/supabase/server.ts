// Server-only: import this module only from Server Components, Server Actions,
// or Route Handlers (it depends on `next/headers`, which is unavailable in the
// browser and in Client Components).

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function createClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `setAll` was called from a Server Component, where cookies cannot
            // be written. Safe to ignore as long as middleware refreshes the
            // user session (see supabase/middleware.ts).
          }
        },
      },
    },
  );
}
