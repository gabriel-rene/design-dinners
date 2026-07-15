"use client";

import Link from "next/link";
import { useActionState } from "react";

import FormError from "./FormError";
import {
  hintClass,
  inputClass,
  labelClass,
  primaryBtn,
  secondaryBtn,
  textareaClass,
  type FormState,
} from "./formStyles";

export type ResourceFormDefaults = {
  title?: string;
  description?: string | null;
  url?: string;
  category?: string;
};

export default function ResourceForm({
  action,
  submitLabel,
  categories,
  defaults = {},
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  categories: string[];
  defaults?: ResourceFormDefaults;
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-6">
      {state.error && <FormError message={state.error} />}

      <div className="flex flex-col gap-2">
        <label htmlFor="title" className={labelClass}>
          Título <span className="text-dd-red">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={defaults.title ?? ""}
          className={inputClass}
          placeholder="Hoja de estilo de marca"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="url" className={labelClass}>
          Enlace <span className="text-dd-red">*</span>
        </label>
        <input
          id="url"
          name="url"
          type="url"
          required
          defaultValue={defaults.url ?? ""}
          className={inputClass}
          placeholder="https://…"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="category" className={labelClass}>
          Categoría <span className="text-dd-red">*</span>
        </label>
        <input
          id="category"
          name="category"
          type="text"
          required
          list="resource-categories"
          defaultValue={defaults.category ?? ""}
          className={inputClass}
          placeholder="plantillas"
        />
        <datalist id="resource-categories">
          {categories.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
        <p className={hintClass}>
          Escribe una nueva o elige una existente. Los recursos se agrupan por
          categoría en la portada.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="description" className={labelClass}>
          Descripción
        </label>
        <textarea
          id="description"
          name="description"
          defaultValue={defaults.description ?? ""}
          className={textareaClass}
          placeholder="Qué encontrarán en el enlace."
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={isPending} className={primaryBtn}>
          {isPending ? "Guardando…" : submitLabel}
        </button>
        <Link href="/admin/recursos" className={secondaryBtn}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
