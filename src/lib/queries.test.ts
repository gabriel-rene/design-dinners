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
  it("unknown is null", async () => {
    expect(await findPublicEvent("nope")).toBeNull();
  });
});
