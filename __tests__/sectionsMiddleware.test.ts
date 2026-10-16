import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// middleware.ts و lib/authCookies.ts به env NEXT_PUBLIC_SECTION_BASE_DOMAIN وابسته‌ان؛ هر تست ماژول
// رو تازه می‌خونه.
async function load(base: string | null) {
  vi.resetModules();
  if (base === null) delete process.env.NEXT_PUBLIC_SECTION_BASE_DOMAIN;
  else process.env.NEXT_PUBLIC_SECTION_BASE_DOMAIN = base;
  return import("@/middleware");
}

function req(url: string, init: { method?: string; headers?: Record<string, string> } = {}) {
  return new NextRequest(url, { method: init.method ?? "GET", headers: init.headers });
}

const SAVED = { ...process.env };
afterEach(() => {
  process.env = { ...SAVED };
});

const sectionHeader = (res: Response) => res.headers.get("x-middleware-request-x-arion-section");
const cookieOf = (res: Response) => res.headers.get("set-cookie") || "";

describe("middleware: تعویض خودکار بخش بدون عوض‌شدن دامنه", () => {
  it("مسیر مال بخش دیگه روی زیردامنه ریدایرکت نمی‌شه: بخش صاحب مسیر + کوکی host-only", async () => {
    const { middleware } = await load("arionapp.ir");
    const res = middleware(req("https://routine.arionapp.ir/trade/journal?x=1", { headers: { host: "routine.arionapp.ir" } }));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(sectionHeader(res)).toBe("trade");
    const c = cookieOf(res);
    expect(c).toContain("arion_section=trade");
    expect(c).toContain("Path=/");
    expect(c).toMatch(/samesite=lax/i);
    expect(c).toMatch(/secure/i);
    expect(c).not.toMatch(/domain/i);
  });

  it("چند صاحب (sleep): اولین صاحب انتخاب می‌شه", async () => {
    const { middleware } = await load("arionapp.ir");
    const res = middleware(req("https://trade.arionapp.ir/sleep", { headers: { host: "trade.arionapp.ir" } }));
    expect(sectionHeader(res)).toBe("routine");
    expect(cookieOf(res)).toContain("arion_section=routine");
  });

  it("مسیر مشترک و مسیر خود بخش کوکی نمی‌ذاره و بخش همون می‌مونه", async () => {
    const { middleware } = await load("arionapp.ir");
    for (const [host, path, sec] of [["trade.arionapp.ir", "/dashboard", "trade"], ["trade.arionapp.ir", "/trade", "trade"], ["workout.arionapp.ir", "/sleep", "workout"]]) {
      const res = middleware(req(`https://${host}${path}`, { headers: { host } }));
      expect(res.status).toBe(200);
      expect(sectionHeader(res)).toBe(sec);
      expect(cookieOf(res)).toBe("");
    }
  });

  it("کوکی معتبر روی میزبان غالبه: روی trade. با کوکی workout هدر workout", async () => {
    const { middleware } = await load("arionapp.ir");
    const res = middleware(req("https://trade.arionapp.ir/dashboard", { headers: { host: "trade.arionapp.ir", cookie: "arion_section=workout" } }));
    expect(sectionHeader(res)).toBe("workout");
    expect(cookieOf(res)).toBe("");
  });

  it("روی دامنه‌ی اصلی هم کوکی بخش اعمال می‌شه", async () => {
    const { middleware } = await load("arionapp.ir");
    const res = middleware(req("https://arionapp.ir/dashboard", { headers: { host: "arionapp.ir", cookie: "arion_section=routine" } }));
    expect(sectionHeader(res)).toBe("routine");
  });

  it("کوکی نامعتبر نادیده گرفته می‌شه و بخش میزبان می‌مونه", async () => {
    const { middleware } = await load("arionapp.ir");
    const res = middleware(req("https://trade.arionapp.ir/dashboard", { headers: { host: "trade.arionapp.ir", cookie: "arion_section=hacker" } }));
    expect(sectionHeader(res)).toBe("trade");
    const apex = middleware(req("https://arionapp.ir/dashboard", { headers: { host: "arionapp.ir", cookie: "arion_section=hacker" } }));
    expect(sectionHeader(apex)).toBeNull();
  });

  it("کوکی بخش بر مسیر بسته اثر می‌ذاره: با کوکی routine، مسیر /exercise به workout سوییچ می‌شه", async () => {
    const { middleware } = await load("arionapp.ir");
    const res = middleware(req("https://trade.arionapp.ir/exercise", { headers: { host: "trade.arionapp.ir", cookie: "arion_section=routine" } }));
    expect(res.status).toBe(200);
    expect(sectionHeader(res)).toBe("workout");
    expect(cookieOf(res)).toContain("arion_section=workout");
  });

  it("پیش‌واکشی بخش رو عوض نمی‌کنه", async () => {
    const { middleware } = await load("arionapp.ir");
    const res = middleware(req("https://routine.arionapp.ir/trade", { headers: { host: "routine.arionapp.ir", "next-router-prefetch": "1" } }));
    expect(sectionHeader(res)).toBe("routine");
    expect(cookieOf(res)).toBe("");
  });

  it("هرگز روی API و متدهای غیر GET/HEAD عوض نمی‌کنه، ولی هدر از کوکی ساخته می‌شه", async () => {
    const { middleware } = await load("arionapp.ir");
    const api = middleware(req("https://routine.arionapp.ir/api/trade/accounts", { headers: { host: "routine.arionapp.ir", cookie: "arion_section=trade" } }));
    expect(api.status).toBe(200);
    expect(sectionHeader(api)).toBe("trade");
    expect(cookieOf(api)).toBe("");
    const post = middleware(req("https://routine.arionapp.ir/trade", { method: "POST", headers: { host: "routine.arionapp.ir" } }));
    expect(post.status).toBe(200);
    expect(sectionHeader(post)).toBe("routine");
    expect(cookieOf(post)).toBe("");
  });

  it("روی http (تست محلی) Secure نمی‌ذاره و پورت/دامنه دست نمی‌خوره", async () => {
    const { middleware } = await load("localhost");
    const res = middleware(req("http://routine.localhost:3000/exercise", { headers: { host: "routine.localhost:3000" } }));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(sectionHeader(res)).toBe("workout");
    expect(cookieOf(res)).not.toMatch(/secure/i);
  });

  it("x-forwarded-host و x-forwarded-proto اولویت دارن", async () => {
    const { middleware } = await load("arionapp.ir");
    const res = middleware(
      req("http://127.0.0.1:3000/exercise", {
        headers: { host: "127.0.0.1:3000", "x-forwarded-host": "routine.arionapp.ir", "x-forwarded-proto": "https" },
      }),
    );
    expect(sectionHeader(res)).toBe("workout");
    expect(cookieOf(res)).toMatch(/secure/i);
  });

  it("بدون env: میزبان بخشی نیست ولی کوکی کار می‌کنه (تعویض روی یک دامنه)", async () => {
    const { middleware } = await load(null);
    const plain = middleware(req("https://arionapp.ir/dashboard", { headers: { host: "arionapp.ir" } }));
    expect(sectionHeader(plain)).toBeNull();
    const free = middleware(req("https://arionapp.ir/trade", { headers: { host: "arionapp.ir" } }));
    expect(free.status).toBe(200);
    expect(sectionHeader(free)).toBeNull();
    expect(cookieOf(free)).toBe("");
    const withCookie = middleware(req("https://arionapp.ir/exercise", { headers: { host: "arionapp.ir", cookie: "arion_section=trade" } }));
    expect(sectionHeader(withCookie)).toBe("workout");
    expect(cookieOf(withCookie)).toContain("arion_section=workout");
  });
});

describe("middleware: ریدایرکت سئوی دامنه‌ی اصلی", () => {
  it("صفحه‌ی فرود سئو روی دامنه‌ی اصلی به زیردامنه می‌ره، مسیرهای دیگه نه", async () => {
    const { middleware } = await load("arionapp.ir");
    const a = middleware(req("https://arionapp.ir/trading-journal", { headers: { host: "arionapp.ir" } }));
    expect(a.status).toBe(308);
    expect(a.headers.get("location")).toBe("https://trade.arionapp.ir/trading-journal");
    const b = middleware(req("https://arionapp.ir/trade", { headers: { host: "arionapp.ir" } }));
    expect(b.status).toBe(200);
  });

  it("روی زیردامنه صفحه‌ی فرود بخش دیگه ریدایرکت نمی‌شه", async () => {
    const { middleware } = await load("arionapp.ir");
    const res = middleware(req("https://routine.arionapp.ir/trading-journal", { headers: { host: "routine.arionapp.ir" } }));
    expect(res.status).toBe(200);
    expect(sectionHeader(res)).toBe("trade");
  });

  it("پروتکل و پورت حفظ می‌شه (تست محلی)", async () => {
    const { middleware } = await load("localhost");
    const res = middleware(req("http://localhost:3000/bodybuilding-program", { headers: { host: "localhost:3000" } }));
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("http://workout.localhost:3000/bodybuilding-program");
  });

  it("میزبان ناشناس هیچ‌وقت ریدایرکت نمی‌شه", async () => {
    const { middleware } = await load("arionapp.ir");
    const res = middleware(req("http://10.0.0.5:3000/trading-journal", { headers: { host: "10.0.0.5:3000" } }));
    expect(res.status).toBe(200);
  });

  it("بدون env هیچ ریدایرکتی نیست", async () => {
    const { middleware } = await load(null);
    const res = middleware(req("https://arionapp.ir/trading-journal", { headers: { host: "arionapp.ir" } }));
    expect(res.status).toBe(200);
  });
});

describe("middleware: هدر بخش و آیکون", () => {
  it("هدر x-arion-section کلاینت پاک و از میزبان ساخته می‌شه", async () => {
    const { middleware } = await load("arionapp.ir");
    const res = middleware(req("https://trade.arionapp.ir/dashboard", { headers: { host: "trade.arionapp.ir", "x-arion-section": "workout" } }));
    expect(res.headers.get("x-middleware-request-x-arion-section")).toBe("trade");
    // کوکی هم نمی‌تونه هدر جعلی رو جایگزین کنه: فقط مقدار معتبر کوکی اعمال می‌شه
    const apex = middleware(req("https://arionapp.ir/dashboard", { headers: { host: "arionapp.ir", "x-arion-section": "workout" } }));
    // دامنه‌ی اصلی: هدر جعلی حذف می‌شه (override ست‌شده خالی نیست)
    expect(apex.headers.get("x-middleware-request-x-arion-section")).toBeNull();
    expect(apex.headers.get("x-middleware-override-headers") || "").not.toContain("x-arion-section");
  });

  it("آیکون‌ها روی زیردامنه rewrite می‌شن و روی دامنه‌ی اصلی نه", async () => {
    const { middleware } = await load("arionapp.ir");
    const icon = middleware(req("https://trade.arionapp.ir/icon.png?abc", { headers: { host: "trade.arionapp.ir" } }));
    expect(icon.headers.get("x-middleware-rewrite")).toContain("/images/sections/app/trade-256.png");
    const apple = middleware(req("https://workout.arionapp.ir/apple-touch-icon-precomposed.png", { headers: { host: "workout.arionapp.ir" } }));
    expect(apple.headers.get("x-middleware-rewrite")).toContain("/images/sections/app/workout-180.png");
    const apex = middleware(req("https://arionapp.ir/icon.png", { headers: { host: "arionapp.ir" } }));
    expect(apex.headers.get("x-middleware-rewrite")).toBeNull();
    // هویت اپ نصب‌شده تابع میزبانه، نه کوکی بخش
    const cookied = middleware(req("https://trade.arionapp.ir/icon.png", { headers: { host: "trade.arionapp.ir", cookie: "arion_section=workout" } }));
    expect(cookied.headers.get("x-middleware-rewrite")).toContain("/images/sections/app/trade-256.png");
  });
});

describe("middleware: CSRF روی API", () => {
  it("origin زیردامنه‌ی خودی پذیرفته می‌شه، بیگانه رد می‌شه", async () => {
    const { middleware } = await load("arionapp.ir");
    const ok = middleware(req("https://arionapp.ir/api/settings/x", { method: "POST", headers: { host: "arionapp.ir", origin: "https://trade.arionapp.ir" } }));
    expect(ok.status).toBe(200);
    const bad = middleware(req("https://arionapp.ir/api/settings/x", { method: "POST", headers: { host: "arionapp.ir", origin: "https://evil.example" } }));
    expect(bad.status).toBe(403);
  });
});

describe("کوکی نشست مشترک", () => {
  beforeEach(() => {
    delete process.env.AUTH_COOKIE_DOMAIN;
  });

  it("دامنه از base یا AUTH_COOKIE_DOMAIN، و روی localhost هیچ", async () => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_SECTION_BASE_DOMAIN = "arionapp.ir";
    let m = await import("@/lib/authCookies");
    expect(m.sessionCookieDomain()).toBe(".arionapp.ir");
    process.env.AUTH_COOKIE_DOMAIN = "example.org";
    expect(m.sessionCookieDomain()).toBe(".example.org");
    delete process.env.AUTH_COOKIE_DOMAIN;
    vi.resetModules();
    process.env.NEXT_PUBLIC_SECTION_BASE_DOMAIN = "localhost";
    m = await import("@/lib/authCookies");
    expect(m.sessionCookieDomain()).toBeUndefined();
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_SECTION_BASE_DOMAIN;
    m = await import("@/lib/authCookies");
    expect(m.sessionCookieDomain()).toBeUndefined();
  });

  it("برای کوکی نشست دامنه‌دار نسخه‌ی host-only منقضی‌کننده می‌سازه و بقیه رو دست نمی‌زنه", async () => {
    const m = await import("@/lib/authCookies");
    const out = m.legacyCookieCleanupHeaders([
      "__Secure-next-auth.session-token=abc; Path=/; Expires=Fri, 01 Jan 2027 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax; Domain=.arionapp.ir",
      "__Host-next-auth.csrf-token=x; Path=/; HttpOnly; Secure; SameSite=Lax",
      "__Secure-next-auth.callback-url=y; Path=/; HttpOnly; Secure; SameSite=Lax; Domain=.arionapp.ir",
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatch(/^__Secure-next-auth\.session-token=; Path=\/; .*Max-Age=0.*Secure/);
    expect(out[0]).not.toMatch(/domain/i);
  });

  it("withLegacyCookieCleanup پاسخ بدون دامنه‌ی مشترک رو عوض نمی‌کنه", async () => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_SECTION_BASE_DOMAIN;
    const m = await import("@/lib/authCookies");
    const r = new Response("x", { headers: { "set-cookie": "next-auth.session-token=a; Path=/; Domain=.x.com" } });
    expect(m.withLegacyCookieCleanup(r).headers.getSetCookie()).toHaveLength(1);
  });
});
