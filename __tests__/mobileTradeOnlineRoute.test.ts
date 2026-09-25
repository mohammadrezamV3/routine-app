import { describe, it, expect, afterAll, beforeAll, vi } from "vitest";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";

// integration روی دیتابیسِ واقعی — /api/mobile/trade-online/*
vi.hoisted(() => {
  process.env.TRUST_PROXY_HEADERS = "1";
  process.env.NEXTAUTH_SECRET ||= "test-secret-for-mobile-auth-at-least-32-chars";
});

import { POST as login } from "@/app/api/mobile/auth/login/route";
import { GET as calendar } from "@/app/api/mobile/trade-online/calendar/route";
import { GET as prices } from "@/app/api/mobile/trade-online/market/prices/route";
import { GET as watchGet, POST as watchPost } from "@/app/api/mobile/trade-online/market/watchlist/route";
import { GET as mtGet } from "@/app/api/mobile/trade-online/metatrader/route";
import { POST as mtCode } from "@/app/api/mobile/trade-online/metatrader/code/route";
import { POST as mtRevoke } from "@/app/api/mobile/trade-online/metatrader/revoke/route";
import { POST as mtPair } from "@/app/api/mt/pair/route";
import { prisma } from "@/lib/prisma";
import { hashSecret } from "@/lib/metatrader";
import type { MobileAuthSuccess } from "@/lib/mobileApiContract";
import type {
  EconomicCalendarResponse, MarketWatchlistResponse, MtAccountsResponse, MtCodeResponse, MtLinkResponse,
} from "@/lib/mobileTradeOnlineContract";

const PASSWORD = "Correct-Horse-Battery-9";
const createdUsers: string[] = [];
const createdEvents: string[] = [];

async function makeUser(opts: { superAdmin?: boolean; trade?: boolean | "expired" } = {}) {
  const tag = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  const user = await prisma.user.create({
    data: { username: `to_${tag}`.slice(0, 20), passwordHash: await bcrypt.hash(PASSWORD, 4), market: "IRAN", isSuperAdmin: !!opts.superAdmin },
  });
  createdUsers.push(user.id);
  if (opts.trade) {
    const expiresAt = new Date(Date.now() + (opts.trade === "expired" ? -1 : 1) * 86400_000);
    await prisma.moduleAccess.create({ data: { userId: user.id, module: "TRADE", active: true, expiresAt } });
  }
  return user;
}
function req(path: string, body: unknown, token?: string, method = "POST") {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: method === "GET" ? undefined : JSON.stringify(body),
  });
}
const get = (path: string, token?: string) => req(path, null, token, "GET");
async function tokenFor(username: string) {
  const res = await login(req("/api/mobile/auth/login", { identifier: username, password: PASSWORD }));
  expect(res.status).toBe(200);
  return ((await res.json()) as MobileAuthSuccess).accessToken;
}
const makeAccount = (userId: string, name = "حساب", archived = false) =>
  prisma.tradeAccount.create({ data: { userId, name, archived } });

// رویدادهای تست با ارزِ ساختگی تا با داده‌ی واقعیِ جدول قاطی نشن
const CUR = "ZZT";
beforeAll(async () => {
  const mk = (title: string, occursAt: string, impact: "LOW" | "MEDIUM" | "HIGH", currency = CUR) =>
    prisma.economicEvent.create({
      data: { source: "TEST", externalId: `${title}-${Date.now()}-${Math.random()}`, title, country: "ZZ", currency, impact, occursAt: new Date(occursAt), actual: "3.1%", forecast: "3.0%", previous: "2.9%" },
    });
  const rows = await Promise.all([
    // ۲۱:۰۰ UTCِ ۹ ژانویه = ۰۰:۳۰ بامدادِ ۱۰ ژانویه به وقتِ تهران
    mk("ZZ Night CPI", "2031-01-09T21:00:00Z", "HIGH"),
    mk("ZZ Noon PMI", "2031-01-10T09:00:00Z", "LOW"),
    mk("ZZ Other", "2031-01-10T10:00:00Z", "MEDIUM", "USD"),
  ]);
  createdEvents.push(...rows.map((r) => r.id));
});

afterAll(async () => {
  await prisma.economicEvent.deleteMany({ where: { id: { in: createdEvents } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
  await prisma.$disconnect();
});

describe("auth + module lock", () => {
  it("401 without bearer, 403 module_locked without (or with expired) TRADE", async () => {
    expect((await calendar(get("/api/mobile/trade-online/calendar?from=2031-01-10&to=2031-01-10"))).status).toBe(401);
    expect((await mtGet(get("/api/mobile/trade-online/metatrader"))).status).toBe(401);

    for (const trade of [false, "expired"] as const) {
      const u = await makeUser({ trade });
      const t = await tokenFor(u.username!);
      const acc = await makeAccount(u.id);
      for (const res of [
        await calendar(get("/api/mobile/trade-online/calendar?from=2031-01-10&to=2031-01-10", t)),
        await prices(get("/api/mobile/trade-online/market/prices?symbols=GC=F", t)),
        await watchGet(get("/api/mobile/trade-online/market/watchlist", t)),
        await mtGet(get("/api/mobile/trade-online/metatrader", t)),
        await mtCode(req("/api/mobile/trade-online/metatrader/code", { accountId: acc.id, platform: "MT5" }, t)),
        await mtRevoke(req("/api/mobile/trade-online/metatrader/revoke", { accountId: acc.id }, t)),
      ]) {
        expect(res.status).toBe(403);
        expect(await res.json()).toEqual({ error: "module_locked" });
      }
      expect(await prisma.tradeMtLink.count({ where: { accountId: acc.id } })).toBe(0);
    }
  });
});

describe("economic calendar (from our table)", () => {
  it("filters by local day (tz), currency, impact, search; validates range", async () => {
    const u = await makeUser({ trade: true });
    const t = await tokenFor(u.username!);
    const q = (qs: string) => calendar(get(`/api/mobile/trade-online/calendar?${qs}`, t));

    let body: EconomicCalendarResponse = await (await q(`from=2031-01-10&to=2031-01-10&tz=210&currencies=${CUR}`)).json();
    expect(body.events.map((e) => e.title)).toEqual(["ZZ Night CPI", "ZZ Noon PMI"]);
    expect(body.events[0]).toMatchObject({ actual: "3.1%", forecast: "3.0%", previous: "2.9%", impact: "HIGH", occursAt: "2031-01-09T21:00:00.000Z" });
    expect(body.range.to).not.toBeNull();

    // بدونِ tz (روزِ UTC) رویدادِ نیمه‌شبِ تهران به روزِ قبل می‌افته
    body = await (await q(`from=2031-01-10&to=2031-01-10&currencies=${CUR}`)).json();
    expect(body.events.map((e) => e.title)).toEqual(["ZZ Noon PMI"]);

    body = await (await q(`from=2031-01-10&to=2031-01-10&tz=210&currencies=${CUR}&impacts=HIGH`)).json();
    expect(body.events.map((e) => e.title)).toEqual(["ZZ Night CPI"]);

    body = await (await q(`from=2031-01-10&to=2031-01-10&tz=210&q=noon`)).json();
    expect(body.events.map((e) => e.title)).toEqual(["ZZ Noon PMI"]);

    // «سایر ارزها» = بیرونِ فهرستِ ۹تایی (ZZT بله، USD نه)
    body = await (await q(`from=2031-01-10&to=2031-01-10&tz=210&other=1&q=ZZ`)).json();
    expect(body.events.map((e) => e.currency)).not.toContain("USD");

    expect((await q("from=2031-01-10")).status).toBe(400);
    expect((await q("from=2031-01-10&to=2031-12-31")).status).toBe(400); // > ۱۸۰ روز
  });
});

describe("market watchlist + prices", () => {
  it("defaults, validates against the catalog, and shares the web setting", async () => {
    const u = await makeUser({ trade: true });
    const t = await tokenFor(u.username!);
    let w: MarketWatchlistResponse = await (await watchGet(get("/api/mobile/trade-online/market/watchlist", t))).json();
    expect(w.saved).toBe(false);
    expect(w.symbols).toEqual(["GC=F", "EURUSD=X", "GBPUSD=X", "BTC-USD", "ETH-USD"]);
    expect(w.catalog.length).toBeGreaterThan(100);

    expect((await watchPost(req("/api/mobile/trade-online/market/watchlist", { symbols: ["NOPE"] }, t))).status).toBe(400);
    expect((await watchPost(req("/api/mobile/trade-online/market/watchlist", { symbols: "GC=F" }, t))).status).toBe(400);

    const res = await watchPost(req("/api/mobile/trade-online/market/watchlist", { symbols: ["EURUSD=X", "EURUSD=X", "BAD", "GC=F"] }, t));
    expect(res.status).toBe(200);
    w = await res.json();
    expect(w).toMatchObject({ saved: true, symbols: ["EURUSD=X", "GC=F"] });
    const row = await prisma.userSetting.findUnique({ where: { userId_key: { userId: u.id, key: "tradeTickerSymbols" } } });
    expect(row?.value).toEqual(["EURUSD=X", "GC=F"]);
  });

  it("prices: invalid symbols never reach upstream; shared per-user rate limit (60/min)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ chart: { result: [{ meta: { regularMarketPrice: 110, chartPreviousClose: 100 } }] } }), { status: 200 }));
    try {
      const u = await makeUser({ trade: true });
      const t = await tokenFor(u.username!);
      const sym = `ZZ${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const r1 = await prices(get(`/api/mobile/trade-online/market/prices?symbols=${sym},bad%20sym,<x>`, t));
      expect(r1.status).toBe(200);
      const body = await r1.json();
      expect(body.quotes).toEqual([{ symbol: sym, price: 110, changeAbs: 10, changePercent: 10 }]);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      let last = 200;
      for (let i = 0; i < 60; i++) last = (await prices(get(`/api/mobile/trade-online/market/prices?symbols=${sym}`, t))).status;
      expect(last).toBe(429);

      // سوپریوزر معاف (مثلِ وب)
      const admin = await makeUser({ superAdmin: true });
      const ta = await tokenFor(admin.username!);
      for (let i = 0; i < 62; i++) last = (await prices(get(`/api/mobile/trade-online/market/prices?symbols=${sym}`, ta))).status;
      expect(last).toBe(200);
    } finally {
      fetchSpy.mockRestore();
    }
  });
});

describe("metatrader", () => {
  it("lists per-account status, issues a one-time code (hash only), pairs, revokes; IDOR-safe", async () => {
    const u = await makeUser({ trade: true });
    const other = await makeUser({ trade: true });
    const t = await tokenFor(u.username!);
    const a1 = await makeAccount(u.id, "اول");
    const a2 = await makeAccount(u.id, "دوم");
    await makeAccount(u.id, "آرشیو", true);
    const foreign = await makeAccount(other.id, "غریبه");

    let list: MtAccountsResponse = await (await mtGet(get("/api/mobile/trade-online/metatrader", t))).json();
    expect(list.accounts.map((a) => a.name).sort()).toEqual(["اول", "دوم"].sort());
    expect(list.accounts.every((a) => a.link === null)).toBe(true);

    // ضدِ IDOR: حسابِ کاربرِ دیگه ۴۰۴ و هیچ اثری ندارد
    expect((await mtGet(get(`/api/mobile/trade-online/metatrader?accountId=${foreign.id}`, t))).status).toBe(404);
    expect((await mtCode(req("/api/mobile/trade-online/metatrader/code", { accountId: foreign.id, platform: "MT4" }, t))).status).toBe(404);
    expect((await mtRevoke(req("/api/mobile/trade-online/metatrader/revoke", { accountId: foreign.id }, t))).status).toBe(404);
    expect((await mtCode(req("/api/mobile/trade-online/metatrader/code", {}, t))).status).toBe(404);
    expect(await prisma.tradeMtLink.count({ where: { accountId: foreign.id } })).toBe(0);

    const cr = await mtCode(req("/api/mobile/trade-online/metatrader/code", { accountId: a1.id, platform: "MT5", password: "secret" }, t));
    expect(cr.status).toBe(200);
    const code: MtCodeResponse = await cr.json();
    expect(code.code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(code.link).toMatchObject({ platform: "MT5", connected: false });
    expect(JSON.stringify(code.link)).not.toContain(code.code);
    const stored = await prisma.tradeMtLink.findUnique({ where: { accountId: a1.id } });
    expect(stored?.pairingHash).toBe(hashSecret(code.code));
    expect(JSON.stringify(stored)).not.toContain(code.code);
    expect(JSON.stringify(stored)).not.toContain("secret");

    // کد دیگه در GET برنمی‌گرده
    const one: MtLinkResponse = await (await mtGet(get(`/api/mobile/trade-online/metatrader?accountId=${a1.id}`, t))).json();
    expect(JSON.stringify(one)).not.toContain(code.code);

    // EA جفت می‌شه → وضعیت در فهرست connected
    const pr = await mtPair(req("/api/mt/pair", { code: code.code, platform: "MT5", accountLogin: "12345", broker: "B" }));
    expect(pr.status).toBe(200);
    list = await (await mtGet(get("/api/mobile/trade-online/metatrader", t))).json();
    const s1 = list.accounts.find((a) => a.accountId === a1.id)!;
    expect(s1.link).toMatchObject({ connected: true, accountLogin: "12345", brokerName: "B" });
    expect(list.accounts.find((a) => a.accountId === a2.id)!.link).toBeNull();
    expect(JSON.stringify(list)).not.toMatch(/tokenHash|pairingHash/);

    const rv = await mtRevoke(req("/api/mobile/trade-online/metatrader/revoke", { accountId: a1.id }, t));
    expect(rv.status).toBe(200);
    const after = await prisma.tradeMtLink.findUnique({ where: { accountId: a1.id } });
    expect(after).toMatchObject({ tokenHash: null, pairingHash: null });
    expect(after?.revokedAt).not.toBeNull();
    const again: MtLinkResponse = await (await mtGet(get(`/api/mobile/trade-online/metatrader?accountId=${a1.id}`, t))).json();
    expect(again.link?.connected).toBe(false);
  });

  it("rate-limits code generation (20 / 10 min)", async () => {
    const u = await makeUser({ trade: true });
    const t = await tokenFor(u.username!);
    const a = await makeAccount(u.id);
    let last = 200;
    for (let i = 0; i < 21; i++) {
      last = (await mtCode(req("/api/mobile/trade-online/metatrader/code", { accountId: a.id, platform: "MT4" }, t))).status;
    }
    expect(last).toBe(429);
  });
});
