import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { clampText } from "@/lib/validate";
import { sessionsAt } from "@/lib/forexSessions";
import { computeR } from "@/lib/tradeSymbols";
import {
  hashSecret, mtTradeToEntryData, mtUpdateData, normalizeMtTrades, normalizeTzOffsetMs,
} from "@/lib/metatrader";
import { publishDataChanged } from "@/lib/realtime";

// POST /api/mt/sync — اندپوینتی که EA هر چند دقیقه صدا می‌زند.
//   Authorization: Bearer <token>
//   { balance, equity, currency, trades: [...] }
//
// احراز هویت فقط با توکن است (نه سشن). چون هر درخواست مستقیم روی دیتابیس
// چک می‌شود، ابطال توکن از پنل بلافاصله اثر می‌کند — برخلاف یک JWT
// امضاشده که تا انقضایش معتبر می‌ماند.
//
// معاملات با کلید یکتای (accountId, externalId) upsert می‌شوند، پس اجرای
// دوباره‌ی sync (که در EA کاملا عادی است) هیچ‌وقت معامله‌ی تکراری نمی‌سازد.

// ریت‌لیمیت روی *توکن* (یعنی هر حساب)، نه IP: کاربرانی که ده‌ها حساب روی
// یک VPS دارند همه از یک IP می‌آیند و قبلا سقف ۳۰/دقیقه‌ی مشترک IP باعث
// ۴۲۹ و جا ماندن کل دسته‌ها می‌شد. سقف IP فقط سپر حدس توکن است.
const SYNC_LIMIT_PER_TOKEN = 60;
const SYNC_LIMIT_PER_IP = 600;
const SYNC_WINDOW_MS = 60_000;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  if (!(await checkRateLimit(`mt-sync:${ip}`, SYNC_LIMIT_PER_IP, SYNC_WINDOW_MS))) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")?.trim();
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const tokenHash = hashSecret(token);

  const link = await prisma.tradeMtLink.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, accountId: true, revokedAt: true, platform: true },
  });
  if (!link || link.revokedAt) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(await checkRateLimit(`mt-sync-token:${link.id}`, SYNC_LIMIT_PER_TOKEN, SYNC_WINDOW_MS))) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  // زمان معاملات در متاتریدر زمان *سرور بروکر* است نه UTC؛ اکسپرت اختلافش
  // را می‌فرستد (اکسپرت‌های قدیمی شاید نه → بدون تصحیح).
  const tzOffsetMs = normalizeTzOffsetMs(body.tzOffsetMinutes);

  const rawCount = Array.isArray(body.trades) ? body.trades.length : 0;
  const trades = normalizeMtTrades(body.trades);
  // اگر یک شناسه دو بار در همین درخواست آمد، آخری برنده است (نه دو upsert
  // پشت‌سرهم روی یک ردیف)
  const byId = new Map(trades.map((t) => [t.externalId, t]));

  const existingRows = byId.size
    ? await prisma.tradeEntry.findMany({
        where: { accountId: link.accountId, externalId: { in: Array.from(byId.keys()) } },
        select: { id: true, externalId: true, riskAmount: true, syncLocked: true },
      })
    : [];
  const existing = new Map(existingRows.map((r) => [r.externalId!, r]));

  let created = 0;
  let updated = 0;
  let failed = 0;
  const toCreate: Prisma.TradeEntryCreateManyInput[] = [];

  for (const t of Array.from(byId.values())) {
    const data = mtTradeToEntryData(t, tzOffsetMs, link.platform);
    const row = existing.get(t.externalId);

    if (!row) {
      toCreate.push({
        ...data,
        sessions: sessionsAt(data.openedAt),
        userId: link.userId,
        accountId: link.accountId,
        externalId: t.externalId,
        rMultiple: null,
      });
      continue;
    }

    // کاربر یک‌بار خودش جزئیات این معامله را دستی ویرایش کرده — دیگر حتی
    // فیلدهای اصلی (symbol/pnl/قیمت‌ها/...) هم با sync بازنویسی نشوند.
    // فیلدهای دستی کاربر (احساسات، چک‌لیست، برچسب، دلایل، عکس، یادداشت) هم
    // اصلا در data نیستند، پس هیچ‌وقت دست نمی‌خورند.
    if (row.syncLocked) continue;

    const upd = mtUpdateData(data, t);
    try {
      await prisma.tradeEntry.update({
        where: { id: row.id },
        data: {
          ...upd,
          ...(upd.openedAt ? { sessions: sessionsAt(upd.openedAt) } : {}),
          rMultiple: computeR(data.pnl, row.riskAmount),
        },
      });
      updated++;
    } catch (e) {
      // خطای یک ردیف نباید کل دسته را ۵۰۰ کند — وگرنه EA کرسرش را جلو
      // نمی‌برد و همان دسته تا ابد دوباره شکست می‌خورد.
      failed++;
      console.error("[mt/sync] update failed", link.id, t.externalId, e);
    }
  }

  if (toCreate.length) {
    try {
      // یک کوئری برای کل بک‌فیل — قبلا ۲ کوئری به‌ازای هر معامله بود و دسته‌ی
      // ۳۰۰تایی از timeout ۱۰ ثانیه‌ای WebRequest رد می‌شد.
      const r = await prisma.tradeEntry.createMany({ data: toCreate, skipDuplicates: true });
      created += r.count;
    } catch (e) {
      console.error("[mt/sync] createMany failed, falling back per row", link.id, e);
      for (const row of toCreate) {
        try {
          await prisma.tradeEntry.create({ data: row });
          created++;
        } catch (err) {
          failed++;
          console.error("[mt/sync] create failed", link.id, row.externalId, err);
        }
      }
    }
  }

  const skipped = rawCount - trades.length;
  if (skipped > 0) console.warn(`[mt/sync] ${link.id}: ${skipped} invalid row(s) skipped`);

  const balance = typeof body.balance === "number" && Number.isFinite(body.balance) ? body.balance : null;
  const equity = typeof body.equity === "number" && Number.isFinite(body.equity) ? body.equity : null;

  await prisma.tradeMtLink.update({
    where: { id: link.id },
    data: {
      lastSyncAt: new Date(),
      ...(balance !== null ? { balance } : {}),
      ...(equity !== null ? { equity } : {}),
      ...(body.currency ? { currency: clampText(String(body.currency), 8) } : {}),
    },
  });

  // معامله‌ی تازه/به‌روزشده از EA → حساب/ژورنال باز کاربر (روی هر دستگاهی) همون لحظه
  if (created > 0 || updated > 0) void publishDataChanged(link.userId, ["trade"]);

  return NextResponse.json({ ok: true, received: trades.length, created, updated, skipped, failed });
}
