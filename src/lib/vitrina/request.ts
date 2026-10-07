// Server-only request helpers for La Vitrina actions and pages.
import "server-only";

import { cookies, headers } from "next/headers";

import { clientIpFrom, hashIp, warnIfRateLimitDisabled } from "@/lib/ip-hash";

import { FAN_COOKIE, parseFanId } from "./validate";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function readFanId(): Promise<string | null> {
  return parseFanId((await cookies()).get(FAN_COOKIE)?.value);
}

/** Server actions only: it may set the cookie. Anonymous, one per browser. */
export async function ensureFanId(): Promise<string> {
  const store = await cookies();
  const existing = parseFanId(store.get(FAN_COOKIE)?.value);
  if (existing) return existing;
  const id = crypto.randomUUID();
  store.set(FAN_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ONE_YEAR_SECONDS,
    path: "/",
  });
  return id;
}

/** Salted hash of the visitor's IP, or null in dev / without RSVP_IP_SALT (no rate limit). */
export async function requestIpHash(): Promise<string | null> {
  const ip = clientIpFrom((await headers()).get("x-forwarded-for"));
  warnIfRateLimitDisabled(process.env.RSVP_IP_SALT);
  return hashIp(ip, process.env.RSVP_IP_SALT);
}
