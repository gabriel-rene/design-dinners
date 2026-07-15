"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { SocialLink } from "@/lib/types";
import FormError from "./FormError";
import ImageField from "./ImageField";
import SocialLinksField from "./SocialLinksField";
import {
  inputClass,
  labelClass,
  primaryBtn,
  secondaryBtn,
  textareaClass,
  type FormState,
} from "./formStyles";

export type SpeakerFormDefaults = {
  name?: string;
  role_title?: string | null;
  bio?: string | null;
  photo_url?: string | null;
  social_links?: SocialLink[];
};

export default function SpeakerForm({
  action,
  submitLabel,
  defaults = {},
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  defaults?: SpeakerFormDefaults;
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-6">
      {state.error && <FormError message={state.error} />}

      <div className="flex flex-col gap-2">
        <label htmlFor="name" className={labelClass}>
          Nombre <span className="text-dd-red">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={defaults.name ?? ""}
          className={inputClass}
          placeholder="Ana Rivera"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="role_title" className={labelClass}>
          Cargo o rol
        </label>
        <input
          id="role_title"
          name="role_title"
          type="text"
          defaultValue={defaults.role_title ?? ""}
          className={inputClass}
          placeholder="Directora de Diseño"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="bio" className={labelClass}>
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          defaultValue={defaults.bio ?? ""}
          className={textareaClass}
          placeholder="Una o dos líneas sobre su trabajo."
        />
      </div>

      <ImageField
        name="photo"
        label="Foto"
        defaultUrl={defaults.photo_url}
        hint="JPG, PNG o WebP. Máximo 4 MB. Si la dejas vacía se conserva la actual."
      />

      <SocialLinksField defaultValue={defaults.social_links} />

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={isPending} className={primaryBtn}>
          {isPending ? "Guardando…" : submitLabel}
        </button>
        <Link href="/admin/speakers" className={secondaryBtn}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
