import { describe, it, expect, vi, beforeEach } from "vitest";

// بدونِ دیتابیس: prisma ماک می‌شه — این تست فقط کلیدِ rate limit و سقفِ بدنه رو می‌سنجه.
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findFirst: vi.fn(async () => null) } },
}));
vi.mock("@/lib/errorLog", () => ({ logError: vi.fn() }));

import { verifyPasswordLogin, verifySmsTwoFactorLogin, identifierRateKey } from "@/lib/credentials";
import { readJsonBody } from "@/lib/validate";

describe("identifier rate-limit key", () => {
  beforeEach(() => vi.spyOn(console, "warn").mockImplementation(() => {}));

  it("normalizes case and whitespace (lookup is case-insensitive)", () => {
    expect(identifierRateKey("  Alice@Example.COM ")).toBe("alice@example.com");
    expect(identifierRateKey("09121234567")).toBe("09121234567");
  });

  it("login: case variants of one identifier share a single bucket", async () => {
    const base = `victim${Date.now()}`;
    const variants = [base, base.toUpperCase(), base[0].toUpperCase() + base.slice(1)];
    const results: string[] = [];
    for (let i = 0; i < 9; i++) {
      // هر تلاش از یک IPِ متفاوت — فقط سطلِ «به‌ازای شناسه» باید جلوش رو بگیره
      const r = await verifyPasswordLogin({ identifier: variants[i % variants.length], password: "x", ip: `203.0.113.${i}` });
      results.push(r.ok ? "ok" : r.reason);
    }
    expect(results.slice(0, 8).every((r) => r === "invalid")).toBe(true);
    expect(results[8]).toBe("rate_limited");
  });

  it("sms-2fa: case variants share a single bucket", async () => {
    const base = `victim2fa${Date.now()}`;
    const results: string[] = [];
    for (let i = 0; i < 11; i++) {
      const id = i % 2 ? base.toUpperCase() : base;
      const r = await verifySmsTwoFactorLogin({ identifier: id, code: "123456", ip: `198.51.100.${i}` });
      results.push(r.ok ? "ok" : r.reason);
    }
    expect(results.slice(0, 10).every((r) => r === "invalid")).toBe(true);
    expect(results[10]).toBe("rate_limited");
  });
});

describe("readJsonBody streaming cap", () => {
  it("rejects an oversized chunked body (no Content-Length) without buffering it all", async () => {
    let pulled = 0;
    const chunk = new Uint8Array(64 * 1024).fill(0x20);
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled++;
        if (pulled > 10_000) controller.close(); // ~640MB اگه تا ته خونده می‌شد
        else controller.enqueue(chunk);
      },
    });
    const req = new Request("http://localhost/api/mobile/auth/login", {
      method: "POST",
      body: stream,
      // @ts-expect-error — Node fetch برای بدنه‌ی stream این رو لازم داره
      duplex: "half",
    });
    const r = await readJsonBody(req, 8 * 1024);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(413);
    expect(pulled).toBeLessThan(10);
  });

  it("still parses a normal body, counting bytes not characters", async () => {
    const ok = await readJsonBody(new Request("http://x/", { method: "POST", body: JSON.stringify({ a: "سلام" }) }), 1024);
    expect(ok).toEqual({ ok: true, body: { a: "سلام" } });
    // ۶۰۰ حرفِ فارسی = ۱۲۰۰+ بایت > ۱۰۰۰
    const big = await readJsonBody(new Request("http://x/", { method: "POST", body: JSON.stringify({ a: "س".repeat(600) }) }), 1000);
    expect(big.ok).toBe(false);
    const empty = await readJsonBody(new Request("http://x/", { method: "POST" }), 1000);
    expect(empty).toEqual({ ok: true, body: {} });
  });
});
