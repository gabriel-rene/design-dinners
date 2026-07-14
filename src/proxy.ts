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
import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/admin/login";

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
  matcher: ["/admin/:path*"],
};
