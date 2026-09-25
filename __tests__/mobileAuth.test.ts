import { describe, it, expect, beforeAll } from "vitest";
import { encode } from "next-auth/jwt";

// توکن‌ها با NEXTAUTH_SECRET مشتق می‌شن — مقدارِ تستی قبل از import
beforeAll(() => {
  process.env.NEXTAUTH_SECRET ||= "test-secret-for-mobile-auth-at-least-32-chars";
});

import {
  cleanDeviceName,
  hashRefreshToken,
  isWellFormedRefreshToken,
  issueAccessToken,
  newRefreshToken,
  readBearer,
  verifyAccessToken,
} from "@/lib/mobileAuth";

describe("access token", () => {
  it("round-trips userId + sid", async () => {
    const tok = await issueAccessToken("user_1", "sess_1");
    expect(await verifyAccessToken(tok)).toEqual({ userId: "user_1", sid: "sess_1" });
  });

  it("rejects a web session token (default next-auth salt) even with the same secret", async () => {
    const web = await encode({ token: { sub: "user_1", sid: "sess_1", aud: "mobile", typ: "access" }, secret: process.env.NEXTAUTH_SECRET! });
    expect(await verifyAccessToken(web)).toBeNull();
  });

  it("rejects wrong audience / type even when encrypted with the mobile key", async () => {
    const salt = "routine-mobile-access-token-v1";
    const wrongAud = await encode({ token: { sub: "u", sid: "s", aud: "web", typ: "access" }, secret: process.env.NEXTAUTH_SECRET!, salt });
    const wrongTyp = await encode({ token: { sub: "u", sid: "s", aud: "mobile", typ: "refresh" }, secret: process.env.NEXTAUTH_SECRET!, salt });
    expect(await verifyAccessToken(wrongAud)).toBeNull();
    expect(await verifyAccessToken(wrongTyp)).toBeNull();
  });

  it("rejects expired tokens", async () => {
    const salt = "routine-mobile-access-token-v1";
    // maxAge منفی (فراتر از clockToleranceِ ۱۵ ثانیه‌ای) = منقضی
    const expired = await encode({ token: { sub: "u", sid: "s", aud: "mobile", typ: "access" }, secret: process.env.NEXTAUTH_SECRET!, salt, maxAge: -60 });
    expect(await verifyAccessToken(expired)).toBeNull();
  });

  it("rejects tampered / garbage / oversized tokens", async () => {
    const tok = await issueAccessToken("user_1", "sess_1");
    const tampered = tok.slice(0, -4) + (tok.endsWith("AAAA") ? "BBBB" : "AAAA");
    expect(await verifyAccessToken(tampered)).toBeNull();
    expect(await verifyAccessToken("not.a.jwt")).toBeNull();
    expect(await verifyAccessToken("")).toBeNull();
    expect(await verifyAccessToken("x".repeat(5000))).toBeNull();
  });
});

describe("refresh token helpers", () => {
  it("generates 256-bit base64url tokens that pass the shape check", () => {
    const a = newRefreshToken();
    const b = newRefreshToken();
    expect(a).not.toBe(b);
    expect(isWellFormedRefreshToken(a)).toBe(true);
  });
  it("stores only a SHA-256 hex digest", () => {
    const tok = newRefreshToken();
    const h = hashRefreshToken(tok);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain(tok);
    expect(hashRefreshToken(tok)).toBe(h);
  });
  it("shape check rejects anything else", () => {
    for (const bad of [undefined, null, 1, "", "short", "x".repeat(43) + "=", "a b".repeat(15)]) {
      expect(isWellFormedRefreshToken(bad)).toBe(false);
    }
  });
});

describe("request helpers", () => {
  it("reads only a well-formed Bearer header", () => {
    const mk = (h?: string) => new Request("http://x/api/mobile/sync/pull", { headers: h ? { authorization: h } : {} });
    expect(readBearer(mk("Bearer abc.def"))).toBe("abc.def");
    expect(readBearer(mk("bearer abc"))).toBe("abc");
    expect(readBearer(mk("Basic abc"))).toBeNull();
    expect(readBearer(mk("Bearer a b"))).toBeNull();
    expect(readBearer(mk())).toBeNull();
  });
  it("cleans device names", () => {
    expect(cleanDeviceName("  Pixel 7\n")).toBe("Pixel 7");
    expect(cleanDeviceName("x".repeat(100))?.length).toBe(60);
    expect(cleanDeviceName(42)).toBeNull();
    expect(cleanDeviceName("   ")).toBeNull();
  });
});
