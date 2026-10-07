import { describe, expect, it } from "vitest";

import { clientIpFrom, hashIp } from "./ip-hash";

describe("clientIpFrom", () => {
  it("takes the first forwarded hop", () => {
    expect(clientIpFrom("203.0.113.9, 10.0.0.1")).toBe("203.0.113.9");
    expect(clientIpFrom(null)).toBeNull();
    expect(clientIpFrom("  ")).toBeNull();
  });
  it("treats IPv6 loopback as no ip", () => {
    expect(clientIpFrom("::1")).toBeNull();
  });
  it("treats IPv4 loopback as no ip", () => {
    expect(clientIpFrom("127.0.0.1")).toBeNull();
  });
  it("treats IPv4-mapped IPv6 loopback as no ip", () => {
    expect(clientIpFrom("::ffff:127.0.0.1, 10.0.0.1")).toBeNull();
  });
});

describe("hashIp", () => {
  it("hashes deterministically and never returns the raw ip", () => {
    const a = hashIp("203.0.113.9", "salt");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).toBe(hashIp("203.0.113.9", "salt"));
    expect(a).not.toBe(hashIp("203.0.113.9", "other"));
    expect(hashIp(null, "salt")).toBeNull();
    expect(hashIp("203.0.113.9", undefined)).toBeNull();
  });
});
