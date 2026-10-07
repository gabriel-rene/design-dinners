// NOTE ON FILENAME: the Task 7 brief calls this `middleware.ts`, but Next.js
// 16 deprecated and renamed the `middleware` file convention to `proxy`
// (request/response APIs are unchanged) — see AGENTS.md and
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md.
// `src/lib/supabase/middleware.ts` (Task 3) already anticipated this, noting
// it is "called from the project's root `proxy.ts`". Following the framework
// convention that actually ships in this Next.js version.
//
// This is UX only: it refreshes the Supabase session cookie and bounces an
// unauthenticated visitor away from `/admin/*` before the page even renders.
// It intentionally does NOT check the admin allowlist — that enforcement
// lives exclusively in `requireAdmin()` (src/lib/auth.ts), which every admin
// page and server action calls directly. A matcher change here can silently
// stop covering a route; it must never be the only gate.
//
// It also issues La Vitrina's anonymous papitas cookie (`dd_fan`) on
// `/vitrina` and `/vitrina/*`. That branch returns before any admin logic and
// never calls Supabase. Issuing the cookie here means the fries server action
// never has to set one: a server action that changes cookies makes Next.js
// re-render the current route, which remounted the feed on a visitor's first
// papita. `ensureFanId()` stays in the action as a fallback.
import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";
import { FAN_COOKIE, parseFanId } from "@/lib/vitrina/validate";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Same cookie as `ensureFanId()` in src/lib/vitrina/request.ts. */
function withFanCookie(request: NextRequest): NextResponse {
  if (parseFanId(request.cookies.get(FAN_COOKIE)?.value)) return NextResponse.next();
  const id = crypto.randomUUID();
  // Forward it on the request too, so this first render already reads it.
  request.cookies.set(FAN_COOKIE, id);
  const response = NextResponse.next({ request });
  response.cookies.set(FAN_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ONE_YEAR_SECONDS,
    path: "/",
  });
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/vitrina" || pathname.startsWith("/vitrina/")) {
    return withFanCookie(request);
  }

  const isLoginPage = pathname === "/admin/login";
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (!hasSupabaseConfig) {
    if (isLoginPage) {
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("setup", "supabase");
    return NextResponse.redirect(url);
  }

  const { response, user } = await updateSession(request);

  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // `/auth/callback` (the magic-link landing route) is deliberately outside
  // this matcher — it must be reachable while unauthenticated, and gating it
  // here would break the sign-in redirect loop.
  // `/vitrina` routes only get the papitas cookie (see the branch above).
  matcher: ["/admin/:path*", "/vitrina", "/vitrina/:path*"],
};
