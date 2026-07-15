// Shared control vocabulary for the admin surface. One set of class strings so
// every input, button and label looks identical across the three CRUD sections
// (product register: consistency over surprise). Plain strings → importable by
// both server and client components.

export type FormState = { error?: string };

export const labelClass = "block text-sm font-semibold text-dd-black";

export const hintClass = "text-[13px] leading-snug text-dd-black/65";

export const inputClass =
  "w-full rounded-md border border-dd-black/25 bg-white px-3.5 py-2.5 text-[15px] text-dd-black outline-none transition-colors placeholder:text-dd-black/50 focus-visible:border-dd-red focus-visible:ring-2 focus-visible:ring-dd-red/25";

export const textareaClass = `${inputClass} min-h-[7rem] resize-y`;

export const selectClass = `${inputClass} appearance-none`;

export const primaryBtn =
  "inline-flex items-center justify-center rounded-md bg-dd-red px-5 py-2.5 text-[15px] font-semibold text-dd-cream transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dd-red/40 focus-visible:ring-offset-2 focus-visible:ring-offset-dd-cream disabled:opacity-60";

export const secondaryBtn =
  "inline-flex items-center justify-center rounded-md border border-dd-black/25 bg-white px-5 py-2.5 text-[15px] font-medium text-dd-black transition-colors hover:border-dd-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dd-black/20";

export const dangerBtn =
  "inline-flex items-center justify-center rounded-md border border-dd-red/45 bg-white px-4 py-2 text-sm font-semibold text-dd-red transition-colors hover:bg-dd-red hover:text-dd-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dd-red/40 disabled:opacity-60";
