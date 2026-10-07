"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

import type { FormState } from "@/components/admin/formStyles";
import { requireAdmin } from "@/lib/auth";
import { isUuid } from "@/lib/rsvp";
import { getServiceClient } from "@/lib/supabase/service";
import { approveWork, deleteWork, hideWork, rejectWork } from "@/lib/vitrina/db";

type Transition = (db: SupabaseClient, id: string) => Promise<boolean>;

async function apply(id: string, transition: Transition): Promise<FormState> {
  await requireAdmin();
  if (!isUuid(id)) return { error: "No encontramos esa obra." };
  try {
    if (!(await transition(getServiceClient(), id))) {
      return { error: "Esa obra ya cambió. Recarga la página." };
    }
  } catch (error) {
    console.error("vitrina admin action failed", error);
    return { error: "No pudimos guardar el cambio. Intenta de nuevo." };
  }
  revalidatePath("/admin/vitrina");
  revalidatePath("/admin", "layout");
  revalidatePath("/vitrina", "layout");
  return {};
}

// useActionState passes (state, formData) after the bound id; they are unused here.
/* eslint-disable @typescript-eslint/no-unused-vars */
export async function approveWorkAction(id: string, _state: FormState, _formData: FormData) {
  return apply(id, approveWork);
}
export async function rejectWorkAction(id: string, _state: FormState, _formData: FormData) {
  return apply(id, rejectWork);
}
export async function hideWorkAction(id: string, _state: FormState, _formData: FormData) {
  return apply(id, hideWork);
}
export async function deleteWorkAction(id: string, _state: FormState, _formData: FormData) {
  return apply(id, deleteWork);
}
