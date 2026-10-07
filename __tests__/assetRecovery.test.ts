import { describe, it, expect } from "vitest";
import {
  canAutoReload, nextGuard, isChunkErrorLike, isStaticAssetUrl, isGoodCssResponse, warmableUrls,
  MAX_RELOADS, MIN_GAP_MS, RELOAD_WINDOW_MS,
} from "@/lib/assetRecovery";

describe("نگهبان ریلود خودکار", () => {
  it("بدون سابقه اجازه می‌ده", () => {
    expect(canAutoReload(null, 1000)).toBe(true);
    expect(canAutoReload("خراب", 1000)).toBe(true);
  });
  it("دو ریلود پشت‌سرهم در یک پنجره بیشتر نیست و حلقه نمی‌شه", () => {
    let raw: string | null = null;
    let now = 1_000_000;
    let count = 0;
    for (let i = 0; i < 30; i++) {
      if (canAutoReload(raw, now)) { raw = nextGuard(raw, now); count++; }
      now += MIN_GAP_MS + 1;
    }
    expect(count).toBe(MAX_RELOADS);
  });
  it("حداقل فاصله‌ی بین دو ریلود رعایت می‌شه", () => {
    const raw = nextGuard(null, 5000);
    expect(canAutoReload(raw, 5000 + MIN_GAP_MS - 1)).toBe(false);
    expect(canAutoReload(raw, 5000 + MIN_GAP_MS)).toBe(true);
  });
  it("بعد از تموم‌شدن پنجره دوباره مجازه", () => {
    let raw = nextGuard(null, 0);
    raw = nextGuard(raw, MIN_GAP_MS + 1);
    expect(canAutoReload(raw, MIN_GAP_MS + 2 + 1000)).toBe(false);
    expect(canAutoReload(raw, RELOAD_WINDOW_MS + 10)).toBe(true);
  });
});

describe("تشخیص خطای چانک", () => {
  it("نام و پیام‌های شناخته‌شده", () => {
    expect(isChunkErrorLike({ name: "ChunkLoadError", message: "x" })).toBe(true);
    expect(isChunkErrorLike(new Error("Loading chunk 123 failed.\n(error: /_next/static/chunks/a.js)"))).toBe(true);
    expect(isChunkErrorLike(new Error("Loading CSS chunk app/weekly/page failed."))).toBe(true);
    expect(isChunkErrorLike("Failed to fetch dynamically imported module: x")).toBe(true);
  });
  it("خطاهای معمولی نه", () => {
    expect(isChunkErrorLike(new Error("undefined is not a function"))).toBe(false);
    expect(isChunkErrorLike(null)).toBe(false);
    expect(isChunkErrorLike(undefined)).toBe(false);
  });
});

describe("آدرس دارایی و پاسخ CSS", () => {
  const origin = "https://arionapp.ir";
  it("فقط /_next/static/ همین دامنه", () => {
    expect(isStaticAssetUrl("https://arionapp.ir/_next/static/css/a.css", origin)).toBe(true);
    expect(isStaticAssetUrl("/_next/static/chunks/a.js", origin)).toBe(true);
    expect(isStaticAssetUrl("https://evil.com/_next/static/css/a.css", origin)).toBe(false);
    expect(isStaticAssetUrl("/images/a.png", origin)).toBe(false);
    expect(isStaticAssetUrl(null, origin)).toBe(false);
  });
  it("پاسخ CSS سالم", () => {
    expect(isGoodCssResponse(200, "text/css; charset=UTF-8")).toBe(true);
    expect(isGoodCssResponse(200, "text/html")).toBe(false);
    expect(isGoodCssResponse(404, "text/css")).toBe(false);
    expect(isGoodCssResponse(200, null)).toBe(false);
  });
  it("پیش‌گرم فقط فونت و CSS همین دامنه", () => {
    const urls = warmableUrls([
      "https://arionapp.ir/_next/static/media/e4af272ccee01ff0-s.p.woff2",
      "https://arionapp.ir/_next/static/css/b2ac1c2f3c9dcb2a.css",
      "https://arionapp.ir/_next/static/chunks/main-abc.js",
      "https://other.com/_next/static/media/x.woff2",
      "https://arionapp.ir/api/me",
    ], origin);
    expect(urls).toEqual(["/_next/static/media/e4af272ccee01ff0-s.p.woff2", "/_next/static/css/b2ac1c2f3c9dcb2a.css"]);
  });
});
