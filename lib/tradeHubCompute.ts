// منطق خالص هاب ترید — بدون prisma و بدون React، پس هم سرور (lib/tradeHub.ts)
// هم کلاینت (components/TradeHub*.tsx) و هم تست‌ها می‌تونن بدون هزینه واردش کنن.
// همه‌ی متن‌های قابل‌نمایش با tr() داخل تابع ساخته می‌شن (نه سطح ماژول).

import { FOREX_SESSIONS, isForexOpen, sessionArcs, sessionsAt, viewerMinutes, type SessionKey } from "./forexSessions";
import { currencySymbol } from "./tradeTypes";
import { tr } from "./i18n";
import { weekdayShort } from "./jalali";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const pad2 = (n: number) => String(n).padStart(2, "0");
const round1 = (n: number) => Math.round(n * 10) / 10;

// ── پول ──────────────────────────────────────────────────────

/** `+$184.20` / `−$12.00` / `$1,300.50` — ارقام همیشه لاتین */
export function formatHubMoney(n: number, currency: string, signed = false): string {
  const abs = Math.abs(Number.isFinite(n) ? n : 0);
  const sign = signed ? (n > 0 ? "+" : n < 0 ? "−" : "") : n < 0 ? "−" : "";
  const num = abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sym = currencySymbol(currency);
  // نماد تک‌حرفی جلوی عدد می‌شینه، اسم ارز (تومان، ...) بعد از عدد
  return sym.length === 1 ? `${sign}${sym}${num}` : `${sign}${num} ${sym}`;
}

/** رشد حساب به درصد از روی موجودی فعلی و سود خالص؛ پایه‌ی نامعلوم → null */
export function accountGrowthPct(balance: number, netPnl: number): number | null {
  const base = balance - netPnl;
  if (!Number.isFinite(base) || base <= 0) return null;
  return round1((netPnl / base) * 100);
}

export function formatPct(n: number, signed = false): string {
  const s = `${Math.abs(n)}%`;
  return signed ? `${n > 0 ? "+" : n < 0 ? "−" : ""}${s}` : `${n < 0 ? "−" : ""}${s}`;
}

// ── متن ──────────────────────────────────────────────────────

/** خلاصه‌ی متن یادداشت: بدون نشانه‌گذاری مارک‌داون، فاصله‌ها فشرده، بریده با … */
export function noteExcerpt(content: string, fallback = "", max = 140): string {
  const plain = (content || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^[\s>#*\-+\d.)]+(?=\S)/gm, "")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const text = plain || (fallback || "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  // بریدن روی مرز کلمه اگه نزدیک انتهاست
  const cut = text.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).trimEnd()}…`;
}

/** چیپ‌های نماد چارت: آخرین نماد چارت، بعد نمادهای اخیر ژورنال، بعد پیش‌فرض‌ها؛ یکتا و حداکثر n */
export function pickChartSymbols(last: string | null, recent: string[], defaults: string[], n = 4): string[] {
  const out: string[] = [];
  for (const raw of [last ?? "", ...recent, ...defaults]) {
    const s = (raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (s && !out.includes(s)) out.push(s);
    if (out.length >= n) break;
  }
  return out;
}

export const DEFAULT_CHART_SYMBOLS = ["XAUUSD", "EURUSD", "GBPJPY", "BTCUSD"];

// ── شمارش معکوس و زمان ───────────────────────────────────────

/** `01:42:10` یا (بیشتر از یک روز) `2d 04:10` — ارقام لاتین. compact = بدون ثانیه */
export function formatCountdown(ms: number, compact = false): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d >= 1) return tr(`${d} روز و ${pad2(h)}:${pad2(m)}`, `${d}d ${pad2(h)}:${pad2(m)}`);
  return compact ? `${pad2(h)}:${pad2(m)}` : `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

export function hhmm(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** تفاوت روز تقویمی محلی (iso نسبت به now): 0 امروز، 1 فردا، -1 دیروز */
export function dayDiff(iso: string, now: Date): number {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return 0;
  return Math.round((startOfLocalDay(t) - startOfLocalDay(now)) / DAY);
}

/** زمان یک رویداد برای ردیف تقویم: `16:00` / `فردا 15:30` / `چهارشنبه 15:30` */
export function eventWhenLabel(iso: string, now: Date): string {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "";
  const diff = dayDiff(iso, now);
  const time = hhmm(t);
  if (diff <= 0) return time;
  if (diff === 1) return `${tr("فردا", "Tomorrow")} ${time}`;
  return `${weekdayShort(t.getDay())} ${time}`;
}

/** `امروز` / `دیروز` / `3 روز پیش` برای «آخرین استفاده» */
export function relativeDayLabel(iso: string | null, now: Date): string | null {
  if (!iso) return null;
  const diff = -dayDiff(iso, now);
  if (diff <= 0) return tr("امروز", "today");
  if (diff === 1) return tr("دیروز", "yesterday");
  return tr(`${diff} روز پیش`, `${diff} days ago`);
}

/** `3 دقیقه پیش` / `2 ساعت پیش` / `5 روز پیش` برای آخرین همگام‌سازی */
export function agoLabel(iso: string | null, now: Date): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const ms = Math.max(0, now.getTime() - t);
  if (ms < MIN) return tr("همین الان", "just now");
  if (ms < HOUR) { const n = Math.floor(ms / MIN); return tr(`${n} دقیقه پیش`, `${n} min ago`); }
  if (ms < DAY) { const n = Math.floor(ms / HOUR); return tr(`${n} ساعت پیش`, `${n} h ago`); }
  const n = Math.floor(ms / DAY);
  return tr(`${n} روز پیش`, `${n} d ago`);
}

// ── جلسه‌های فارکس ───────────────────────────────────────────

export type PillTone = "open" | "quiet" | "closed";

/** برچسب زنده‌ی کنار عنوان: «لندن و نیویورک باز است» / «بین جلسه‌ها» / «بازار بسته است» */
export function liveSessionPill(now: Date): { tone: PillTone; text: string; keys: SessionKey[] } {
  if (!isForexOpen(now)) return { tone: "closed", text: tr("بازار بسته است", "Market closed"), keys: [] };
  const open = sessionsAt(now);
  if (!open.length) return { tone: "quiet", text: tr("بین جلسه‌ها", "Between sessions"), keys: [] };
  // حداکثر دو جلسه (آخرین‌ها) تا روی موبایل جا بشه
  const keys = open.slice(-2);
  const names = keys.map((k) => FOREX_SESSIONS.find((s) => s.key === k)!.label);
  const text = names.length === 1
    ? tr(`${names[0]} باز است`, `${names[0]} is open`)
    : tr(`${names[0]} و ${names[1]} باز است`, `${names[0]} and ${names[1]} are open`);
  return { tone: "open", text, keys };
}

export type TimelineRow = {
  key: SessionKey;
  label: string;
  open: boolean;
  /** قطعه‌های نوار روی محور 24 ساعته‌ی وقت محلی کاربر، به درصد */
  segments: { start: number; width: number }[];
  openLabel: string;
  closeLabel: string;
};

/** نوار جلسه‌های امروز + جای «الان» روی محور 00:00 تا 24:00 وقت محلی (با DST درست) */
export function sessionTimeline(now: Date): { rows: TimelineRow[]; nowPct: number } {
  const rows = sessionArcs(now).map((a): TimelineRow => {
    const start = ((a.startMin % 1440) + 1440) % 1440;
    const end = start + a.durationMin;
    const segments = end <= 1440
      ? [{ start: (start / 1440) * 100, width: (a.durationMin / 1440) * 100 }]
      : [
          { start: (start / 1440) * 100, width: ((1440 - start) / 1440) * 100 },
          { start: 0, width: ((end - 1440) / 1440) * 100 },
        ];
    return { key: a.key, label: a.label, open: a.open, segments, openLabel: a.openLabel, closeLabel: a.closeLabel };
  });
  return { rows, nowPct: (viewerMinutes(now) / 1440) * 100 };
}
