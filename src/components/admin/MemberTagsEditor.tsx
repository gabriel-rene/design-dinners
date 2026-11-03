"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { saveMemberTags } from "@/app/admin/(panel)/comunidad/actions";
import { inputClass, primaryBtnSm, secondaryBtnSm, type FormState } from "./formStyles";

/** A member's tags as filter links, plus an inline comma-list editor. */
export default function MemberTagsEditor({ id, name, tags }: { id: string; name: string; tags: string[] }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, isPending] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await saveMemberTags(prev, formData);
    if (!result.error) setEditing(false);
    return result;
  }, {});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <Link
            key={tag}
            href={`/admin/comunidad?etiqueta=${encodeURIComponent(tag)}`}
            className="rounded-full bg-dd-red/10 px-2.5 py-0.5 text-[12px] font-semibold text-dd-red hover:bg-dd-red/20"
          >
            {tag}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-full px-2 py-0.5 text-[12px] font-semibold text-dd-black/55 underline-offset-2 hover:text-dd-black hover:underline"
          aria-label={`Editar etiquetas de ${name}`}
        >
          {tags.length ? "Editar" : "+ Etiqueta"}
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <input type="hidden" name="id" value={id} />
      <input
        ref={inputRef}
        name="tags"
        defaultValue={tags.join(", ")}
        placeholder="comite, organizador"
        aria-label={`Etiquetas de ${name}, separadas por coma`}
        className={`${inputClass} py-1.5 text-sm`}
        onKeyDown={(event) => {
          if (event.key === "Escape") setEditing(false);
        }}
      />
      <div className="flex gap-1.5">
        <button type="submit" className={primaryBtnSm} disabled={isPending}>
          {isPending ? "Guardando…" : "Guardar"}
        </button>
        <button type="button" className={secondaryBtnSm} onClick={() => setEditing(false)} disabled={isPending}>
          Cancelar
        </button>
      </div>
      {state.error && (
        <p role="alert" className="text-[13px] text-dd-red">
          {state.error}
        </p>
      )}
    </form>
  );
}
