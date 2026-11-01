"use server";

import { headers } from "next/headers";

import { JOIN_RATE_LIMIT_PER_HOUR } from "@/lib/community";
import { insertMember } from "@/lib/community-db";
import { dbErrorSummary, getDb, hasDatabaseConfig } from "@/lib/db";
import { parseDisciplineInput, type DisciplineErrors } from "@/lib/disciplines";
import { clientIpFrom, hashIp, warnIfRateLimitDisabled } from "@/lib/ip-hash";
import { isHoneypotFilled, parseRsvpInput, type RsvpFieldErrors } from "@/lib/rsvp";
import { rememberJoined, whatsappGroupUrl } from "@/lib/whatsapp";

export type JoinValues = { name: string; email: string; discipline: string; disciplineOther: string };
export type JoinFieldErrors = RsvpFieldErrors & DisciplineErrors;

export type JoinState =
  | { status: "idle" }
  | { status: "error"; message?: string; errors?: JoinFieldErrors; values: JoinValues }
  | { status: "joined"; url: string | null };

export async function joinCommunity(_prev: JoinState, formData: FormData): Promise<JoinState> {
  // Bots fill the hidden field: pretend it worked, store nothing.
  if (isHoneypotFilled(formData.get("website"))) return { status: "joined", url: whatsappGroupUrl() };

  const values: JoinValues = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    discipline: String(formData.get("discipline") ?? ""),
    disciplineOther: String(formData.get("discipline_other") ?? ""),
  };
  const person = parseRsvpInput(values);
  const discipline = parseDisciplineInput(values);
  if (!person.ok || !discipline.ok) {
    return {
      status: "error",
      errors: { ...(person.ok ? {} : person.errors), ...(discipline.ok ? {} : discipline.errors) },
      values,
    };
  }

  const ip = clientIpFrom((await headers()).get("x-forwarded-for"));
  warnIfRateLimitDisabled(process.env.RSVP_IP_SALT);
  const ipHash = hashIp(ip, process.env.RSVP_IP_SALT);

  // Soft gate: nothing below may keep a real person out of the group. The
  // per-IP limit only decides what gets stored (a whole dinner shares the
  // venue's Wi-Fi IP), and a DB hiccup is logged, never shown.
  if (hasDatabaseConfig) {
    try {
      // Stores nothing for a repeat email or past the per-IP limit; the
      // visitor gets the same answer either way.
      await insertMember(
        getDb(),
        {
          name: person.name,
          email: person.email,
          discipline: discipline.discipline,
          disciplineOther: discipline.disciplineOther,
          ipHash,
        },
        JOIN_RATE_LIMIT_PER_HOUR,
      );
    } catch (error) {
      // Code and message only: a Postgres error's detail can echo the row.
      console.error("joinCommunity failed", dbErrorSummary(error));
    }
  }

  await rememberJoined();
  return { status: "joined", url: whatsappGroupUrl() };
}
