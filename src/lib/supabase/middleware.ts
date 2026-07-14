// Called from the project's root `proxy.ts` (Next.js 16 renamed Middleware to
// Proxy; the request/response APIs are unchanged) to refresh the Supabase auth
// session on every navigation, per the official @supabase/ssr pattern.

import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(
  request: NextRequest,
): Promise<{ response: NextResponse; user: User | null }> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // Do not run any code between `createServerClient` and `getUser()` — a
  // token refresh completed there would be lost. `getUser()` re-validates the
  // token with Supabase Auth; do not swap in `getSession()`, which trusts the
  // cookie without verification.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
