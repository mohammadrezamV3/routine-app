import { localizedRecord } from "@/lib/localizedRecord";
// منطق خالص لیست و پرونده‌ی کاربران پنل ادمین (بدون prisma؛ هم سرور هم
// کلاینت و تست‌پذیر). کوئری‌های دیتابیس در lib/adminUsersList.ts هستن.

export const TABS = ["all", "new", "active", "paid", "risk", "blocked", "deleted"] as const;
export type UsersTab = (typeof TABS)[number];
// فیلترهای قدیمی همچنان در API پذیرفته می‌شن
export const LEGACY_TABS = ["inactive", "free", "admins"] as const;

export const TAB_LABELS: Record<UsersTab, string> = localizedRecord<UsersTab>({
  all: ["همه", "All"], new: ["تازه", "New"], active: ["فعال", "Active"], paid: ["پولی", "Paid"], risk: ["در خطر ریزش", "At risk of churn"], blocked: ["مسدود", "Blocked"], deleted: ["حذف‌شده", "Deleted"],
});

export const SEEN_RANGES = ["1d", "7d", "30d", "90d", "never"] as const;
export const SIGNUP_RANGES = ["7d", "30d", "90d", "365d"] as const;
export const SORTS = ["newest", "oldest", "name", "ltv", "seen"] as const;
export type UsersSort = (typeof SORTS)[number];
export type SortDir = "asc" | "desc";

/** تعاریف ثابت — هم در کوئری هم در توضیح UI */
export const NEW_DAYS = 7; // «تازه»: ثبت‌نام در 7 روز اخیر
export const ACTIVE_DAYS = 30; // «فعال»: ورود یا بازدید نشست در 30 روز اخیر
export const RISK_INACTIVE_DAYS = 7; // ریزش: بی‌فعالیت 7 روز یا بیشتر
export const RISK_EXPIRY_DAYS = 7; // ریزش: پایان اشتراک در 7 روز آینده
export const MAX_TAG_LEN = 24;
export const MAX_NOTE_LEN = 2000;
export const MAX_SEGMENT_NAME = 60;

const DAY = 86400000;

export type UsersFilters = {
  tab: string;
  search: string;
  plan: string; // planId | "none" | ""
  seen: string;
  signup: string;
  tag: string;
};

export const EMPTY_FILTERS: UsersFilters = { tab: "all", search: "", plan: "", seen: "", signup: "", tag: "" };

function pick<T extends readonly string[]>(list: T, v: unknown, fallback = ""): string {
  return typeof v === "string" && (list as readonly string[]).includes(v) ? v : fallback;
}

/** ورودی نامطمئن (query string یا Json بخش ذخیره‌شده) → فیلتر تمیز */
export function sanitizeFilters(input: unknown): UsersFilters {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  return {
    tab: pick([...TABS, ...LEGACY_TABS], o.tab, "all"),
    search: str(o.search, 100),
    plan: str(o.plan, 40),
    seen: pick(SEEN_RANGES, o.seen),
    signup: pick(SIGNUP_RANGES, o.signup),
    tag: normalizeTag(typeof o.tag === "string" ? o.tag : "") || "",
  };
}

export function rangeDays(r: string): number | null {
  const m = /^(\d+)d$/.exec(r);
  return m ? Number(m[1]) : null;
}

/** برچسب: فاصله‌ها فشرده، حداکثر 24 حرف، بدون کاراکتر کنترلی؛ خالی = null */
export function normalizeTag(raw: string): string | null {
  const t = raw.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, MAX_TAG_LEN).trim();
  return t ? t : null;
}

// ---------------------------------------------------------------- وضعیت

export type SubLite = { status: string; currentPeriodEnd: Date | string; priceMonthly: number };

export type UserStatus = "deleted" | "blocked" | "paid" | "trial" | "expired" | "free";

export const STATUS_LABELS: Record<UserStatus, string> = localizedRecord<UserStatus>({
  deleted: ["حذف‌شده", "Deleted"], blocked: ["مسدود", "Blocked"], paid: ["فعال", "Active"], trial: ["آزمایشی", "Trial"], expired: ["منقضی", "Expired"], free: ["رایگان", "Free"],
});

/**
 * وضعیت نمایشی (یک چیپ):
 *  حذف‌شده > مسدود > فعال (اشتراک ACTIVE پولی) > آزمایشی (اشتراک TRIAL یا حساب
 *  تازه در دوره‌ی آزمایشی) > منقضی (اشتراک قبلی تموم‌شده) > رایگان.
 */
export function deriveUserStatus(
  u: { deletedAt: Date | string | null; isBlocked: boolean; createdAt: Date | string },
  subs: SubLite[],
  now: Date,
  trialDays: number,
): UserStatus {
  if (u.deletedAt) return "deleted";
  if (u.isBlocked) return "blocked";
  if (subs.some((s) => s.status === "ACTIVE" && s.priceMonthly > 0)) return "paid";
  if (subs.some((s) => s.status === "TRIAL" && new Date(s.currentPeriodEnd).getTime() > now.getTime())) return "trial";
  if (subs.length === 0 && now.getTime() - new Date(u.createdAt).getTime() < trialDays * DAY) return "trial";
  if (subs.length > 0) return "expired";
  return "free";
}

/**
 * «در خطر ریزش»: کاربر پولی (اشتراک ACTIVE با قیمت > 0) که
 *  (الف) اشتراکش تا 7 روز آینده تموم می‌شه، یا
 *  (ب) 7 روز یا بیشتر هیچ فعالیتی (ورود/بازدید نشست) نداشته (یا هیچ‌وقت).
 */
export function isChurnRisk(
  subs: SubLite[],
  lastActivityAt: Date | string | null,
  now: Date,
): boolean {
  const paid = subs.filter((s) => s.status === "ACTIVE" && s.priceMonthly > 0);
  if (paid.length === 0) return false;
  const endsSoon = paid.some((s) => {
    const end = new Date(s.currentPeriodEnd).getTime();
    return end >= now.getTime() && end - now.getTime() <= RISK_EXPIRY_DAYS * DAY;
  });
  if (endsSoon) return true;
  if (!lastActivityAt) return true;
  return now.getTime() - new Date(lastActivityAt).getTime() >= RISK_INACTIVE_DAYS * DAY;
}

// ---------------------------------------------------------------- CSV

/** سلول CSV: کوتیشن، دوبل‌کردن " و جلوگیری از formula injection در اکسل */
export function csvCell(v: unknown): string {
  let s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

export function buildCsv(header: string[], rows: unknown[][]): string {
  return "﻿" + [header.map(csvCell).join(",")].concat(rows.map((r) => r.map(csvCell).join(","))).join("\n");
}

// ---------------------------------------------------------------- فعالیت

/** روزهای ISO (YYYY-MM-DD) با حداقل یک تیک → استریک «روز فعال پیاپی» تا امروز یا دیروز */
export function activeDayStreak(activeDays: string[], todayIso: string): number {
  const set = new Set(activeDays);
  const d = new Date(todayIso + "T00:00:00Z");
  const iso = (x: Date) => x.toISOString().slice(0, 10);
  if (!set.has(iso(d))) d.setUTCDate(d.getUTCDate() - 1);
  let n = 0;
  while (set.has(iso(d))) { n++; d.setUTCDate(d.getUTCDate() - 1); }
  return n;
}

export function countActiveLastDays(activeDays: string[], todayIso: string, days: number): number {
  const end = new Date(todayIso + "T00:00:00Z").getTime();
  return new Set(activeDays.filter((s) => { const t = new Date(s + "T00:00:00Z").getTime(); return t <= end && end - t < days * DAY; })).size;
}
