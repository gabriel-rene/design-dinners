import { describe, expect, it } from "vitest";

import { clientIpFrom, hashIp, ipBucket } from "./ip-hash";

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

describe("ipBucket", () => {
  it("keeps IPv4 and unwraps IPv4-mapped IPv6", () => {
    expect(ipBucket("203.0.113.9")).toBe("203.0.113.9");
    expect(ipBucket("::ffff:203.0.113.9")).toBe("203.0.113.9");
  });

  it("groups IPv6 by /64, however it is written", () => {
    expect(ipBucket("2001:db8:85a3:42:1:2:3:4")).toBe("2001:db8:85a3:42::/64");
    expect(ipBucket("2001:0db8:85a3:0042:ffff::1")).toBe("2001:db8:85a3:42::/64");
    expect(ipBucket("2001:db8::1")).toBe("2001:db8:0:0::/64");
    expect(ipBucket("2001:db8:0:0:9::")).toBe("2001:db8:0:0::/64");
  });

  it("gives every address in one /64 the same hash", () => {
    expect(hashIp("2001:db8:85a3:42::1", "s")).toBe(hashIp("2001:db8:85a3:42:dead:beef:0:7", "s"));
    expect(hashIp("2001:db8:85a3:42::1", "s")).not.toBe(hashIp("2001:db8:85a3:43::1", "s"));
  });
});
