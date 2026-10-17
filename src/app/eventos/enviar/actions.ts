"use server";

import { revalidatePath } from "next/cache";

import {
  countRecentEventSubmissions,
  countRecentEventUploads,
  createEventUploadTicket,
  insertCommunityEvent,
  isRecordedEventUpload,
  pendingEventObjectInfo,
} from "@/lib/otros-eventos/db";
import {
  EVENTS_PER_DAY,
  UPLOADS_PER_DAY,
  eventRawFromFormData,
  parseEventInput,
  type EventFieldErrors,
} from "@/lib/otros-eventos/validate";
import { isHoneypotFilled } from "@/lib/rsvp";
import { IMAGE_EXT, MAX_IMAGE_BYTES, checkImageFile, isImageMime } from "@/lib/storage/image-rules";
import { getServiceClient, hasServiceConfig } from "@/lib/supabase/service";
import { logSafe } from "@/lib/vitrina/log";
import { requestIpHash } from "@/lib/vitrina/request";

export type StartUploadResult = { ok: true; path: string; token: string } | { ok: false; message: string };

export type SubmitEventState =
  | { status: "idle" }
  | { status: "error"; message?: string; errors?: EventFieldErrors }
  | { status: "received" };

const UNAVAILABLE = "Otros eventos no está disponible ahora mismo. Intenta más tarde.";

/** Step 1 of 2: hand the browser a one-time signed URL for the private bucket. */
export async function startEventUpload(mime: string, size: number): Promise<StartUploadResult> {
  const fileError = checkImageFile({ type: String(mime), size: Number(size) });
  if (fileError || !isImageMime(mime)) return { ok: false, message: fileError ?? "Elige una imagen." };
  if (!hasServiceConfig) return { ok: false, message: UNAVAILABLE };

  const db = getServiceClient();
  const ipHash = await requestIpHash();
  try {
    if (ipHash && (await countRecentEventUploads(db, ipHash)) >= UPLOADS_PER_DAY) {
      return { ok: false, message: "Subiste muchas imágenes hoy. Intenta mañana." };
    }
    const path = `${crypto.randomUUID()}.${IMAGE_EXT[mime]}`;
    const { token } = await createEventUploadTicket(db, path, ipHash);
    return { ok: true, path, token };
  } catch (error) {
    logSafe("startEventUpload failed", error);
    return { ok: false, message: "No pudimos preparar la subida. Intenta de nuevo." };
  }
}

/** Step 2 of 2: validate everything again and save the event as pending. */
export async function submitCommunityEvent(_prev: SubmitEventState, formData: FormData): Promise<SubmitEventState> {
  // Bots fill the hidden field: pretend it worked, store nothing.
  if (isHoneypotFilled(formData.get("empresa"))) return { status: "received" };

  const parsed = parseEventInput(eventRawFromFormData(formData));
  if (!parsed.ok) return { status: "error", errors: parsed.errors };
  if (!hasServiceConfig) return { status: "error", message: UNAVAILABLE };

  const db = getServiceClient();
  const ipHash = await requestIpHash();
  const reupload: SubmitEventState = { status: "error", errors: { image: "Vuelve a subir la imagen." } };
  try {
    if (ipHash && (await countRecentEventSubmissions(db, ipHash)) >= EVENTS_PER_DAY) {
      return { status: "error", message: "Ya enviaste 3 eventos hoy. Intenta mañana." };
    }
    const path = parsed.value.imagePath;
    if (!(await isRecordedEventUpload(db, path))) return reupload;
    const info = await pendingEventObjectInfo(db, path);
    if (!info || info.size <= 0 || info.size > MAX_IMAGE_BYTES || !isImageMime(info.mimetype)) return reupload;

    await insertCommunityEvent(db, parsed.value, ipHash);
  } catch (error) {
    // Unique image_path: this upload was already used by another submission.
    if ((error as { code?: string }).code === "23505") return reupload;
    // Code + message only: never the sender's email or the failing row.
    logSafe("submitCommunityEvent failed", error);
    return { status: "error", message: "No pudimos enviar tu evento. Intenta de nuevo." };
  }

  revalidatePath("/admin/otros-eventos");
  revalidatePath("/admin", "layout");
  return { status: "received" };
}
