"use client";

import { useState } from "react";

import type { SocialLink } from "@/lib/types";
import { hintClass, inputClass, labelClass } from "./formStyles";

let rowKeySeq = 0;
type Row = { key: number; label: string; url: string };

function toRows(links: SocialLink[]): Row[] {
  if (links.length === 0) {
    return [{ key: rowKeySeq++, label: "", url: "" }];
  }
  return links.map((link) => ({ key: rowKeySeq++, label: link.label, url: link.url }));
}

/**
 * Repeatable label + URL rows serialized to the `social_links` jsonb. Each row
 * emits two real inputs (`social_label`, `social_url`); the server zips them
 * with FormData.getAll, drops fully-empty rows, and errors on half-filled ones.
 */
export default function SocialLinksField({
  defaultValue = [],
}: {
  defaultValue?: SocialLink[];
}) {
  const [rows, setRows] = useState<Row[]>(() => toRows(defaultValue));

  function updateRow(key: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((prev) => [...prev, { key: rowKeySeq++, label: "", url: "" }]);
  }

  function removeRow(key: number) {
    setRows((prev) => {
      const next = prev.filter((row) => row.key !== key);
      return next.length > 0 ? next : [{ key: rowKeySeq++, label: "", url: "" }];
    });
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className={labelClass}>Enlaces sociales</legend>
      <p className={hintClass}>
        Por ejemplo: LinkedIn, Instagram, portafolio. Deja una fila vacía para
        omitirla.
      </p>

      <div className="flex flex-col gap-2.5">
        {rows.map((row) => (
          <div key={row.key} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
            <input
              type="text"
              name="social_label"
              aria-label="Etiqueta del enlace"
              placeholder="LinkedIn"
              value={row.label}
              onChange={(event) => updateRow(row.key, { label: event.target.value })}
              className={`${inputClass} sm:w-40`}
            />
            <input
              type="url"
              name="social_url"
              aria-label="URL del enlace"
              placeholder="https://…"
              value={row.url}
              onChange={(event) => updateRow(row.key, { url: event.target.value })}
              className={`${inputClass} flex-1`}
            />
            <button
              type="button"
              onClick={() => removeRow(row.key)}
              aria-label="Quitar enlace"
              className="shrink-0 rounded-md border border-dd-black/20 px-3 py-2.5 text-sm font-medium text-dd-black/70 transition-colors hover:border-dd-red hover:text-dd-red"
            >
              Quitar
            </button>
          </div>
        ))}
      </div>

      <div>
        <button
          type="button"
          onClick={addRow}
          className="rounded-md border border-dd-black/25 bg-white px-3.5 py-2 text-sm font-medium text-dd-black transition-colors hover:border-dd-black/50"
        >
          + Añadir enlace
        </button>
      </div>
    </fieldset>
  );
}
