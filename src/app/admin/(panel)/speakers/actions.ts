"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FormState } from "@/components/admin/formStyles";
import { isValidHttpUrl, uploadImageIfPresent } from "@/lib/admin-helpers";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { SocialLink } from "@/lib/types";

type ParsedSpeaker = {
  name: string;
  role_title: string | null;
  bio: string | null;
  social_links: SocialLink[];
  spotlight_label: string | null;
};

function parseSocialLinks(
  formData: FormData,
): { error: string } | { value: SocialLink[] } {
  const labels = formData.getAll("social_label").map((value) => String(value).trim());
  const urls = formData.getAll("social_url").map((value) => String(value).trim());
  const links: SocialLink[] = [];

  for (let index = 0; index < Math.max(labels.length, urls.length); index++) {
    const label = labels[index] ?? "";
    const url = urls[index] ?? "";
    if (!label && !url) continue;
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

function parseSpeaker(
  formData: FormData,
): { error: string } | { value: ParsedSpeaker } {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "El nombre es obligatorio." };

  const socialLinks = parseSocialLinks(formData);
  if ("error" in socialLinks) return socialLinks;

  const roleTitle = String(formData.get("role_title") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const spotlightLabel = String(formData.get("spotlight_label") ?? "").trim();
  if (spotlightLabel.length > 40) {
    return { error: "La etiqueta para destacar tiene un máximo de 40 caracteres." };
  }

  return {
    value: {
      name,
      role_title: roleTitle || null,
      bio: bio || null,
      social_links: socialLinks.value,
      spotlight_label: spotlightLabel || null,
    },
  };
}

function refreshSpeakerPages() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/speakers");
  revalidatePath("/admin/eventos");
}

export async function createSpeaker(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = parseSpeaker(formData);
  if ("error" in parsed) return parsed;

  const image = await uploadImageIfPresent(
    supabase,
    formData,
    "photo",
    "speakers",
    null,
  );
  if ("error" in image) return image;

  const sql = getDb();
  try {
    await sql`
      insert into speakers (name, role_title, bio, photo_url, social_links, spotlight_label)
      values (
        ${parsed.value.name},
        ${parsed.value.role_title},
        ${parsed.value.bio},
        ${image.url},
        ${JSON.stringify(parsed.value.social_links)}::jsonb,
        ${parsed.value.spotlight_label}
      )
    `;
  } catch {
    return { error: "No pudimos guardar el speaker. Intenta de nuevo." };
  }

  refreshSpeakerPages();
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

  const sql = getDb();
  const currentRows = await sql`
    select photo_url from speakers where id = ${id} limit 1
  `;
  const currentUrl =
    (currentRows[0] as { photo_url: string | null } | undefined)?.photo_url ?? null;

  const image = await uploadImageIfPresent(
    supabase,
    formData,
    "photo",
    "speakers",
    currentUrl,
  );
  if ("error" in image) return image;

  try {
    await sql`
      update speakers set
        name = ${parsed.value.name},
        role_title = ${parsed.value.role_title},
        bio = ${parsed.value.bio},
        photo_url = ${image.url},
        social_links = ${JSON.stringify(parsed.value.social_links)}::jsonb,
        spotlight_label = ${parsed.value.spotlight_label}
      where id = ${id}
    `;
  } catch {
    return { error: "No pudimos guardar los cambios. Intenta de nuevo." };
  }

  refreshSpeakerPages();
  redirect("/admin/speakers");
}

export async function deleteSpeaker(id: string): Promise<FormState> {
  await requireAdmin();
  const sql = getDb();

  try {
    await sql`delete from speakers where id = ${id}`;
  } catch {
    return { error: "No pudimos eliminar el speaker. Intenta de nuevo." };
  }

  refreshSpeakerPages();
  redirect("/admin/speakers");
}
