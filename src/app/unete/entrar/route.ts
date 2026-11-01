import { NextResponse } from "next/server";

import { JOIN_PATH } from "@/lib/community";
import { hasJoined, whatsappGroupUrl } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

/** Signed-up visitors go to the WhatsApp group; everyone else to the form. */
export async function GET(request: Request) {
  const url = whatsappGroupUrl();
  if (url && (await hasJoined())) return NextResponse.redirect(url, 307);
  return NextResponse.redirect(new URL(JOIN_PATH, request.url), 307);
}
