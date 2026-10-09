import { describe, expect, it, vi } from "vitest";

import { runReminders, type ReminderDeps } from "./reminders";

function deps(queue: Record<string, string[]>, results: Record<string, string> = {}) {
  const released: string[] = [];
  const d = {
    claim: vi.fn(async (kind: string) => {
      const id = queue[kind].shift();
      return id ? { id, eventId: "e", name: "N", email: "n@x.co", cancelToken: "t" } : null;
    }),
    release: vi.fn(async (_kind: string, id: string) => {
      released.push(id);
    }),
    send: vi.fn(async (_kind: string, target: { id: string }) => results[target.id] ?? "sent"),
    pauseMs: 0,
  } as unknown as ReminderDeps & { claim: ReturnType<typeof vi.fn> };
  return { d, released };
}

describe("runReminders", () => {
  it("sends every claimed guest once per kind", async () => {
    const { d, released } = deps({ reminder: ["a", "b"], final: ["c"] });
    expect(await runReminders(d)).toEqual({ reminder: { sent: 2, failed: 0 }, final: { sent: 1, failed: 0 } });
    expect(released).toEqual([]);
  });

  it("releases failed sends after the loop so the next run retries them", async () => {
    const { d, released } = deps({ reminder: ["a", "b"], final: [] }, { a: "failed" });
    expect(await runReminders(d)).toEqual({ reminder: { sent: 1, failed: 1 }, final: { sent: 0, failed: 0 } });
    expect(released).toEqual(["a"]);
  });

  it("stops the whole run and releases when email is not configured", async () => {
    const { d, released } = deps({ reminder: ["a", "b"], final: ["c"] }, { a: "skipped" });
    const out = await runReminders(d);
    expect(out).toEqual({ reminder: { sent: 0, failed: 1 }, final: { sent: 0, failed: 0 } });
    expect(released).toEqual(["a"]);
    expect(d.claim).toHaveBeenCalledTimes(1);
  });
});
