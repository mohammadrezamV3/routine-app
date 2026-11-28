// جدول سیاست‌های نام‌دار محدودکننده. «shared» یعنی علاوه بر لایه‌ی سریع
// حافظه‌ی هر worker، شمارنده‌ی مشترک Postgres هم چک می‌شه (cluster-safe).
import type { PolicyRule } from "./slidingWindow";
import type { PolicyName } from "./registry";

export type PolicyDef = { rule: PolicyRule; guestRule?: PolicyRule; shared: boolean; ipOnly?: boolean };

const M = 60_000;

export const POLICIES: Record<PolicyName, PolicyDef> = {
  // جستجوهای زنده (تایپ‌آهد): پشت‌سرهم زیاد ولی ارزان
  search: { rule: { sustained: { limit: 40, windowMs: M }, burst: { limit: 12, windowMs: 3_000 } }, guestRule: { sustained: { limit: 20, windowMs: M }, burst: { limit: 8, windowMs: 3_000 } }, shared: false },
  read: { rule: { sustained: { limit: 240, windowMs: M }, burst: { limit: 60, windowMs: 5_000 } }, guestRule: { sustained: { limit: 90, windowMs: M }, burst: { limit: 30, windowMs: 5_000 } }, shared: false },
  write: { rule: { sustained: { limit: 90, windowMs: M }, burst: { limit: 20, windowMs: 5_000 } }, guestRule: { sustained: { limit: 30, windowMs: M }, burst: { limit: 10, windowMs: 5_000 } }, shared: false },
  ai: { rule: { sustained: { limit: 20, windowMs: 10 * M }, burst: { limit: 3, windowMs: 10_000 } }, shared: true },
  export: { rule: { sustained: { limit: 10, windowMs: 60 * M }, burst: { limit: 2, windowMs: 10_000 } }, shared: true },
  upload: { rule: { sustained: { limit: 20, windowMs: 10 * M }, burst: { limit: 5, windowMs: 10_000 } }, shared: false },
  // ورود و ثبت‌نام همیشه با IP شمرده می‌شن (کاربر هنوز واردشده نیست)
  auth: { rule: { sustained: { limit: 20, windowMs: 10 * M }, burst: { limit: 5, windowMs: 10_000 } }, shared: true, ipOnly: true },
};

/** پشت پروکسی بدون TRUST_PROXY_HEADERS همه‌ی مهمان‌ها یک کلید "direct" می‌گیرن؛ سقف رو بالا می‌بریم تا خودمون رو قفل نکنیم. */
export const DIRECT_IP_MULTIPLIER = 10;
