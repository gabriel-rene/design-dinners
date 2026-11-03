"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/components/admin/formStyles";
import { requireAdmin } from "@/lib/auth";
import { setMemberTags } from "@/lib/community-db";
import { dbErrorSummary, getDb } from "@/lib/db";
import { parseTags } from "@/lib/member-tags";
import { isUuid } from "@/lib/rsvp";

export async function saveMemberTags(_state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { error: "No encontramos a esa persona." };
  const tags = parseTags(String(formData.get("tags") ?? ""));
  if ("error" in tags) return tags;
  try {
    if (!(await setMemberTags(getDb(), id, tags.value))) {
      return { error: "Esa persona ya no está en la lista. Recarga la página." };
    }
  } catch (error) {
    console.error("member tags save failed", dbErrorSummary(error));
    return { error: "No pudimos guardar las etiquetas. Intenta de nuevo." };
  }
  revalidatePath("/admin/comunidad");
  return {};
}
