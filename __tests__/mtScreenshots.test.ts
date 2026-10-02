import { describe, it, expect, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashSecret, MT_SHOT_CAPTION } from "@/lib/metatrader";
import { parseMtShotBody, planShotPlacement } from "@/lib/mtScreenshots";
import { POST as shotPOST } from "@/app/api/mt/screenshot/route";
import { POST as syncPOST } from "@/app/api/mt/sync/route";
import { makeUser, cleanupUsers } from "./helpers/mentorTestUtils";

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

  it("توکن اشتباه 401", async () => {
    const r = await shotPOST(new NextRequest("http://localhost/api/mt/screenshot", {
      method: "POST", headers: { authorization: "Bearer nope" }, body: "{}",
    }));
    expect(r.status).toBe(401);
  });
});
