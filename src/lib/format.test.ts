import { describe, expect, it } from "vitest";

import { formatDateParts } from "./format";

describe("formatDateParts", () => {
  it("returns short Spanish parts in Puerto Rico time", () => {
    // 2026-10-23 23:00 UTC = viernes 23 oct, 7:00 PM in PR
    expect(formatDateParts("2026-10-23T23:00:00Z")).toEqual({ weekday: "vie", day: "23", month: "oct" });
  });
  it("uses PR time near midnight UTC", () => {
    // 2026-10-24 02:00 UTC is 22:00 on Friday 23 Oct in Puerto Rico.
    expect(formatDateParts("2026-10-24T02:00:00Z").day).toBe("23");
  });
});
