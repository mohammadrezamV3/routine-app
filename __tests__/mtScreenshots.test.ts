import { describe, it, expect, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashSecret, MT_SHOT_CAPTION } from "@/lib/metatrader";
import { parseMtShotBody, planShotPlacement } from "@/lib/mtScreenshots";
import { POST as shotPOST } from "@/app/api/mt/screenshot/route";
import { POST as syncPOST } from "@/app/api/mt/sync/route";
import { makeUser, cleanupUsers } from "./helpers/mentorTestUtils";
import { readFileSync } from "fs";
import { join } from "path";
import {
  EA_LATEST_VERSION, cleanShotError, isEaOutdated, normalizeEaShotReport, normalizeEaVersion, shotErrorIsCurrent,
} from "@/lib/mtShotDiag";

// زنجیره‌ی اسکرین اکسپرت تا ژورنال: بدنه‌ی واقعی اکسپرت (با خط‌شکن base64)،
// اسکرین قبل از معامله، و اینکه تصویر دستی کاربر هیچ‌وقت جایگزین نمی‌شه.

const PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const mimeWrap = (s: string) => s.match(/.{1,76}/g)!.join("\r\n");
// اسکرین «بزرگ»: PNG واقعی + بایت اضافه تا base64 چند خط بشه
const BIG_B64 = Buffer.concat([Buffer.from(PNG_B64, "base64"), Buffer.alloc(400, 7)]).toString("base64");

describe("parseMtShotBody", () => {
  it("base64 با CRLF (سبک MIME) که خام لای JSON اومده رد نمی‌شه", () => {
    const longB64 = BIG_B64;
    const raw = `{"ticket":"1001","kind":"entry","image":"data:image/png;base64,${mimeWrap(longB64)}"}`;
    expect(() => JSON.parse(raw)).toThrow();
    const r = parseMtShotBody(raw);
    expect(r).toEqual({ ticket: "1001", kind: "entry", image: `data:image/png;base64,${longB64}` });
  });

  it("نوع/تیکت/فرمت نامعتبر و حجم زیاد", () => {
    expect(parseMtShotBody("not json")).toBe("invalid");
    expect(parseMtShotBody(`{"ticket":"1","kind":"x","image":"data:image/png;base64,${PNG_B64}"}`)).toBe("invalid");
    expect(parseMtShotBody(`{"ticket":"","kind":"entry","image":"data:image/png;base64,${PNG_B64}"}`)).toBe("invalid");
    expect(parseMtShotBody(`{"ticket":"1","kind":"exit","image":"data:image/svg+xml;base64,${PNG_B64}"}`)).toBe("invalid image");
    expect(parseMtShotBody(`{"ticket":"1","kind":"exit","image":"data:image/png;base64,<script>"}`)).toBe("invalid image");
    expect(parseMtShotBody(`{"ticket":"1","kind":"exit","image":"data:image/png;base64,${"A".repeat(1_000_000)}"}`)).toBe("too large");
  });
});

describe("parseMtShotBody — بایت‌های اضافه‌ی ترمینال", () => {
  it("NUL پایانی و BOM باعث رد نمی‌شن", () => {
    const json = `{"ticket":"77","kind":"entry","image":"data:image/png;base64,${PNG_B64}"}`;
    expect(parseMtShotBody(`${json}\u0000`)).toMatchObject({ ticket: "77", kind: "entry" });
    expect(parseMtShotBody(`\uFEFF${json}\u0000\u0000`)).toMatchObject({ ticket: "77" });
  });
});

describe("mtShotDiag", () => {
  it("مقایسه‌ی نسخه و نرمال‌سازی", () => {
    expect(EA_LATEST_VERSION).toBe("1.43");
    expect(isEaOutdated(null)).toBe(true);
    expect(isEaOutdated("1.41")).toBe(true);
    expect(isEaOutdated("1.9")).toBe(true);
    expect(isEaOutdated("1.42")).toBe(true);
    expect(isEaOutdated("1.43")).toBe(false);
    expect(isEaOutdated("2.0")).toBe(false);
    expect(normalizeEaVersion("1.43")).toBe("1.43");
    expect(normalizeEaVersion("<b>")).toBeNull();
  });

  it("گزارش اسکرین اکسپرت فقط ASCII کوتاه نگه می‌داره", () => {
    expect(normalizeEaShotReport({ on: false, err: "" })).toEqual({ enabled: false, error: null });
    expect(normalizeEaShotReport({ on: true, err: "chart_open:EURUSD:4105\r\n<x>" + "a".repeat(300) }).error!.length).toBe(120);
    expect(cleanShotError("خطا upload:-1:5203")).toBe("upload:-1:5203");
    expect(normalizeEaShotReport("x")).toEqual({ enabled: null, error: null });
  });

  it("خطا فقط وقتی بعد از آخرین اسکرین رسیده نشون داده می‌شه", () => {
    expect(shotErrorIsCurrent(null, null)).toBe(false);
    expect(shotErrorIsCurrent("2026-10-02T10:00:00Z", null)).toBe(true);
    expect(shotErrorIsCurrent("2026-10-02T10:00:00Z", "2026-10-02T11:00:00Z")).toBe(false);
    expect(shotErrorIsCurrent("2026-10-02T12:00:00Z", "2026-10-02T11:00:00Z")).toBe(true);
  });
});

// قرارداد فایل‌های اکسپرت قابل دانلود: چیزهایی که اگه بشکنن هیچ اسکرینی نمی‌رسه
describe("سورس اکسپرت (public/ea)", () => {
  const read = (f: string) => readFileSync(join(process.cwd(), "public/ea", f), "utf8");
  for (const f of ["Arion-MT5.mq5", "Arion-MT4.mq4"]) {
    const src = read(f);
    it(`${f}: نسخه با سایت یکیه و همون نسخه گزارش می‌شه`, () => {
      expect(src).toContain(`#property version   "${EA_LATEST_VERSION}"`);
      expect(src).toContain(`#define EA_VERSION "${EA_LATEST_VERSION}"`);
      expect(src).toContain('",\\"eaVersion\\":\\"" + EA_VERSION');
    });
    it(`${f}: اسکرین پیش‌فرض روشنه و بدنه بدون NUL و خط‌شکن base64 فرستاده می‌شه`, () => {
      expect(src).toMatch(/input bool\s+SendScreenshots\s*=\s*true;/);
      expect(src).toMatch(/StringToCharArray\(body, post, 0, WHOLE_ARRAY, CP_UTF8\) - 1;[\s\S]*ArrayResize\(post, len\)/);
      expect(src).toContain('StringReplace(img, "\\r", "");');
      expect(src).toContain('StringReplace(img, "\\n", "");');
      expect(src).toMatch(/\/api\/mt\/screenshot",\s*\n\s*"Content-Type: application\/json\\r\\nAuthorization: Bearer "/);
    });
    it(`${f}: ظاهر چارت اسکرین از چارت کاربر کپی می‌شه، نه تمپلیت (تا اکسپرت دوباره نشینه)`, () => {
      expect(src).toContain("CopyChartLook(src, ch);");
      expect(src).toContain("SHOT_COPY(CHART_COLOR_BACKGROUND);");
      expect(src).toContain("SHOT_COPY(CHART_COLOR_CANDLE_BULL);");
      expect(src).not.toContain("ChartApplyTemplate");
      expect(src).not.toContain("ChartSaveTemplate");
    });
    it(`${f}: 413 اول با اندازه‌ی کوچک‌تر دوباره گرفته می‌شه و صف بعد از ری‌استارت برمی‌گرده`, () => {
      const i413 = src.indexOf('status == 413 && StringFind(g_shotSmall');
      const i400 = src.indexOf("status == 400 || status == 413");
      expect(i413).toBeGreaterThan(0);
      expect(i400).toBeGreaterThan(i413);
      expect(src).toContain('FileFindFirst("arion_shot_*.png", name)');
      expect(src).toContain('"arion_shots_v2.txt"');
      expect(src).toContain('",\\"shots\\":{\\"on\\":"');
    });
  }
  it("شناسه‌ی اسکرین همون externalId معامله‌ست (MT5: شناسه‌ی پوزیشن، نه تیکت deal)", () => {
    const mt5 = read("Arion-MT5.mq5");
    expect(mt5).toContain('string id = IntegerToString(PositionGetInteger(POSITION_IDENTIFIER));');
    expect(mt5).toContain('openIds[n]     = PositionGetInteger(POSITION_IDENTIFIER);');
    expect(mt5).toContain('long pid = HistoryDealGetInteger(d, DEAL_POSITION_ID);');
    expect(mt5).toContain('long posId = HistoryDealGetInteger(deal, DEAL_POSITION_ID);');
    expect(mt5).toContain('"{\\"ticket\\":\\"" + IntegerToString(posId)');
    const mt4 = read("Arion-MT4.mq4");
    expect(mt4).toContain('string id = IntegerToString(OrderTicket());');
    expect(mt4).toContain('"{\\"ticket\\":\\"" + IntegerToString(OrderTicket())');
  });
});

describe("planShotPlacement", () => {
  it("همون نوع جایگزین می‌شه، تصویر دستی نه، و سقف رعایت می‌شه", () => {
    const manual = { id: "m", caption: null, order: 0 };
    const entryShot = { id: "e", caption: MT_SHOT_CAPTION.entry, order: 1 };
    expect(planShotPlacement([manual, entryShot], "entry")).toEqual({ action: "update", id: "e" });
    expect(planShotPlacement([manual], "exit")).toEqual({ action: "create", order: 1 });
    expect(planShotPlacement([manual, entryShot], "exit", 2)).toEqual({ action: "full" });
  });
});

describe("مسیر کامل اکسپرت → ژورنال (دیتابیس)", () => {
  const token = `test_ea_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  let userId = "";
  let accountId = "";

  afterAll(async () => {
    await cleanupUsers();
    await prisma.$disconnect();
  });

  const ea = (path: string, body: string) =>
    new NextRequest(`http://localhost${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}`, "x-forwarded-for": "10.9.8.7" },
      body,
    });
  const shot = (ticket: string, kind: string) =>
    shotPOST(ea("/api/mt/screenshot", `{"ticket":"${ticket}","kind":"${kind}","image":"data:image/png;base64,${mimeWrap(BIG_B64)}"}`));
  const sync = (ticket: string) =>
    syncPOST(ea("/api/mt/sync", JSON.stringify({
      balance: 1000, equity: 1000, currency: "USD",
      trades: [{ ticket, symbol: "EURUSD", type: "BUY", volume: 0.1, openTime: 1_780_000_000, openPrice: 1.1, closed: true, closeTime: 1_780_000_600, closePrice: 1.101, profit: 10 }],
    })));
  const imagesOf = async (ticket: string) => {
    const e = await prisma.tradeEntry.findUnique({
      where: { accountId_externalId: { accountId, externalId: ticket } },
      select: { images: { select: { caption: true, dataUrl: true }, orderBy: { order: "asc" } } },
    });
    return e?.images ?? null;
  };

  it("آماده‌سازی حساب + توکن هش‌شده", async () => {
    userId = await makeUser();
    const acc = await prisma.tradeAccount.create({ data: { userId, name: "EA test" }, select: { id: true } });
    accountId = acc.id;
    await prisma.tradeMtLink.create({ data: { userId, accountId, platform: "MT5", tokenHash: hashSecret(token), connectedAt: new Date() } });
  });

  it("ترتیب عادی: sync بعد اسکرین ورود و خروج", async () => {
    expect((await sync("5001")).status).toBe(200);
    expect((await shot("5001", "entry")).status).toBe(200);
    expect((await shot("5001", "exit")).status).toBe(200);
    const imgs = await imagesOf("5001");
    expect(imgs?.map((i) => i.caption)).toEqual([MT_SHOT_CAPTION.entry, MT_SHOT_CAPTION.exit]);
    expect(imgs?.[0].dataUrl.startsWith("data:image/png;base64,iVBOR")).toBe(true);
    expect(imgs?.[0].dataUrl).not.toMatch(/\s/);
  });

  it("ترتیب برعکس: اسکرین قبل از معامله منتظر می‌مونه و sync وصلش می‌کنه", async () => {
    const r = await shot("5002", "entry");
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ pending: true });
    expect(await imagesOf("5002")).toBeNull();
    expect(await prisma.tradeMtPendingShot.count({ where: { accountId } })).toBe(1);

    expect((await sync("5002")).status).toBe(200);
    expect((await imagesOf("5002"))?.map((i) => i.caption)).toEqual([MT_SHOT_CAPTION.entry]);
    expect(await prisma.tradeMtPendingShot.count({ where: { accountId } })).toBe(0);
  });

  it("تصویر دستی کاربر دست نمی‌خوره و سقف رعایت می‌شه", async () => {
    await sync("5003");
    const e = await prisma.tradeEntry.findUnique({ where: { accountId_externalId: { accountId, externalId: "5003" } }, select: { id: true } });
    await prisma.tradeImage.createMany({
      data: [
        { entryId: e!.id, dataUrl: `data:image/png;base64,${PNG_B64}`, caption: null, order: 0 },
        { entryId: e!.id, dataUrl: `data:image/png;base64,${PNG_B64}`, caption: "دستی", order: 1 },
      ],
    });
    const r = await shot("5003", "exit");
    expect(await r.json()).toMatchObject({ stored: false, reason: "full" });
    expect((await imagesOf("5003"))?.map((i) => i.caption)).toEqual([null, "دستی"]);
  });

  it("بدنه‌ی بایتی مثل اکسپرت (با NUL پایانی StringToCharArray) هم قبول می‌شه و lastShotAt ثبت می‌شه", async () => {
    await sync("5004");
    const json = `{"ticket":"5004","kind":"exit","image":"data:image/png;base64,${mimeWrap(BIG_B64)}"}`;
    const bytes = Buffer.concat([Buffer.from(json, "utf8"), Buffer.from([0])]);
    const r = await shotPOST(ea("/api/mt/screenshot", bytes as unknown as string));
    expect(r.status).toBe(200);
    expect((await imagesOf("5004"))?.map((i) => i.caption)).toEqual([MT_SHOT_CAPTION.exit]);
    const link = await prisma.tradeMtLink.findUnique({ where: { accountId }, select: { lastShotAt: true } });
    expect(link?.lastShotAt).toBeInstanceOf(Date);
  });

  it("sync با NUL پایانی هم 400 نمی‌گیره", async () => {
    const json = JSON.stringify({ balance: 1, equity: 1, currency: "USD", trades: [{ ticket: "5006", symbol: "EURUSD", type: "BUY", volume: 0.1, openTime: 1_780_000_000, openPrice: 1.1, closed: false }] });
    const r = await syncPOST(ea("/api/mt/sync", Buffer.concat([Buffer.from(json), Buffer.from([0])]) as unknown as string));
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ created: 1 });
  });

  it("رد سرور روی اتصال ثبت می‌شه (قبلا بی‌صدا گم می‌شد)", async () => {
    const r = await shot("5005", "bogus");
    expect(r.status).toBe(400);
    const bad = await shotPOST(ea("/api/mt/screenshot", `{"ticket":"5005","kind":"entry","image":"data:image/png;base64,@@"}`));
    expect(bad.status).toBe(400);
    const link = await prisma.tradeMtLink.findUnique({ where: { accountId }, select: { shotError: true, shotErrorAt: true } });
    expect(link?.shotError).toMatch(/^server:invalid image:/);
    expect(link?.shotErrorAt).toBeInstanceOf(Date);
  });

  it("sync نسخه‌ی اکسپرت و گزارش اسکرین ترمینال رو ذخیره می‌کنه", async () => {
    const r = await syncPOST(ea("/api/mt/sync", JSON.stringify({
      balance: 1000, equity: 1000, currency: "USD", eaVersion: "1.42",
      shots: { on: true, ok: 0, queue: 1, err: "screenshot:4024/4024" },
      trades: [],
    })));
    expect(r.status).toBe(200);
    const link = await prisma.tradeMtLink.findUnique({
      where: { accountId }, select: { eaVersion: true, shotsEnabled: true, shotError: true },
    });
    expect(link).toEqual({ eaVersion: "1.42", shotsEnabled: true, shotError: "screenshot:4024/4024" });
  });

  it("توکن اشتباه 401", async () => {
    const r = await shotPOST(new NextRequest("http://localhost/api/mt/screenshot", {
      method: "POST", headers: { authorization: "Bearer nope" }, body: "{}",
    }));
    expect(r.status).toBe(401);
  });
});
