import { afterEach, describe, expect, it, vi } from "vitest";

import { logSafe, safeError } from "./log";

const postgrestError = {
  code: "23514",
  message: 'new row for relation "vitrina_works" violates check constraint "vitrina_works_has_link"',
  details: "Failing row contains (…, ana@ejemplo.com, …, ip-hash-123, …).",
  hint: "ana@ejemplo.com",
  name: "PostgrestError",
};

describe("safeError / logSafe", () => {
  afterEach(() => vi.restoreAllMocks());

  it("keeps only code and message", () => {
    expect(safeError(postgrestError)).toEqual({ code: "23514", message: postgrestError.message });
  });

  it("never logs details or hint", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logSafe("submitVitrinaWork failed", postgrestError);
    expect(spy).toHaveBeenCalledOnce();
    const logged = JSON.stringify(spy.mock.calls[0]);
    expect(logged).toContain("23514");
    expect(logged).not.toContain("ana@ejemplo.com");
    expect(logged).not.toContain("ip-hash-123");
    expect(logged).not.toContain("Failing row");
  });

  it("handles Errors, strings and junk", () => {
    expect(safeError(new Error("storage down"))).toEqual({ message: "storage down" });
    expect(safeError("boom")).toEqual({ message: "boom" });
    expect(safeError(null)).toEqual({ message: "unknown error" });
    expect(safeError({ code: 42 })).toEqual({ code: "42", message: "unknown error" });
  });
});
