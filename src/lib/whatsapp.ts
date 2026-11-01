// Server-only: the WhatsApp invite link and the "already signed up" cookie.
// Client code must never read NEXT_PUBLIC_WHATSAPP_URL, or Next inlines the
// link into the browser bundle and anyone can copy it past the form.
import "server-only";

import { cookies } from "next/headers";

import { JOINED_COOKIE, JOINED_COOKIE_MAX_AGE } from "./community";

export function whatsappGroupUrl(): string | null {
  return process.env.NEXT_PUBLIC_WHATSAPP_URL || null;
}

/** Only callable from a server action or route handler. */
export async function rememberJoined(): Promise<void> {
  (await cookies()).set(JOINED_COOKIE, "1", {
    maxAge: JOINED_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function hasJoined(): Promise<boolean> {
  return (await cookies()).get(JOINED_COOKIE)?.value === "1";
}
