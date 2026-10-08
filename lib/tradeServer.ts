// منطق مشترک سمت سرور ماژول ترید: اعتبارسنجی ورودی و شکل‌دادن خروجی.
// جدا نگه داشته شده تا روت‌های accounts/entries/checklists هرکدام دوباره
// همین قواعد را ننویسند و به‌مرور زمان از هم دریفت نکنند.

import { Prisma } from "@prisma/client";
import { clampText } from "./validate";
import { sessionsAt } from "./forexSessions";
import { computeR } from "./tradeSymbols";
import { MAX_IMAGES_PER_TRADE } from "./tradeTypes";
import { tr } from "./i18n";

/** سقف طول data URL هر عکس. کلاینت از قبل فشرده می‌کند (lib/image.ts)؛
 *  این فقط تور ایمنی سرور در برابر پیلود بزرگ است. */
export const MAX_IMAGE_DATA_URL_LEN = 900_000;

const RESULTS = ["PROFIT", "LOSS", "BREAKEVEN"] as const;
const STATUSES = ["OPEN", "CLOSED", "CANCELED"] as const;
const DIRECTIONS = ["BUY", "SELL"] as const;
const VOLUME_UNITS = ["LOT", "USD"] as const;
const ENTRY_REASONS = ["STRATEGY", "TECHNICAL_SIGNAL", "FUNDAMENTAL_SIGNAL", "NEWS", "INTUITION", "OTHERS_ADVICE", "FOMO", "REVENGE", "OTHER"] as const;
const EXIT_REASONS = ["TAKE_PROFIT", "STOP_LOSS", "MANUAL", "TRAILING_STOP", "MARKET_CHANGE", "EMOTIONAL", "TIME_BASED", "OTHER"] as const;
const EMOTIONS_BEFORE = ["CALM", "NEUTRAL", "EXCITED", "ANXIOUS", "ANGRY", "OVERCONFIDENT"] as const;
const EMOTIONS_AFTER = ["SATISFIED", "RELIEVED", "INDIFFERENT", "ANXIOUS", "REGRET", "ANGRY"] as const;
const ACCOUNT_TYPES = ["REAL", "DEMO", "PROP", "BACKTEST"] as const;
const GOAL_TYPES = ["AMOUNT", "PERCENT"] as const;

function oneOf<T extends readonly string[]>(list: T, v: unknown): v is T[number] {
  return typeof v === "string" && (list as readonly string[]).includes(v);
}

function subsetOf<T extends readonly string[]>(list: T, v: unknown): T[number][] | null {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) return null;
  const out: string[] = [];
  for (const item of v) {
    if (!oneOf(list, item)) return null;
    if (!out.includes(item)) out.push(item);
  }
  return out as T[number][];
}

/** عدد اختیاری: undefined/null/'' یعنی «ندارد»، غیر آن باید عدد متناهی باشد */
function optNumber(v: unknown, label: string, opts: { min?: number; max?: number } = {}): number | null | string {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "number" || !Number.isFinite(v)) return tr(`${label} نامعتبر است`, `${label} is invalid`);
  if (opts.min !== undefined && v < opts.min) return tr(`${label} نمی‌تواند کمتر از ${opts.min} باشد`, `${label} cannot be less than ${opts.min}`);
  if (opts.max !== undefined && v > opts.max) return tr(`${label} خیلی بزرگ است`, `${label} is too large`);
  return v;
}

function parseDateTime(v: unknown): Date | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// نماد معاملاتی: حروف/عدد و چند نشانه‌ی رایج بروکرها (XAUUSD.m، US30-CFD)
const SYMBOL_RE = /^[A-Z0-9][A-Z0-9._#-]{0,19}$/;

export type ParsedTradeInput = {
  data: Omit<Prisma.TradeEntryUncheckedCreateInput, "userId" | "id">;
  images: { dataUrl: string; caption: string | null }[];
  tagIds: string[];
  checklistState: Record<string, boolean>;
};

/**
 * اعتبارسنجی کامل بدنه‌ی ثبت/ویرایش معامله.
 * برمی‌گرداند: رشته = پیام خطا برای کاربر، وگرنه داده آماده‌ی پریزما.
 */
export function parseTradeInput(body: any): string | ParsedTradeInput {
  if (!body || typeof body !== "object") return tr("بدنه‌ی درخواست نامعتبر است", "Invalid request body");

  const symbol = String(body.symbol || "").trim().toUpperCase();
  if (!SYMBOL_RE.test(symbol)) return tr("نماد معاملاتی را درست وارد کن", "Enter the trading symbol correctly");

  if (!oneOf(DIRECTIONS, body.direction)) return tr("جهت معامله نامعتبر است", "Invalid trade direction");
  if (!oneOf(RESULTS, body.result)) return tr("نتیجه‌ی معامله نامعتبر است", "Invalid trade result");
  if (!oneOf(STATUSES, body.status)) return tr("وضعیت معامله نامعتبر است", "Invalid trade status");
  const volumeUnit = oneOf(VOLUME_UNITS, body.volumeUnit) ? body.volumeUnit : "LOT";

  const openedAt = parseDateTime(body.openedAt);
  if (!openedAt) return tr("تاریخ و ساعت ورود نامعتبر است", "Invalid entry date and time");
  // ۵ دقیقه ارفاق برای اختلاف ساعت دستگاه کاربر با سرور
  if (openedAt.getTime() > Date.now() + 5 * 60_000) return tr("نمی‌توانی برای زمان آینده معامله ثبت کنی", "You cannot log a trade for a future time");

  const closedAt = body.closedAt ? parseDateTime(body.closedAt) : null;
  if (body.closedAt && !closedAt) return tr("تاریخ و ساعت خروج نامعتبر است", "Invalid exit date and time");
  if (closedAt && closedAt.getTime() < openedAt.getTime()) return tr("زمان خروج نمی‌تواند قبل از زمان ورود باشد", "The exit time cannot be before the entry time");

  const volume = optNumber(body.volume, tr("حجم معامله", "Trade volume"), { min: 0, max: 1e9 });
  if (typeof volume === "string") return volume;
  if (volume === null || volume <= 0) return tr("حجم معامله باید عدد مثبت باشد", "The trade volume must be a positive number");

  const pnlRaw = optNumber(body.pnl, tr("سود/زیان", "Profit/loss"), { min: -1e12, max: 1e12 });
  if (typeof pnlRaw === "string") return pnlRaw;
  const pnl = pnlRaw ?? 0;
  // ناسازگاری «نتیجه» با «علامت عدد» یعنی کلاینت خراب است، نه ورودی کاربر
  if (body.result === "PROFIT" && pnl < 0) return tr("برای نتیجه‌ی سود، مقدار نمی‌تواند منفی باشد", "For a profit result, the amount cannot be negative");
  if (body.result === "LOSS" && pnl > 0) return tr("برای نتیجه‌ی ضرر، مقدار نمی‌تواند مثبت باشد", "For a loss result, the amount cannot be positive");

  const numericFields: [string, string, { min?: number; max?: number }][] = [
    ["entryPrice", tr("قیمت ورود", "Entry price"), { min: 0 }],
    ["exitPrice", tr("قیمت خروج", "Exit price"), { min: 0 }],
    ["stopLoss", tr("حد ضرر", "Stop loss"), { min: 0 }],
    ["takeProfit", tr("حد سود", "Take profit"), { min: 0 }],
    ["commission", tr("کمیسیون", "Commission"), {}],
    ["swap", tr("سواپ", "Swap"), {}],
    ["riskAmount", tr("مقدار ریسک", "Risk amount"), { min: 0 }],
  ];
  const nums: Record<string, number | null> = {};
  for (const [field, label, opts] of numericFields) {
    const v = optNumber(body[field], label, opts);
    if (typeof v === "string") return v;
    nums[field] = v;
  }

  const confidence = optNumber(body.confidence, tr("میزان اطمینان", "Confidence"), { min: 1, max: 10 });
  if (typeof confidence === "string") return confidence;

  const entryReasons = subsetOf(ENTRY_REASONS, body.entryReasons);
  if (!entryReasons) return tr("دلایل ورود نامعتبر است", "Invalid entry reasons");
  const exitReasons = subsetOf(EXIT_REASONS, body.exitReasons);
  if (!exitReasons) return tr("دلایل خروج نامعتبر است", "Invalid exit reasons");

  if (body.emotionBefore != null && !oneOf(EMOTIONS_BEFORE, body.emotionBefore)) return tr("احساس قبل از معامله نامعتبر است", "Invalid mood before the trade");
  if (body.emotionAfter != null && !oneOf(EMOTIONS_AFTER, body.emotionAfter)) return tr("احساس بعد از معامله نامعتبر است", "Invalid mood after the trade");

  const images = parseImages(body.images);
  if (typeof images === "string") return images;

  const tagIds = Array.isArray(body.tagIds) ? body.tagIds.filter((t: unknown) => typeof t === "string").slice(0, 20) : [];

  const checklistState =
    body.checklistState && typeof body.checklistState === "object" && !Array.isArray(body.checklistState)
      ? (body.checklistState as Record<string, boolean>)
      : {};

  // R و جلسه‌ها هر دو سمت سرور محاسبه می‌شوند، نه از ورودی کلاینت — چون
  // مبنای آمارند و کلاینت قابل دور زدن است.
  const rMultiple = computeR(pnl, nums.riskAmount);
  const sessions = sessionsAt(openedAt);

  return {
    data: {
      accountId: String(body.accountId || ""),
      symbol,
      direction: body.direction,
      timeframe: body.timeframe ? clampText(String(body.timeframe), 8) : null,
      openedAt,
      closedAt,
      volume,
      volumeUnit,
      result: body.result,
      pnl,
      riskFree: !!body.riskFree,
      status: body.status,
      entryPrice: nums.entryPrice,
      exitPrice: nums.exitPrice,
      stopLoss: nums.stopLoss,
      takeProfit: nums.takeProfit,
      commission: nums.commission,
      swap: nums.swap,
      riskAmount: nums.riskAmount,
      rMultiple,
      sessions,
      setup: body.setup ? clampText(String(body.setup).trim(), 60) : null,
      entryReasons,
      exitReasons,
      entryReasonNote: body.entryReasonNote ? clampText(String(body.entryReasonNote), 1000) : null,
      exitReasonNote: body.exitReasonNote ? clampText(String(body.exitReasonNote), 1000) : null,
      note: body.note ? clampText(String(body.note), 2000) : null,
      emotionBefore: body.emotionBefore ?? null,
      emotionAfter: body.emotionAfter ?? null,
      confidence: confidence ?? null,
      followedPlan: typeof body.followedPlan === "boolean" ? body.followedPlan : null,
    },
    images,
    tagIds,
    checklistState,
  };
}

export function parseImages(raw: unknown): { dataUrl: string; caption: string | null }[] | string {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) return tr("فرمت تصاویر نامعتبر است", "Invalid images format");
  if (raw.length > MAX_IMAGES_PER_TRADE) return tr(`حداکثر ${MAX_IMAGES_PER_TRADE} تصویر مجاز است`, `A maximum of ${MAX_IMAGES_PER_TRADE} images is allowed`);
  const out: { dataUrl: string; caption: string | null }[] = [];
  for (const item of raw) {
    const dataUrl = typeof item === "string" ? item : item?.dataUrl;
    if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) return tr("فرمت تصویر نامعتبر است", "Invalid image format");
    if (dataUrl.length > MAX_IMAGE_DATA_URL_LEN) return tr("حجم تصویر زیاد است", "The image is too large");
    out.push({ dataUrl, caption: item?.caption ? clampText(String(item.caption), 120) : null });
  }
  return out;
}

// ── اعتبارسنجی حساب ──────────────────────────────────────────────────────
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function parseAccountInput(body: any): string | Omit<Prisma.TradeAccountUncheckedCreateInput, "userId" | "id"> {
  if (!body || typeof body !== "object") return tr("بدنه‌ی درخواست نامعتبر است", "Invalid request body");
  const name = String(body.name || "").trim();
  if (!name) return tr("نام حساب الزامی است", "Account name is required");
  if (!oneOf(ACCOUNT_TYPES, body.type ?? "REAL")) return tr("نوع حساب نامعتبر است", "Invalid account type");
  if (!oneOf(GOAL_TYPES, body.goalType ?? "AMOUNT")) return tr("نوع هدف نامعتبر است", "Invalid goal type");
  if (body.color && !HEX_COLOR_RE.test(body.color)) return tr("رنگ نامعتبر است", "Invalid color");

  const initialBalance = optNumber(body.initialBalance, tr("بالانس اولیه", "Initial balance"), { min: 0, max: 1e12 });
  if (typeof initialBalance === "string") return initialBalance;
  const goalValue = optNumber(body.goalValue, tr("مقدار هدف", "Goal amount"), { min: 0, max: 1e12 });
  if (typeof goalValue === "string") return goalValue;
  const leverage = optNumber(body.leverage, tr("اهرم", "Leverage"), { min: 1, max: 10_000 });
  if (typeof leverage === "string") return leverage;

  return {
    name: clampText(name, 60),
    broker: body.broker ? clampText(String(body.broker).trim(), 60) : null,
    type: body.type ?? "REAL",
    currency: clampText(String(body.currency || "USD").trim().toUpperCase(), 8),
    initialBalance: initialBalance ?? 0,
    leverage: leverage === null ? null : Math.round(leverage),
    color: body.color || "#00A86B",
    note: body.note ? clampText(String(body.note), 500) : null,
    goalType: body.goalType ?? "AMOUNT",
    goalValue: goalValue ?? 0,
  };
}

export function isHexColor(v: unknown): boolean {
  return typeof v === "string" && HEX_COLOR_RE.test(v);
}


// ── شکل خروجی لیست معاملات ─────────────────────────────────────────────
// عمدا بدون dataUrl عکس‌ها: لیست فقط تعدادشان را لازم دارد و کشیدن
// چند مگابایت data URL برای هر ردیف، همان اشتباهی است که ساختار قبلی داشت.
export const ENTRY_SELECT = {
  id: true, accountId: true, symbol: true, direction: true, timeframe: true,
  openedAt: true, closedAt: true, volume: true, volumeUnit: true, result: true,
  pnl: true, riskFree: true, status: true, entryPrice: true, exitPrice: true,
  stopLoss: true, takeProfit: true, commission: true, swap: true,
  riskAmount: true, rMultiple: true, sessions: true, setup: true,
  entryReasons: true, exitReasons: true, entryReasonNote: true, exitReasonNote: true,
  note: true, emotionBefore: true, emotionAfter: true, confidence: true, followedPlan: true,
  checklistId: true, checklistName: true, checklistDone: true, checklistTotal: true,
  tags: { select: { id: true, name: true, color: true } },
  _count: { select: { images: true } },
} as const;

type EntryRow = Prisma.TradeEntryGetPayload<{ select: typeof ENTRY_SELECT }>;

export function serializeEntry(e: EntryRow) {
  const { _count, ...rest } = e;
  return {
    ...rest,
    openedAt: e.openedAt.toISOString(),
    closedAt: e.closedAt ? e.closedAt.toISOString() : null,
    imageCount: _count.images,
  };
}
