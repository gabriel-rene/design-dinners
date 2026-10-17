"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

import type { FormState } from "@/components/admin/formStyles";
import { requireAdmin } from "@/lib/auth";
import {
  approveCommunityEvent,
  deleteCommunityEvent,
  hideCommunityEvent,
  rejectCommunityEvent,
} from "@/lib/otros-eventos/db";
import { notifyEventApproved } from "@/lib/otros-eventos/notify";
import { isUuid } from "@/lib/rsvp";
import { getServiceClient } from "@/lib/supabase/service";
import { logSafe } from "@/lib/vitrina/log";

type Transition = (db: SupabaseClient, id: string) => Promise<boolean>;

function revalidateAll() {
  revalidatePath("/admin/otros-eventos");
  revalidatePath("/admin", "layout");
  revalidatePath("/eventos");
  revalidatePath("/"); // the landing shows upcoming community events
}

async function apply(id: string, transition: Transition): Promise<FormState> {
  await requireAdmin();
  if (!isUuid(id)) return { error: "No encontramos ese evento." };
  try {
    if (!(await transition(getServiceClient(), id))) {
      return { error: "Ese evento ya cambió. Recarga la página." };
    }
  } catch (error) {
    logSafe("otros-eventos admin action failed", error);
    return { error: "No pudimos guardar el cambio. Intenta de nuevo." };
  }
  revalidateAll();
  return {};
}

// useActionState passes (state, formData) after the bound id; they are unused here.
/* eslint-disable @typescript-eslint/no-unused-vars */
export async function approveEventAction(id: string, _state: FormState, _formData: FormData): Promise<FormState> {
  await requireAdmin();
  if (!isUuid(id)) return { error: "No encontramos ese evento." };
  let approved: Awaited<ReturnType<typeof approveCommunityEvent>>;
  try {
    approved = await approveCommunityEvent(getServiceClient(), id);
  } catch (error) {
    logSafe("otros-eventos approve failed", error);
    return { error: "No pudimos guardar el cambio. Intenta de nuevo." };
  }
  if (!approved) return { error: "Ese evento ya cambió. Recarga la página." };
  const mail = approved.notify;
  if (mail) after(() => notifyEventApproved(mail));
  revalidateAll();
  return {};
}
export async function rejectEventAction(id: string, _state: FormState, _formData: FormData) {
  return apply(id, rejectCommunityEvent);
}
export async function hideEventAction(id: string, _state: FormState, _formData: FormData) {
  return apply(id, hideCommunityEvent);
}
export async function deleteEventAction(id: string, _state: FormState, _formData: FormData) {
  return apply(id, deleteCommunityEvent);
}
