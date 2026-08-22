import { describe, it, expect } from "vitest";
import { checkRateLimit } from "@/lib/rateLimit";

describe("checkRateLimit", () => {
  it("allows requests up to the limit, then blocks", () => {
    const key = `test:${Math.random()}`;
    expect(checkRateLimit(key, 3, 60_000)).toBe(true);
    expect(checkRateLimit(key, 3, 60_000)).toBe(true);
    expect(checkRateLimit(key, 3, 60_000)).toBe(true);
    // چهارمین درخواست باید رد بشه — سقف ۳ بود
    expect(checkRateLimit(key, 3, 60_000)).toBe(false);
  });

  it("enforces 'at most 1 request per 60s' for the email-otp request pattern", () => {
    const key = `email-otp-req-email:test-${Math.random()}@example.com`;
    expect(checkRateLimit(key, 1, 60_000)).toBe(true);
    // درخواستِ دوم توی همون بازه باید رد بشه
    expect(checkRateLimit(key, 1, 60_000)).toBe(false);
    expect(checkRateLimit(key, 1, 60_000)).toBe(false);
  });

  it("does not let two different keys share the same bucket", () => {
    const keyA = `test:a:${Math.random()}`;
    const keyB = `test:b:${Math.random()}`;
    expect(checkRateLimit(keyA, 1, 60_000)).toBe(true);
    // سقفِ keyA پر شد، ولی keyB باید کاملاً مستقل باشه
    expect(checkRateLimit(keyB, 1, 60_000)).toBe(true);
    expect(checkRateLimit(keyA, 1, 60_000)).toBe(false);
  });

  it("resets after the window expires", async () => {
    const key = `test:window:${Math.random()}`;
    expect(checkRateLimit(key, 1, 50)).toBe(true);
    expect(checkRateLimit(key, 1, 50)).toBe(false);
    await new Promise((r) => setTimeout(r, 80));
    expect(checkRateLimit(key, 1, 50)).toBe(true);
  });
});
