import { describe, it, expect } from "vitest";
import { generateEmailOtp, hashEmailOtp, hashesMatch, EMAIL_OTP_LENGTH } from "@/lib/emailOtp";

describe("generateEmailOtp", () => {
  it("always produces a 6-digit numeric string", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateEmailOtp();
      expect(code).toMatch(/^\d{6}$/);
      expect(code.length).toBe(EMAIL_OTP_LENGTH);
    }
  });

  it("zero-pads small values instead of producing a short string", () => {
    // با ۲۰۰ نمونه، احتمالِ عملیِ اینکه حداقل یکی زیر ۱۰۰۰۰۰ باشه خیلی بالاست؛
    // این تست عمداً روی رفتارِ padStart تمرکز داره، نه فقط شانس
    const codes = Array.from({ length: 500 }, () => generateEmailOtp());
    expect(codes.every((c) => c.length === 6)).toBe(true);
  });

  it("has reasonable entropy across many samples (not a constant or narrow range)", () => {
    const codes = new Set(Array.from({ length: 500 }, () => generateEmailOtp()));
    // با ۵۰۰ نمونه از فضای ۱میلیونی، برخوردِ زیاد بعیده — اگه ژنراتور خراب
    // باشه (مثلاً همیشه یک عدد) اینجا فوراً رد می‌شه
    expect(codes.size).toBeGreaterThan(490);
  });
});

describe("hashEmailOtp / hashesMatch", () => {
  it("is deterministic for the same input", () => {
    const code = "482931";
    expect(hashEmailOtp(code)).toBe(hashEmailOtp(code));
  });

  it("produces different hashes for different codes", () => {
    expect(hashEmailOtp("111111")).not.toBe(hashEmailOtp("222222"));
  });

  it("never stores/returns the plaintext code itself", () => {
    const code = "482931";
    const hash = hashEmailOtp(code);
    expect(hash).not.toContain(code);
    expect(hash).toMatch(/^[0-9a-f]{64}$/); // sha256 hex
  });

  it("hashesMatch confirms equal hashes and rejects different ones", () => {
    const h1 = hashEmailOtp("482931");
    const h2 = hashEmailOtp("482931");
    const h3 = hashEmailOtp("111111");
    expect(hashesMatch(h1, h2)).toBe(true);
    expect(hashesMatch(h1, h3)).toBe(false);
  });

  it("hashesMatch does not throw on malformed/mismatched-length input", () => {
    expect(() => hashesMatch("not-hex", hashEmailOtp("482931"))).not.toThrow();
    expect(hashesMatch("ab", hashEmailOtp("482931"))).toBe(false);
  });
});
