// نگهبانِ مشترکِ /api/mobile/trade-online/* — Bearer (lib/mobileAuth.ts) +
// همون تصمیمِ requireModule(TRADE) از دیتابیس (نه ادعای کلاینت) + سقفِ نرخ.
import { NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { getMobileUserId } from "@/lib/mobileAuth";
import { checkModuleForUser } from "@/lib/moduleAccess";
import { checkRateLimit } from "@/lib/rateLimit";
import { TICKER_CATALOG, TICKER_SETTING_KEY } from "@/lib/tickerSymbols";
import { prisma } from "@/lib/prisma";
import {
  TICKER_DEFAULT_SYMBOLS,
  TICKER_MAX_SYMBOLS,
  TICKER_MIN_SYMBOLS,
  TRADE_ONLINE_ERROR_MODULE_LOCKED,
  type MarketWatchlistResponse,
} from "@/lib/mobileTradeOnlineContract";

export const TOO_MANY = "تعداد درخواست‌ها زیاد بود — کمی بعد دوباره امتحان کن";

export type TradeOnlineGuard =
  | { ok: true; userId: string; isSuperAdmin: boolean }
  | { ok: false; response: NextResponse };

/**
 * ۴۰۱ بدونِ نشستِ موبایلِ معتبر؛ ۴۰۳ module_locked بدونِ دسترسیِ TRADE (یا
 * مسدودی)؛ ۴۲۹ وقتی سقفِ نرخ پر شد. `rate: null` یعنی روت خودش سقف می‌ذاره.
 */
export async function guardTradeOnline(
  req: Request,
  rate: { key: string; limit: number; windowMs: number } | null
): Promise<TradeOnlineGuard> {
  const userId = await getMobileUserId(req);
  if (!userId) return { ok: false, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  const access = await checkModuleForUser(userId, ModuleKey.TRADE);
  if (!access.ok) {
    return { ok: false, response: NextResponse.json({ error: TRADE_ONLINE_ERROR_MODULE_LOCKED }, { status: 403 }) };
  }
  if (rate && !(await checkRateLimit(`${rate.key}:${userId}`, rate.limit, rate.windowMs))) {
    return { ok: false, response: NextResponse.json({ error: TOO_MANY }, { status: 429 }) };
  }
  return { ok: true, userId, isSuperAdmin: access.isSuperAdmin };
}

// ─── واچ‌لیست = همون تنظیمِ tradeTickerSymbolsِ نوارِ قیمتِ وب ─────────────

const CATALOG_SET = new Set(TICKER_CATALOG.map((s) => s.symbol));

/** فقط نمادهای کاتالوگ، یکتا، حداکثر ۲۰. کمتر از ۱ → null */
export function sanitizeWatchlist(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const out: string[] = [];
  for (const s of v) {
    if (typeof s !== "string" || !CATALOG_SET.has(s) || out.includes(s)) continue;
    out.push(s);
    if (out.length >= TICKER_MAX_SYMBOLS) break;
  }
  return out.length >= TICKER_MIN_SYMBOLS ? out : null;
}

export async function readWatchlist(userId: string): Promise<MarketWatchlistResponse> {
  const row = await prisma.userSetting.findUnique({ where: { userId_key: { userId, key: TICKER_SETTING_KEY } } });
  // مقدارِ ذخیره‌شده‌ی وب ممکنه نمادِ خارج از کاتالوگ داشته باشه — همون‌ها رو
  // هم (اگه شکلشون درسته) نگه می‌داریم؛ ولی خالی/خراب → پیش‌فرض.
  const raw = Array.isArray(row?.value) ? (row!.value as unknown[]).filter((s): s is string => typeof s === "string") : [];
  const saved = raw.length > 0;
  return {
    symbols: saved ? raw.slice(0, TICKER_MAX_SYMBOLS) : [...TICKER_DEFAULT_SYMBOLS],
    saved,
    catalog: TICKER_CATALOG,
  };
}

export async function writeWatchlist(userId: string, symbols: string[]): Promise<void> {
  // مثلِ POST /api/settings/[key] وب — updatedAt خودکار، پس pullِ ترید هم می‌بینه‌ش
  await prisma.userSetting.upsert({
    where: { userId_key: { userId, key: TICKER_SETTING_KEY } },
    create: { userId, key: TICKER_SETTING_KEY, value: symbols },
    update: { value: symbols },
  });
}
