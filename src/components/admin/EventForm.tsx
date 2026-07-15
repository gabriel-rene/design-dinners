"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { SpeakerRow } from "@/lib/types";
import FormError from "./FormError";
import ImageField from "./ImageField";
import {
  hintClass,
  inputClass,
  labelClass,
  primaryBtn,
  secondaryBtn,
  selectClass,
  textareaClass,
  type FormState,
} from "./formStyles";

export type EventFormDefaults = {
  title?: string;
  description?: string | null;
  event_date?: string; // datetime-local value (YYYY-MM-DDTHH:mm)
  location?: string | null;
  event_type?: string;
  registration_url?: string | null;
  cover_image_url?: string | null;
  speaker_ids?: string[];
};

const EVENT_TYPE_OPTIONS = [
  { value: "cena", label: "Cena" },
  { value: "taller", label: "Taller" },
  { value: "otro", label: "Otro" },
];

export default function EventForm({
  action,
  submitLabel,
  speakers,
  defaults = {},
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  speakers: SpeakerRow[];
  defaults?: EventFormDefaults;
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    action,
    {},
  );
  const selected = new Set(defaults.speaker_ids ?? []);

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
          placeholder="Design Dinners Vol. 10"
        />
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
          placeholder="De qué trata la cena, quién debería venir…"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="event_date" className={labelClass}>
            Fecha y hora <span className="text-dd-red">*</span>
          </label>
          <input
            id="event_date"
            name="event_date"
            type="datetime-local"
            required
            defaultValue={defaults.event_date ?? ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="event_type" className={labelClass}>
            Tipo
          </label>
          <select
            id="event_type"
            name="event_type"
            defaultValue={defaults.event_type ?? "cena"}
            className={selectClass}
          >
            {EVENT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="location" className={labelClass}>
            Lugar
          </label>
          <input
            id="location"
            name="location"
            type="text"
            defaultValue={defaults.location ?? ""}
            className={inputClass}
            placeholder="San Juan, PR"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="registration_url" className={labelClass}>
            Enlace de registro
          </label>
          <input
            id="registration_url"
            name="registration_url"
            type="url"
            defaultValue={defaults.registration_url ?? ""}
            className={inputClass}
            placeholder="https://…"
          />
        </div>
      </div>

      <ImageField
        name="cover_image"
        label="Imagen de portada"
        defaultUrl={defaults.cover_image_url}
        hint="JPG, PNG o WebP. Máximo 4 MB. Si la dejas vacía se conserva la actual."
      />

      <fieldset className="flex flex-col gap-3">
        <legend className={labelClass}>Speakers</legend>
        {speakers.length === 0 ? (
          <p className={hintClass}>
            Aún no hay speakers.{" "}
            <Link href="/admin/speakers/nuevo" className="font-semibold text-dd-red underline">
              Crea el primero
            </Link>
            .
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {speakers.map((speaker) => (
              <label
                key={speaker.id}
                className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dd-black/20 bg-white px-3 py-2 text-sm has-[:checked]:border-dd-red has-[:checked]:bg-dd-red/5 has-[:checked]:text-dd-red"
              >
                <input
                  type="checkbox"
                  name="speaker_ids"
                  value={speaker.id}
                  defaultChecked={selected.has(speaker.id)}
                  className="accent-dd-red"
                />
                {speaker.name}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={isPending} className={primaryBtn}>
          {isPending ? "Guardando…" : submitLabel}
        </button>
        <Link href="/admin/eventos" className={secondaryBtn}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
