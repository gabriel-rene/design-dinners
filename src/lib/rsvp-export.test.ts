import { describe, expect, it } from "vitest";

import { buildExportRows, formatSheetDate, isAuthorizedExport } from "./rsvp-export";

const TOKEN = "a".repeat(40);

describe("isAuthorizedExport", () => {
  it("accepts the right bearer token", () => {
    expect(isAuthorizedExport(`Bearer ${TOKEN}`, TOKEN)).toBe(true);
  });

  it("rejects a wrong, missing or malformed header", () => {
    expect(isAuthorizedExport(`Bearer ${"b".repeat(40)}`, TOKEN)).toBe(false);
    expect(isAuthorizedExport(null, TOKEN)).toBe(false);
    expect(isAuthorizedExport(TOKEN, TOKEN)).toBe(false);
    expect(isAuthorizedExport("Bearer ", TOKEN)).toBe(false);
  });

  it("stays closed when the token is unset or too short", () => {
    expect(isAuthorizedExport("Bearer x", undefined)).toBe(false);
    expect(isAuthorizedExport("Bearer short", "short")).toBe(false);
  });
});

describe("formatSheetDate", () => {
  it("formats in Puerto Rico time", () => {
    expect(formatSheetDate("2026-10-23T23:00:00Z")).toBe("2026-10-23 19:00");
    expect(formatSheetDate("2026-10-24T03:30:00Z")).toBe("2026-10-23 23:30");
  });
});

describe("buildExportRows", () => {
  it("maps rows to sheet cells with Spanish status labels", () => {
    expect(
      buildExportRows([
        {
          event_title: "Cena #1",
          event_date: "2026-10-23T23:00:00Z",
          name: "Gabriela Ortiz",
          email: "g@ejemplo.com",
          status: "waitlist",
          created_at: "2026-10-07T16:05:00Z",
        },
      ]),
    ).toEqual([["Cena #1", "2026-10-23 19:00", "Gabriela Ortiz", "g@ejemplo.com", "Lista de espera", "2026-10-07 12:05"]]);
  });

  it("guards against formula injection", () => {
    const [row] = buildExportRows([
      {
        event_title: "=IMPORTXML()",
        event_date: "2026-10-23T23:00:00Z",
        name: "+1 Malo",
        email: "@x.com",
        status: "confirmed",
        created_at: "2026-10-07T16:05:00Z",
      },
    ]);
    expect(row[0]).toBe("'=IMPORTXML()");
    expect(row[2]).toBe("'+1 Malo");
    expect(row[3]).toBe("'@x.com");
  });
});
