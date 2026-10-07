"use server";

import { revalidatePath } from "next/cache";

import { isHoneypotFilled } from "@/lib/rsvp";
import { getServiceClient, hasServiceConfig } from "@/lib/supabase/service";
import {
  countRecentSubmissions,
  countRecentUploads,
  createUploadTicket,
  insertWork,
  isRecordedUpload,
  pendingObjectInfo,
} from "@/lib/vitrina/db";
import { logSafe } from "@/lib/vitrina/log";
import { requestIpHash } from "@/lib/vitrina/request";
import {
  IMAGE_EXT,
  MAX_IMAGE_BYTES,
  SUBMISSIONS_PER_DAY,
  UPLOADS_PER_DAY,
  checkImageFile,
  isImageMime,
  parseWorkInput,
  workRawFromFormData,
  type WorkFieldErrors,
} from "@/lib/vitrina/validate";

export type StartUploadResult = { ok: true; path: string; token: string } | { ok: false; message: string };

export type SubmitState =
  | { status: "idle" }
  | { status: "error"; message?: string; errors?: WorkFieldErrors }
  | { status: "received" };

const UNAVAILABLE = "La Vitrina no está disponible ahora mismo. Intenta más tarde.";

/** Step 1 of 2: hand the browser a one-time signed URL for the private bucket. */
export async function startVitrinaUpload(mime: string, size: number): Promise<StartUploadResult> {
  const fileError = checkImageFile({ type: String(mime), size: Number(size) });
  if (fileError || !isImageMime(mime)) return { ok: false, message: fileError ?? "Elige una imagen." };
  if (!hasServiceConfig) return { ok: false, message: UNAVAILABLE };

  const db = getServiceClient();
  const ipHash = await requestIpHash();
  try {
    if (ipHash && (await countRecentUploads(db, ipHash)) >= UPLOADS_PER_DAY) {
      return { ok: false, message: "Subiste muchas imágenes hoy. Intenta mañana." };
    }
    const path = `${crypto.randomUUID()}.${IMAGE_EXT[mime]}`;
    const { token } = await createUploadTicket(db, path, ipHash);
    return { ok: true, path, token };
  } catch (error) {
    logSafe("startVitrinaUpload failed", error);
    return { ok: false, message: "No pudimos preparar la subida. Intenta de nuevo." };
  }
}

/** Step 2 of 2: validate everything again and save the piece as pending. */
export async function submitVitrinaWork(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  // Bots fill the hidden field: pretend it worked, store nothing.
  if (isHoneypotFilled(formData.get("empresa"))) return { status: "received" };

  const parsed = parseWorkInput(workRawFromFormData(formData));
  if (!parsed.ok) return { status: "error", errors: parsed.errors };
  if (!hasServiceConfig) return { status: "error", message: UNAVAILABLE };

  const db = getServiceClient();
  const ipHash = await requestIpHash();
  const reupload: SubmitState = { status: "error", errors: { image: "Vuelve a subir la imagen." } };
  try {
    if (ipHash && (await countRecentSubmissions(db, ipHash)) >= SUBMISSIONS_PER_DAY) {
      return { status: "error", message: "Ya enviaste 3 obras hoy. Intenta mañana." };
    }
    const path = parsed.value.imagePath;
    if (!(await isRecordedUpload(db, path))) return reupload;
    const info = await pendingObjectInfo(db, path);
    if (!info || info.size <= 0 || info.size > MAX_IMAGE_BYTES || !isImageMime(info.mimetype)) return reupload;

    await insertWork(db, parsed.value, ipHash);
  } catch (error) {
    // Unique image_path: this upload was already used by another submission.
    if ((error as { code?: string }).code === "23505") return reupload;
    // Code + message only: never the visitor's name, email, or the failing row.
    logSafe("submitVitrinaWork failed", error);
    return { status: "error", message: "No pudimos enviar tu obra. Intenta de nuevo." };
  }

  revalidatePath("/admin/vitrina");
  revalidatePath("/admin", "layout");
  return { status: "received" };
}
