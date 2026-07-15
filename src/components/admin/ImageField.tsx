"use client";

import { useEffect, useRef, useState } from "react";

import { hintClass, labelClass } from "./formStyles";

/**
 * File input with a live preview. The selected File rides along in the form's
 * FormData under `name`; the server action validates type/size and uploads it.
 * On the edit form `defaultUrl` seeds the preview with the current image.
 */
export default function ImageField({
  name,
  label,
  defaultUrl,
  hint,
}: {
  name: string;
  label: string;
  defaultUrl?: string | null;
  hint?: string;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(defaultUrl ?? null);
  const objectUrlRef = useRef<string | null>(null);

  // Revoke the last object URL whenever it changes or the component unmounts.
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      setPreviewUrl(url);
    } else {
      setPreviewUrl(defaultUrl ?? null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className={labelClass}>{label}</span>
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dd-black/20 bg-dd-cream">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- preview of an arbitrary user upload / stored URL
            <img
              src={previewUrl}
              alt="Vista previa"
              className="h-full w-full object-cover"
            />
          ) : (
            <span aria-hidden className="text-2xl text-dd-black/30">
              ◍
            </span>
          )}
        </div>
        <input
          type="file"
          name={name}
          accept="image/*"
          onChange={onChange}
          className="block w-full text-sm text-dd-black/80 file:mr-3 file:rounded-md file:border file:border-dd-black/25 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-dd-black hover:file:border-dd-black/50"
        />
      </div>
      {hint && <p className={hintClass}>{hint}</p>}
    </div>
  );
}
