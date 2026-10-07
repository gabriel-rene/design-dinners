import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

export const hasLocalSupabase =
  /^http:\/\/(127\.0\.0\.1|localhost):54321\/?$/.test(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "") &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

// Only call this from inside a test or hook: without the env it must not
// crash at import time, so the spec can skip cleanly.
function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "http://skipped.invalid",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "skipped",
    { auth: { persistSession: false } },
  );
}

export const FIXTURE_IMAGE = "public/brand/mesa-comunidad.jpg";

/** Inserts a published piece straight into Supabase and returns its id. */
export async function createPublishedWork(title: string, publishedAt: Date): Promise<string> {
  const db = service();
  const path = `${randomUUID()}.jpg`;
  const { error: uploadError } = await db.storage
    .from("vitrina")
    .upload(path, readFileSync(FIXTURE_IMAGE), { contentType: "image/jpeg" });
  if (uploadError) throw uploadError;
  const { data, error } = await db
    .from("vitrina_works")
    .insert({
      status: "published",
      published_at: publishedAt.toISOString(),
      title,
      creator_name: "E2E Prueba",
      creator_email: "e2e@ejemplo.com",
      creator_role: "Diseño",
      link_website: "https://ejemplo.com/",
      image_path: path,
      image_width: 1200,
      image_height: 1500,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function findWorkId(title: string): Promise<string | null> {
  const { data } = await service().from("vitrina_works").select("id").eq("title", title).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/** Deletes every piece whose title contains `stamp`, with its image. */
export async function cleanupWorks(stamp: string): Promise<void> {
  const db = service();
  const { data } = await db.from("vitrina_works").select("id,image_path").like("title", `%${stamp}%`);
  for (const row of data ?? []) {
    await db.storage.from("vitrina-pending").remove([row.image_path]);
    await db.storage.from("vitrina").remove([row.image_path]);
    await db.from("vitrina_uploads").delete().eq("path", row.image_path);
  }
  await db.from("vitrina_works").delete().like("title", `%${stamp}%`);
}
