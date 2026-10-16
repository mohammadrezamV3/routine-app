// پلن‌های هر بخش: روی زیردامنه فقط پلن همون بخش و پلن مکس نشون داده می‌شه (جداسازی بخش‌ها).
// دامنه‌ی اصلی (section = null) همه‌ی پلن‌ها رو داره. خالص و بدون ری‌اکت (قابل تست).
import type { SectionKey } from "@/lib/sections";

const PLAN_SECTION: Record<string, SectionKey | undefined> = { basic: "routine", exercise: "workout", trade: "trade" };

export function planVisibleIn(planKey: string, section: SectionKey | null): boolean {
  if (!section) return true;
  const own = PLAN_SECTION[planKey];
  return !own || own === section;
}
