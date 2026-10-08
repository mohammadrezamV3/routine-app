// منطق خالص هفته در آدرس (بدون import سروری، کلاینت‌امن و تست‌دار):
// ?week=YYYY-MM-DD (شنبه) و ?offset=N قدیمی به یک افست هفته نسبت به هفته‌ی
// جاری *به وقت کاربر* تبدیل می‌شن. سقف همون سقف API آنالیز هفتگیه.
import { getWeekRange } from "@/lib/weeklyAnalysis/week";

export const WEEK_RE = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_WEEKS_BACK = 52;
const DAY_MS = 86_400_000;

function utcMs(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** تاریخ تقویمی واقعی؟ (مثلا 2026-02-31 نه) */
export function isRealIsoDate(s: string): boolean {
  if (!WEEK_RE.test(s)) return false;
  const t = utcMs(s);
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === s;
}

/**
 * ?week= → افست (0 یا منفی) به وقت timezone. هر روزی از هفته مجازه و به همون
 * هفته گرد می‌شه. آینده = null (نامعتبر)، قدیمی‌تر از سقف = null.
 */
export function offsetOfWeekParam(timezone: string, week: string | null | undefined, now: Date = new Date()): number | null {
  if (!week || !isRealIsoDate(week)) return null;
  const cur = getWeekRange(timezone, 0, now).weekStartIso;
  const diffDays = Math.round((utcMs(week) - utcMs(cur)) / DAY_MS);
  const off = Math.floor(diffDays / 7);
  if (off > 0 || off < -MAX_WEEKS_BACK) return null;
  return off;
}

/** ?offset= قدیمی → افست معتبر یا null */
export function offsetOfLegacyParam(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n > 0 || n < -MAX_WEEKS_BACK) return null;
  return n;
}

/**
 * ترتیب اولویت آدرس: week، بعد offset قدیمی، بعد هفته‌ی جاری.
 * invalid=true یعنی week داده شده ولی نامعتبر بود (صفحه به هفته‌ی جاری برمی‌گرده).
 */
export function resolveWeekOffset(
  timezone: string,
  q: { week?: string | null; offset?: string | null },
  now: Date = new Date(),
): { offset: number; invalid: boolean } {
  if (q.week) {
    const o = offsetOfWeekParam(timezone, q.week, now);
    return o === null ? { offset: 0, invalid: true } : { offset: o, invalid: false };
  }
  const legacy = offsetOfLegacyParam(q.offset);
  return { offset: legacy ?? 0, invalid: false };
}
