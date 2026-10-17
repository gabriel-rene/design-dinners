// Pure helpers (no server imports): safe to use from client components.

export const RESERVED_SLUGS: readonly string[] = ["enviar", "comunidad"];

const MAX_LEN = 80;

export function slugify(title: string): string {
  let s = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (s.length > MAX_LEN) {
    const cut = s.slice(0, MAX_LEN);
    const next = s[MAX_LEN];
    if (next === "-") s = cut;
    else {
      const i = cut.lastIndexOf("-");
      s = i > 0 ? cut.slice(0, i) : cut;
    }
    s = s.replace(/-+$/g, "");
  }
  return s || "evento";
}

/** First free of base, base-2, base-3… not in `taken` and not reserved. */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const free = (c: string) => !used.has(c) && !RESERVED_SLUGS.includes(c);
  if (free(base)) return base;
  for (let n = 2; ; n++) {
    const c = `${base}-${n}`;
    if (free(c)) return c;
  }
}

export function eventPath(event: { id: string; slug: string | null }): string {
  return `/eventos/${event.slug ?? event.id}`;
}

export function communityEventPath(event: { slug: string }): string {
  return `/eventos/comunidad/${event.slug}`;
}
