import { describe, expect, it } from "vitest";

import { decodeCursor, encodeCursor } from "./cursor";

const ID = "3f2b8c1e-0d4a-4b6f-9c2e-1a2b3c4d5e6f";

describe("feed cursor", () => {
  it("round-trips Postgres timestamps exactly (microseconds kept)", () => {
    const cursor = { ts: "2026-10-06T19:22:01.123456+00:00", id: ID };
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });
  it("rejects junk", () => {
    expect(decodeCursor(null)).toBeNull();
    expect(decodeCursor("not-base64-at-all!")).toBeNull();
    expect(decodeCursor(Buffer.from(`yesterday|${ID}`).toString("base64url"))).toBeNull();
    expect(decodeCursor(Buffer.from("2026-10-06T19:22:01Z|nope").toString("base64url"))).toBeNull();
    expect(decodeCursor(Buffer.from(`2026-10-06T19:22:01Z|${ID}|x`).toString("base64url"))).toBeNull();
  });
});
