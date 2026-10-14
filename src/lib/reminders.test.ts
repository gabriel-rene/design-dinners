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

  it("retries a failed send once in the same run", async () => {
    // "a" fails the first time. Released, it is claimed again on the retry pass.
    const queue = { reminder: ["a", "b"], final: [] as string[] };
    let firstTry = true;
    const { d, released } = deps(queue);
    d.release = vi.fn(async (_kind, id) => {
      released.push(id);
      queue.reminder.push(id);
    });
    d.send = vi.fn(async (_kind, t) => (t.id === "a" && firstTry ? ((firstTry = false), "failed") : "sent"));
    expect(await runReminders(d)).toEqual({ reminder: { sent: 2, failed: 0 }, final: { sent: 0, failed: 0 } });
    expect(released).toEqual(["a"]);
  });

  it("releases every unsent guest when a claim throws", async () => {
    const { d, released } = deps({ reminder: ["a"], final: [] }, { a: "failed" });
    let calls = 0;
    const claim = d.claim;
    d.claim = vi.fn(async (kind) => {
      if (++calls === 2) throw new Error("db down");
      return claim(kind);
    });
    await expect(runReminders(d)).rejects.toThrow("db down");
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
