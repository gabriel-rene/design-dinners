"use client";

/* eslint-disable @next/next/no-img-element -- local object-URL preview */
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import { startVitrinaUpload, submitVitrinaWork } from "@/app/vitrina/enviar/actions";
import {
  hintClass,
  inputClass,
  labelClass,
  primaryBtn,
  selectClass,
  textareaClass,
} from "@/components/admin/formStyles";
import { createClient } from "@/lib/supabase/client";
import {
  BADGE_LABEL,
  BADGES,
  LIMITS,
  LINK_KEYS,
  LINK_LABEL,
  checkImageFile,
  parseWorkFields,
  workRawFromFormData,
  type LinkKey,
  type WorkFieldErrors,
} from "@/lib/vitrina/validate";

const LINK_PLACEHOLDER: Record<LinkKey, string> = {
  website: "https://tusitio.com",
  instagram: "@tuusuario",
  behance: "https://behance.net/tuusuario",
  linkedin: "https://linkedin.com/in/tuusuario",
  dribbble: "https://dribbble.com/tuusuario",
};

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

export default function SubmitWorkForm() {
  const [errors, setErrors] = useState<WorkFieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [descriptionLength, setDescriptionLength] = useState(0);
  const [isPending, startTransition] = useTransition();
  // Reuse the upload when only text fields change between attempts.
  const uploaded = useRef<Uploaded | null>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    setFile(next);
    setPreview(next ? URL.createObjectURL(next) : null);
    setErrors((prev) => ({ ...prev, image: next ? (checkImageFile(next) ?? undefined) : undefined }));
  }

  async function ensureUploaded(current: File): Promise<Uploaded | { message: string }> {
    if (uploaded.current?.file === current) return uploaded.current;
    const { width, height } = await imageSize(current);
    const ticket = await startVitrinaUpload(current.type, current.size);
    if (!ticket.ok) return { message: ticket.message };
    const { error } = await createClient()
      .storage.from("vitrina-pending")
      .uploadToSignedUrl(ticket.path, ticket.token, current, { contentType: current.type });
    if (error) return { message: "No pudimos subir la imagen. Intenta de nuevo." };
    uploaded.current = { file: current, path: ticket.path, width, height };
    return uploaded.current;
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const fields = parseWorkFields(workRawFromFormData(formData));
    const nextErrors: WorkFieldErrors = fields.ok ? {} : { ...fields.errors };
    const imageError = file ? checkImageFile(file) : "Elige una imagen de tu obra.";
    if (imageError) nextErrors.image = imageError;
    setErrors(nextErrors);
    setMessage(null);
    if (Object.keys(nextErrors).length > 0 || !file) return;

    startTransition(async () => {
      try {
        const upload = await ensureUploaded(file);
        if ("message" in upload) {
          setMessage(upload.message);
          return;
        }
        // The file already went straight to Storage: never send it through Vercel.
        formData.delete("image");
        formData.set("imagePath", upload.path);
        formData.set("imageWidth", String(upload.width));
        formData.set("imageHeight", String(upload.height));
        const result = await submitVitrinaWork({ status: "idle" }, formData);
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
        <p className="mt-3 text-[15px] text-dd-black/80">Revisamos cada obra antes de publicarla.</p>
        <Link href="/vitrina" className={`${primaryBtn} mt-6`}>
          Ver La Vitrina
        </Link>
      </section>
    );
  }

  const describedBy = (id: string, hint?: boolean) =>
    [hint ? `${id}-hint` : null, errors[id as keyof WorkFieldErrors] ? `${id}-error` : null]
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

      <p className={hintClass}><span aria-hidden="true" className="text-dd-red">*</span> Obligatorio</p>

      <div className="space-y-1.5">
        <label htmlFor="image" className={`${labelClass} inline`}>Imagen de la obra</label>{" "}
        <span aria-hidden="true" className="text-dd-red">*</span>
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
          <img src={preview} alt="Vista previa de tu obra" className="mt-2 max-h-80 rounded-lg border border-dd-black/15 object-contain" />
        )}
        <ErrorText id="image-error" text={errors.image} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="title" className={`${labelClass} inline`}>Título de la obra</label>{" "}
        <span aria-hidden="true" className="text-dd-red">*</span>
        <input id="title" name="title" required aria-required="true" maxLength={LIMITS.title} className={inputClass}
          aria-invalid={Boolean(errors.title)} aria-describedby={describedBy("title")} />
        <ErrorText id="title-error" text={errors.title} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className={labelClass}>Descripción (opcional)</label>
        <textarea id="description" name="description" maxLength={LIMITS.description} className={textareaClass}
          onChange={(e) => setDescriptionLength(e.target.value.length)}
          aria-invalid={Boolean(errors.description)} aria-describedby={describedBy("description", true)} />
        <p id="description-hint" className={hintClass}>{descriptionLength}/{LIMITS.description}</p>
        <ErrorText id="description-error" text={errors.description} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="name" className={`${labelClass} inline`}>Nombre</label>{" "}
          <span aria-hidden="true" className="text-dd-red">*</span>
          <input id="name" name="name" required aria-required="true" autoComplete="name" maxLength={LIMITS.name} className={inputClass}
            aria-invalid={Boolean(errors.name)} aria-describedby={describedBy("name")} />
          <ErrorText id="name-error" text={errors.name} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="role" className={`${labelClass} inline`}>Rol o disciplina</label>{" "}
          <span aria-hidden="true" className="text-dd-red">*</span>
          <input id="role" name="role" required aria-required="true" placeholder="Diseñadora gráfica" maxLength={LIMITS.role} className={inputClass}
            aria-invalid={Boolean(errors.role)} aria-describedby={describedBy("role")} />
          <ErrorText id="role-error" text={errors.role} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className={`${labelClass} inline`}>Correo electrónico</label>{" "}
        <span aria-hidden="true" className="text-dd-red">*</span>
        <input id="email" name="email" required aria-required="true" type="email" autoComplete="email" maxLength={LIMITS.email} className={inputClass}
          aria-invalid={Boolean(errors.email)} aria-describedby={describedBy("email", true)} />
        <p id="email-hint" className={hintClass}>No se muestra públicamente. Solo lo usamos si hay que contactarte.</p>
        <ErrorText id="email-error" text={errors.email} />
      </div>

      <fieldset className="space-y-3" aria-describedby={describedBy("links", true)}>
        <legend className={labelClass}>Dónde encontrarte <span aria-hidden="true" className="text-dd-red">*</span></legend>
        <p id="links-hint" className={hintClass}>Al menos uno. Aparecen como botones en tu obra.</p>
        <div className="grid gap-3 md:grid-cols-2">
          {LINK_KEYS.map((key) => (
            <div key={key} className="space-y-1">
              <label htmlFor={`link_${key}`} className="text-sm font-medium text-dd-black">{LINK_LABEL[key]}</label>
              <input id={`link_${key}`} name={`link_${key}`} placeholder={LINK_PLACEHOLDER[key]} className={inputClass} />
            </div>
          ))}
        </div>
        <ErrorText id="links-error" text={errors.links} />
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor="badge" className={labelClass}>¿Buscas trabajo o proyectos?</label>
        <select id="badge" name="badge" defaultValue="" className={selectClass} aria-describedby={describedBy("badge", true)}>
          <option value="">No por ahora</option>
          {BADGES.map((badge) => (
            <option key={badge} value={badge}>{BADGE_LABEL[badge]}</option>
          ))}
        </select>
        <p id="badge-hint" className={hintClass}>Sale como una etiqueta en tu obra. Así te encuentra quien quiere contratar.</p>
        <ErrorText id="badge-error" text={errors.badge} />
      </div>

      <div className="space-y-1.5">
        <label className="flex items-start gap-3 text-[15px] text-dd-black">
          <input type="checkbox" name="ownership" required aria-required="true" className="mt-1 h-4 w-4 accent-dd-red"
            aria-invalid={Boolean(errors.ownership)} aria-describedby={describedBy("ownership")} />
          <span>
            Esta obra es mía y autorizo que se muestre en Design Dinners.{" "}
            <span aria-hidden="true" className="text-dd-red">*</span>
          </span>
        </label>
        <ErrorText id="ownership-error" text={errors.ownership} />
      </div>

      {message && <p role="alert" className="rounded-md bg-dd-red/10 px-4 py-3 text-sm font-medium text-dd-red">{message}</p>}

      <button type="submit" disabled={isPending} className={primaryBtn}>
        {isPending ? "Enviando…" : "Enviar a revisión"}
      </button>
    </form>
  );
}
