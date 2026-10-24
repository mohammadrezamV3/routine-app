// ترتیب پلن‌ها بر اساس بخش: روی زیردامنه‌ی یک بخش همه‌ی پلن‌ها نمایش داده می‌شن
// (هیچ پلنی پنهان نمی‌شه و از هیچ بخشی بسته نیست). پلن‌های تک‌بخشی اول میان
// (پلن همون بخش اول، بعد بقیه به ترتیب اصلی basic، exercise، trade) و پلن مکس همیشه آخره.
// دامنه‌ی اصلی (section = null): basic، exercise، trade، max.
// خالص و بدون ری‌اکت (قابل تست).
import type { SectionKey } from "@/lib/sections";

const PLAN_SECTION: Record<string, SectionKey | undefined> = { basic: "routine", exercise: "workout", trade: "trade" };

export function orderPlansForSection<T extends { key: string }>(plans: readonly T[], section: SectionKey | null): T[] {
  const rank = (key: string): number => {
    if (key === "max") return 2;
    if (section && PLAN_SECTION[key] === section) return 0;
    return 1;
  };
  // Array.prototype.sort پایدار است، پس ترتیب اصلی داخل هر گروه حفظ می‌شود.
  return [...plans].sort((a, b) => rank(a.key) - rank(b.key));
}
