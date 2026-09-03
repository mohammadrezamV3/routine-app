import { describe, it, expect } from "vitest";
import { tuneDatabaseUrl } from "@/lib/dbUrl";

const EMPTY = {} as Record<string, string | undefined>;

describe("tuneDatabaseUrl", () => {
  it("پارامترهای پول را به URL بدون query اضافه می‌کند", () => {
    const out = tuneDatabaseUrl("postgresql://u:p@db:5432/routine", EMPTY)!;
    expect(out).toContain("?connection_limit=10");
    expect(out).toContain("&pool_timeout=20");
    expect(out).toContain("&connect_timeout=10");
  });

  it("وقتی URL از قبل query دارد با & ادامه می‌دهد (نه ?)", () => {
    const out = tuneDatabaseUrl("postgresql://u:p@db:5432/routine?schema=public", EMPTY)!;
    expect(out.startsWith("postgresql://u:p@db:5432/routine?schema=public&")).toBe(true);
    expect(out.match(/\?/g)).toHaveLength(1);
  });

  it("مقدارِ صریحِ اپراتور را بازنویسی نمی‌کند", () => {
    const raw = "postgresql://u:p@db:5432/routine?connection_limit=3&pool_timeout=5&connect_timeout=2";
    expect(tuneDatabaseUrl(raw, EMPTY)).toBe(raw);
  });

  it("فقط پارامترِ جاافتاده را اضافه می‌کند", () => {
    const out = tuneDatabaseUrl("postgresql://u:p@db:5432/r?connection_limit=25", EMPTY)!;
    expect(out).toContain("connection_limit=25");
    expect(out).not.toContain("connection_limit=10");
    expect(out).toContain("pool_timeout=20");
  });

  it("از env قابل تنظیم است", () => {
    const out = tuneDatabaseUrl("postgresql://u:p@db:5432/r", {
      DB_CONNECTION_LIMIT: "25",
      DB_POOL_TIMEOUT: "30",
      DB_CONNECT_TIMEOUT: "5",
    })!;
    expect(out).toContain("connection_limit=25");
    expect(out).toContain("pool_timeout=30");
    expect(out).toContain("connect_timeout=5");
  });

  // مهم‌ترین تضمین: رمزِ دیتابیس داخلِ همین رشته‌ست. اگه روزی این تابع به
  // `new URL(...).toString()` تغییر کنه، کاراکترهای خاصِ رمز دوباره encode
  // می‌شن و اتصال بی‌صدا می‌شکنه — این تست دقیقاً جلوی همون رو می‌گیره.
  it("رمزِ عبورِ دارای کاراکترِ خاص را دست‌نخورده نگه می‌دارد", () => {
    const raw = "postgresql://routine:aB%23c%2Fd%3Ae!f@db:5432/routine";
    const out = tuneDatabaseUrl(raw, EMPTY)!;
    expect(out.startsWith(raw)).toBe(true);
  });

  it("URLِ خالی/undefined را همان‌طور برمی‌گرداند", () => {
    expect(tuneDatabaseUrl(undefined, EMPTY)).toBeUndefined();
    expect(tuneDatabaseUrl("", EMPTY)).toBe("");
  });
});
