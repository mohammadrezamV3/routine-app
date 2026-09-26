// منطقِ خالص (بدونِ React/Dexie) — جدا تا تست‌پذیر باشه.
import type { SocialChatMessage, SocialWeeklyDay, SocialWeeklyDomain } from "@m/lib/social-contract";

/**
 * ادغامِ پیام‌های تازه با فهرستِ فعلی: یکتا بر اساسِ id، مرتبِ صعودی بر
 * اساسِ زمان. پیامِ خوش‌بینانه‌ی خودمون اگه پولینگ هم آوردش دو بار دیده نمی‌شه.
 */
export function mergeMessages(prev: SocialChatMessage[], incoming: SocialChatMessage[]): SocialChatMessage[] {
  if (!incoming.length) return prev;
  const byId = new Map(prev.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

/** حذفِ یک پیام (حذفِ خودمون یا گزارش‌شده که سرور همون لحظه نرم‌حذفش می‌کنه) */
export function withoutMessage(list: SocialChatMessage[], id: string): SocialChatMessage[] {
  return list.filter((m) => m.id !== id);
}

/** آخرین createdAt برای پولینگِ `since` */
export function lastCreatedAt(list: SocialChatMessage[]): string | undefined {
  return list.length ? list[list.length - 1].createdAt : undefined;
}

/** نگه‌داریِ حداکثر N پیامِ آخر در کش (سرور هم بیش از ۲۰۰ نگه نمی‌داره) */
export function trimForCache(list: SocialChatMessage[], max = 200): SocialChatMessage[] {
  return list.length > max ? list.slice(list.length - max) : list;
}

/** مقیاسِ ۰..۱۰۰ → ارتفاعِ پیکسلیِ میله (null = بدونِ داده) */
export function barHeight(value: number | null | undefined, maxHeight: number): number {
  if (value == null || !Number.isFinite(value)) return 0;
  const v = Math.max(0, Math.min(100, value));
  return Math.round((v / 100) * maxHeight);
}

/** میانگینِ دامنه‌های فعالِ یک روز — برای نمودارِ میله‌ای روزانه */
export function dayAverage(day: SocialWeeklyDay): number | null {
  const vals = Object.values(day.domains).filter((v): v is number => typeof v === "number");
  if (!vals.length) return null;
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
}

export function activeDomains(days: SocialWeeklyDay[]): SocialWeeklyDomain[] {
  const set = new Set<SocialWeeklyDomain>();
  for (const d of days) for (const k of Object.keys(d.domains)) set.add(k as SocialWeeklyDomain);
  return [...set];
}

/** تغییر نسبت به هفته‌ی قبل: «+۱۲» / «−۵» / null */
export function deltaOf(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null) return null;
  return current - previous;
}

export function scoreColor(score: number | null): string {
  if (score == null) return "var(--muted2)";
  if (score >= 70) return "var(--pnl-win)";
  if (score >= 40) return "var(--sun)";
  return "var(--pnl-loss)";
}
