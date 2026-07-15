"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { isValidHttpUrl, uploadImageIfPresent } from "@/lib/admin-helpers";
import type { SocialLink } from "@/lib/types";
import type { FormState } from "@/components/admin/formStyles";

type ParsedSpeaker = {
  name: string;
  role_title: string | null;
  bio: string | null;
  social_links: SocialLink[];
};

/** Zip the repeated social_label/social_url inputs into SocialLink[]. Drops
 *  fully-empty rows; errors when a row has one field but not the other. */
function parseSocialLinks(formData: FormData): { error: string } | { value: SocialLink[] } {
  const labels = formData.getAll("social_label").map((v) => String(v).trim());
  const urls = formData.getAll("social_url").map((v) => String(v).trim());
  const count = Math.max(labels.length, urls.length);

  const links: SocialLink[] = [];
  for (let i = 0; i < count; i++) {
    const label = labels[i] ?? "";
    const url = urls[i] ?? "";

    if (!label && !url) continue; // empty row → skip
    if (!label || !url) {
      return { error: "Cada enlace social necesita etiqueta y URL." };
    }
    if (!isValidHttpUrl(url)) {
      return { error: `El enlace "${label}" debe ser una URL http(s) válida.` };
    }
    links.push({ label, url });
  }

  return { value: links };
}

function parseSpeaker(formData: FormData): { error: string } | { value: ParsedSpeaker } {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "El nombre es obligatorio." };
  }

  const social = parseSocialLinks(formData);
  if ("error" in social) return social;

  const roleTitle = String(formData.get("role_title") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  return {
    value: {
      name,
      role_title: roleTitle || null,
      bio: bio || null,
      social_links: social.value,
    },
  };
}

export async function createSpeaker(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();

  const parsed = parseSpeaker(formData);
  if ("error" in parsed) return parsed;

  const image = await uploadImageIfPresent(supabase, formData, "photo", "speakers", null);
  if ("error" in image) return image;

  const { error } = await supabase
    .from("speakers")
    .insert({ ...parsed.value, photo_url: image.url });

  if (error) {
    return { error: "No pudimos guardar el speaker. Intenta de nuevo." };
  }

  revalidatePath("/");
  revalidatePath("/admin/speakers");
  redirect("/admin/speakers");
}

export async function updateSpeaker(
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();

  const parsed = parseSpeaker(formData);
  if ("error" in parsed) return parsed;

  const { data: current } = await supabase
    .from("speakers")
    .select("photo_url")
    .eq("id", id)
    .maybeSingle();

  const image = await uploadImageIfPresent(
    supabase,
    formData,
    "photo",
    "speakers",
    current?.photo_url ?? null,
  );
  if ("error" in image) return image;

  const { error } = await supabase
    .from("speakers")
    .update({ ...parsed.value, photo_url: image.url })
    .eq("id", id);

  if (error) {
    return { error: "No pudimos guardar los cambios. Intenta de nuevo." };
  }

  revalidatePath("/");
  revalidatePath("/admin/speakers");
  redirect("/admin/speakers");
}

// `(id)` only; bound via `.bind(null, id)` for DeleteButton's useActionState.
export async function deleteSpeaker(id: string): Promise<FormState> {
  const { supabase } = await requireAdmin();

  // Cascade on event_speakers only unlinks; events themselves are untouched.
  const { error } = await supabase.from("speakers").delete().eq("id", id);
  if (error) {
    return { error: "No pudimos eliminar el speaker. Intenta de nuevo." };
  }

  revalidatePath("/");
  revalidatePath("/admin/speakers");
  redirect("/admin/speakers");
}
