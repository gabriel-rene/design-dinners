import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

describe("service role key", () => {
  it("is never exposed through a NEXT_PUBLIC_ variable", () => {
    const files = [...walk("src"), ".env.example"];
    // Built from parts so this file does not match itself.
    const leak = new RegExp(["NEXT", "PUBLIC", "[A-Z_]*SERVICE"].join("_"));
    for (const file of files) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(leak);
    }
  });
});
