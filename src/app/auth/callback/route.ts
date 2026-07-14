// Magic-link landing route. Supabase's local (and hosted) email templates can
// deliver either a PKCE `?code=` link or a `?token_hash=&type=` link
// depending on the client's configured auth flow; this handler supports both
// so it isn't coupled to which one a given Supabase project emits.
//
// Deliberately outside the `/admin/:path*` proxy matcher (src/proxy.ts) —
// it must be reachable without a session, since this is exactly how a
// session gets created.
import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/admin";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/admin/login?error=link`);
}
