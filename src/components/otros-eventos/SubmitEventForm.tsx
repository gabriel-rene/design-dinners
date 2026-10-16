"use client";

/* eslint-disable @next/next/no-img-element -- local object-URL preview */
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import { startEventUpload, submitCommunityEvent } from "@/app/otros-eventos/enviar/actions";
import { hintClass, inputClass, labelClass, primaryBtn, textareaClass } from "@/components/admin/formStyles";
import {
  LIMITS,
  eventRawFromFormData,
  parseEventFields,
  prToday,
  type EventFieldErrors,
} from "@/lib/otros-eventos/validate";
import { checkImageFile } from "@/lib/storage/image-rules";
import { createClient } from "@/lib/supabase/client";

type Uploaded = { file: File; path: string; width: number; height: number };

async function imageSize(file: File): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}

function ErrorText({ id, text }: { id: string; text?: string }) {
  if (!text) return null;
  return (
    <p id={id} role="alert" className="text-sm font-medium text-dd-red">
      {text}
    </p>
  );
}

const Star = () => <span aria-hidden="true" className="text-dd-red">*</span>;

export default function SubmitEventForm() {
  const [errors, setErrors] = useState<EventFieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [descriptionLength, setDescriptionLength] = useState(0);
  const [isPending, startTransition] = useTransition();
  // Reuse the upload when only text fields change between attempts.
  const uploaded = useRef<Uploaded | null>(null);

  // Set after mount: the page is prerendered, so a build-time `min` would go stale.
  const dateRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (dateRef.current) dateRef.current.min = prToday();
  }, []);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    setFile(next);
    setPreview(next ? URL.createObjectURL(next) : null);
    setErrors((prev) => ({ ...prev, image: next ? (checkImageFile(next) ?? undefined) : undefined }));
  }

  async function ensureUploaded(current: File): Promise<Uploaded | { message: string; field?: "image" }> {
    if (uploaded.current?.file === current) return uploaded.current;
    let size: { width: number; height: number };
    try {
      size = await imageSize(current);
    } catch {
      return { message: "No pudimos leer esa imagen. Prueba con otro archivo.", field: "image" as const };
    }
    const { width, height } = size;
    const ticket = await startEventUpload(current.type, current.size);
    if (!ticket.ok) return { message: ticket.message };
    const { error } = await createClient()
      .storage.from("otros-eventos-pending")
      .uploadToSignedUrl(ticket.path, ticket.token, current, { contentType: current.type });
    if (error) return { message: "No pudimos subir la imagen. Intenta de nuevo." };
    uploaded.current = { file: current, path: ticket.path, width, height };
    return uploaded.current;
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const fields = parseEventFields(eventRawFromFormData(formData));
    const nextErrors: EventFieldErrors = fields.ok ? {} : { ...fields.errors };
    const imageError = file ? checkImageFile(file) : "Elige el afiche del evento.";
    if (imageError) nextErrors.image = imageError;
    setErrors(nextErrors);
    setMessage(null);
    if (Object.keys(nextErrors).length > 0 || !file) return;

    startTransition(async () => {
      try {
        const upload = await ensureUploaded(file);
        if ("message" in upload) {
          if (upload.field === "image") setErrors((prev) => ({ ...prev, image: upload.message }));
          else setMessage(upload.message);
          return;
        }
        // The file already went straight to Storage: never send it through Vercel.
        formData.delete("image");
        formData.set("imagePath", upload.path);
        formData.set("imageWidth", String(upload.width));
        formData.set("imageHeight", String(upload.height));
        const result = await submitCommunityEvent({ status: "idle" }, formData);
        if (result.status === "received") {
          setDone(true);
          return;
        }
        if (result.status === "error") {
          setErrors(result.errors ?? {});
          setMessage(result.message ?? null);
          if (result.errors?.image) uploaded.current = null;
        }
      } catch {
        setMessage("Algo falló. Revisa tu conexión e intenta de nuevo.");
      }
    });
  }

  if (done) {
    return (
      <section role="status" className="rounded-2xl border-2 border-dd-black bg-white p-8 text-center">
        <h2 className="font-display text-3xl font-bold uppercase text-dd-red">¡Gracias!</h2>
        <p className="mt-3 text-[15px] text-dd-black/80">
          Revisamos cada evento antes de publicarlo. Te escribimos cuando esté en la página.
        </p>
        <Link href="/otros-eventos" className={`${primaryBtn} mt-6`}>
          Ver Otros eventos
        </Link>
      </section>
    );
  }

  const describedBy = (id: string, hint?: boolean) =>
    [hint ? `${id}-hint` : null, errors[id as keyof EventFieldErrors] ? `${id}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {/* Honeypot: hidden from people, irresistible to bots. */}
      <div aria-hidden="true" className="hidden">
        <label>
          Empresa
          <input name="empresa" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <p className={hintClass}><Star /> Obligatorio</p>

      <div className="space-y-1.5">
        <label htmlFor="image" className={`${labelClass} inline`}>Afiche</label>{" "}
        <Star />
        <input
          id="image"
          name="image"
          type="file"
          required
          aria-required="true"
          accept="image/jpeg,image/png,image/webp"
          onChange={onFileChange}
          aria-invalid={Boolean(errors.image)}
          aria-describedby={describedBy("image", true)}
          className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-dd-black file:px-4 file:py-2 file:font-semibold file:text-dd-cream"
        />
        <p id="image-hint" className={hintClass}>Una imagen. JPG, PNG o WebP, hasta 4.5 MB.</p>
        {preview && (
          <div className="mt-2">
            <img src={preview} alt="Vista previa del afiche" className="aspect-[4/5] w-48 rounded-lg border border-dd-black/15 object-cover" />
          </div>
        )}
        <ErrorText id="image-error" text={errors.image} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="title" className={`${labelClass} inline`}>Nombre del evento</label>{" "}
        <Star />
        <input id="title" name="title" required aria-required="true" maxLength={LIMITS.title} className={inputClass}
          aria-invalid={Boolean(errors.title)} aria-describedby={describedBy("title")} />
        <ErrorText id="title-error" text={errors.title} />
      </div>

      <div className="space-y-1.5">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="date" className={`${labelClass} inline`}>Fecha</label>{" "}
            <Star />
            <input id="date" name="date" type="date" required aria-required="true" ref={dateRef} className={inputClass}
              aria-invalid={Boolean(errors.date)} aria-describedby={describedBy("date", true)} />
            <ErrorText id="date-error" text={errors.date} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="time" className={`${labelClass} inline`}>Hora</label>{" "}
            <Star />
            <input id="time" name="time" type="time" required aria-required="true" className={inputClass}
              aria-invalid={Boolean(errors.time)} aria-describedby={describedBy("time", true)} />
            <ErrorText id="time-error" text={errors.time} />
          </div>
        </div>
        <p id="date-hint" className={hintClass}>Hora de Puerto Rico.</p>
        <p id="time-hint" className="sr-only">Hora de Puerto Rico.</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="venue" className={`${labelClass} inline`}>Lugar</label>{" "}
        <Star />
        <input id="venue" name="venue" required aria-required="true" maxLength={LIMITS.venue} className={inputClass}
          aria-invalid={Boolean(errors.venue)} aria-describedby={describedBy("venue", true)} />
        <p id="venue-hint" className={hintClass}>Nombre del sitio y pueblo.</p>
        <ErrorText id="venue-error" text={errors.venue} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="link" className={`${labelClass} inline`}>Enlace</label>{" "}
        <Star />
        <input id="link" name="link" required aria-required="true" inputMode="url" placeholder="https://" maxLength={LIMITS.link} className={inputClass}
          aria-invalid={Boolean(errors.link)} aria-describedby={describedBy("link", true)} />
        <p id="link-hint" className={hintClass}>Eventbrite, Instagram, la página del evento…</p>
        <ErrorText id="link-error" text={errors.link} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className={labelClass}>Descripción (opcional)</label>
        <textarea id="description" name="description" maxLength={LIMITS.description} className={textareaClass}
          onChange={(e) => setDescriptionLength(e.target.value.length)}
          aria-invalid={Boolean(errors.description)} aria-describedby={describedBy("description", true)} />
        <p id="description-hint" className={hintClass}>{descriptionLength}/{LIMITS.description}</p>
        <ErrorText id="description-error" text={errors.description} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="organizer" className={labelClass}>Organiza (opcional)</label>
        <input id="organizer" name="organizer" maxLength={LIMITS.organizer} className={inputClass}
          aria-invalid={Boolean(errors.organizer)} aria-describedby={describedBy("organizer")} />
        <ErrorText id="organizer-error" text={errors.organizer} />
      </div>

      <fieldset className="space-y-2" aria-describedby={describedBy("price")}>
        <legend className={labelClass}>Costo</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {[
            { value: "", label: "No sé" },
            { value: "free", label: "Gratis" },
            { value: "paid", label: "Pago" },
          ].map((option) => (
            <label key={option.value || "unknown"} className="flex items-center gap-2 text-[15px] text-dd-black">
              <input type="radio" name="price" value={option.value} defaultChecked={option.value === ""} className="h-4 w-4 accent-dd-red" />
              {option.label}
            </label>
          ))}
        </div>
        <ErrorText id="price-error" text={errors.price} />
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor="email" className={`${labelClass} inline`}>Tu email</label>{" "}
        <Star />
        <input id="email" name="email" required aria-required="true" type="email" autoComplete="email" maxLength={LIMITS.email} className={inputClass}
          aria-invalid={Boolean(errors.email)} aria-describedby={describedBy("email", true)} />
        <p id="email-hint" className={hintClass}>No se muestra. Te avisamos cuando se publique.</p>
        <ErrorText id="email-error" text={errors.email} />
      </div>

      <div className="space-y-1.5">
        <label className="flex items-start gap-3 text-[15px] text-dd-black">
          <input type="checkbox" name="permission" required aria-required="true" className="mt-1 h-4 w-4 accent-dd-red"
            aria-invalid={Boolean(errors.permission)} aria-describedby={describedBy("permission")} />
          <span>
            Tengo permiso para compartir este evento y su afiche. <Star />
          </span>
        </label>
        <ErrorText id="permission-error" text={errors.permission} />
      </div>

      {message && <p role="alert" className="rounded-md bg-dd-red/10 px-4 py-3 text-sm font-medium text-dd-red">{message}</p>}

      <button type="submit" disabled={isPending} className={primaryBtn}>
        {isPending ? "Enviando…" : "Enviar a revisión"}
      </button>
    </form>
  );
}
