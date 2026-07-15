"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { isValidHttpUrl } from "@/lib/admin-helpers";
import type { FormState } from "@/components/admin/formStyles";

type ParsedResource = {
  title: string;
  description: string | null;
  url: string;
  category: string;
};

function parseResource(formData: FormData): { error: string } | { value: ParsedResource } {
  const title = String(formData.get("title") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();

  if (!title) {
    return { error: "El título es obligatorio." };
  }
  if (!url) {
    return { error: "El enlace es obligatorio." };
  }
  if (!isValidHttpUrl(url)) {
    return { error: "El enlace debe ser una URL http(s) válida." };
  }
  if (!category) {
    return { error: "La categoría es obligatoria." };
  }

  const description = String(formData.get("description") ?? "").trim();

  return {
    value: { title, description: description || null, url, category },
  };
}

export async function createResource(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();

  const parsed = parseResource(formData);
  if ("error" in parsed) return parsed;

  const { error } = await supabase.from("resources").insert(parsed.value);
  if (error) {
    return { error: "No pudimos guardar el recurso. Intenta de nuevo." };
  }

  revalidatePath("/");
  revalidatePath("/admin/recursos");
  redirect("/admin/recursos");
}

export async function updateResource(
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();

  const parsed = parseResource(formData);
  if ("error" in parsed) return parsed;

  const { error } = await supabase.from("resources").update(parsed.value).eq("id", id);
  if (error) {
    return { error: "No pudimos guardar los cambios. Intenta de nuevo." };
  }

  revalidatePath("/");
  revalidatePath("/admin/recursos");
  redirect("/admin/recursos");
}

// `(id)` only; bound via `.bind(null, id)` for DeleteButton's useActionState.
export async function deleteResource(id: string): Promise<FormState> {
  const { supabase } = await requireAdmin();

  const { error } = await supabase.from("resources").delete().eq("id", id);
  if (error) {
    return { error: "No pudimos eliminar el recurso. Intenta de nuevo." };
  }

  revalidatePath("/");
  revalidatePath("/admin/recursos");
  redirect("/admin/recursos");
}
