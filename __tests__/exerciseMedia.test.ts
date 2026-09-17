import { describe, it, expect } from "vitest";
import { MAX_MEDIA_DATA_URL_LENGTH, checkMediaDataUrl, mediaKey } from "@/lib/exerciseMedia";
import { EXERCISE_CATALOG } from "@/lib/exerciseCatalog";

// عکسِ حرکات از فرمِ ادمین می‌آید و مستقیم داخلِ یک ستونِ String می‌نشیند و
// بعد در مرورگرِ کاربر رندر می‌شود — پس همین لایه باید جلوی محتوای
// اسکریپت‌پذیر و فایلِ بی‌سقف را بگیرد.

describe("checkMediaDataUrl", () => {
  it("فرمت‌های عکسِ مجاز را می‌پذیرد", () => {
    for (const mime of ["jpeg", "png", "webp"]) {
      expect(checkMediaDataUrl(`data:image/${mime};base64,AAAA`)).toEqual({ ok: true });
    }
  });

  it("SVG را رد می‌کند — می‌تواند اسکریپت داشته باشد", () => {
    const r = checkMediaDataUrl("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=");
    expect(r.ok).toBe(false);
  });

  it("هرچیزی که عکس نیست رد می‌شود", () => {
    expect(checkMediaDataUrl("javascript:alert(1)").ok).toBe(false);
    expect(checkMediaDataUrl("https://example.com/a.jpg").ok).toBe(false);
    expect(checkMediaDataUrl("data:text/html;base64,PHNjcmlwdD4=").ok).toBe(false);
    expect(checkMediaDataUrl(null).ok).toBe(false);
    expect(checkMediaDataUrl(123).ok).toBe(false);
  });

  it("عکسِ بزرگ‌تر از سقف ۴۱۳ می‌گیرد، نه ۴۰۰", () => {
    const big = "data:image/jpeg;base64," + "A".repeat(MAX_MEDIA_DATA_URL_LENGTH);
    const r = checkMediaDataUrl(big);
    expect(r).toMatchObject({ ok: false, status: 413 });
  });
});

describe("mediaKey", () => {
  it("«ي» عربی و «ک» عربی و نیم‌فاصله را یک‌دست می‌کند", () => {
    expect(mediaKey("پرس سينه هالتر")).toBe(mediaKey("پرس سینه هالتر"));
    expect(mediaKey("كشش")).toBe(mediaKey("کشش"));
    expect(mediaKey("  زیربغل  ")).toBe(mediaKey("زیربغل"));
  });

  it("برای هر حرکتِ کاتالوگ کلیدی یکتا می‌سازد", () => {
    const keys = EXERCISE_CATALOG.map((e) => mediaKey(e.name));
    // کلیدِ تکراری یعنی دو حرکتِ متفاوت یک عکس می‌گیرند — ستونِ unique هم
    // همان لحظه ثبتِ دومی را رد می‌کند.
    expect(new Set(keys).size).toBe(keys.length);
  });
});
