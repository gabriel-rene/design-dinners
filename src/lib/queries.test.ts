import { describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ hasDatabaseConfig: false, getDb: () => { throw new Error("no db"); } }));

import { findPublicEvent } from "./queries";
import { DEMO_EVENTS } from "./demo-data";

describe("findPublicEvent (demo data)", () => {
  const e = DEMO_EVENTS[0];
  it("current slug is canonical", async () => {
    expect((await findPublicEvent(e.slug!))?.canonical).toBe(true);
  });
  it("id of an event with a slug is not canonical (redirects)", async () => {
    expect((await findPublicEvent(e.id))?.canonical).toBe(false);
  });
  it("old slug is not canonical and is flagged old_slug", async () => {
    const row = { ...e, old_slugs: ["viejo-slug-prueba"] };
    DEMO_EVENTS.push(row);
    try {
      const r = await findPublicEvent("viejo-slug-prueba");
      expect(r?.canonical).toBe(false);
      expect(r?.matchedBy).toBe("old_slug");
    } finally {
      DEMO_EVENTS.pop();
    }
  });
  it("row with null slug reached by id is canonical", async () => {
    const row = { ...e, id: "00000000-0000-4000-8000-000000000abc", slug: null, old_slugs: [] };
    DEMO_EVENTS.push(row);
    try {
      const r = await findPublicEvent(row.id);
      expect(r?.canonical).toBe(true);
      expect(r?.matchedBy).toBe("id");
    } finally {
      DEMO_EVENTS.pop();
    }
  });
  it("unknown is null", async () => {
    expect(await findPublicEvent("nope")).toBeNull();
  });
});
