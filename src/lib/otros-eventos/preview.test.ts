import { describe, expect, it, vi } from "vitest";
import { loadEventsPreview } from "./preview";

describe("loadEventsPreview", () => {
  it("returns [] when the query throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await loadEventsPreview(async () => { throw new Error("down"); })).toEqual([]);
  });
});
