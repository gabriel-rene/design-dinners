// Admin labels for community members. Pure: the admin form and the server
// action share it. Tags are free text typed by an admin, stored as slugs so
// "Comité" and "comite" are one tag.

export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 30;

/** "Comité Organizador" → "comite-organizador". Empty when nothing is left. */
export function tagSlug(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_TAG_LENGTH)
    .replace(/-+$/, "");
}

/** Splits the admin's comma list into unique slugs, in the order typed. */
export function parseTags(input: string): { error: string } | { value: string[] } {
  const tags: string[] = [];
  for (const part of input.split(",")) {
    const tag = tagSlug(part);
    if (tag && !tags.includes(tag)) tags.push(tag);
  }
  if (tags.length > MAX_TAGS) return { error: `Máximo ${MAX_TAGS} etiquetas por persona.` };
  return { value: tags };
}

/** How many members carry each tag, biggest first, then A–Z. */
export function countByTag(rows: { tags: string[] }[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) for (const tag of row.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "es"));
}
