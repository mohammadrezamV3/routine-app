// ترتیب پلن‌ها بر اساس بخش: روی زیردامنه‌ی یک بخش همه‌ی پلن‌ها نمایش داده می‌شن
// (هیچ پلنی پنهان نمی‌شه و از هیچ بخشی بسته نیست)، فقط پلن همون بخش اول میاد،
// بعد پلن مکس، بعد بقیه به ترتیب اصلی. دامنه‌ی اصلی (section = null) ترتیب اصلی را نگه می‌دارد.
// خالص و بدون ری‌اکت (قابل تست).
import type { SectionKey } from "@/lib/sections";

const PLAN_SECTION: Record<string, SectionKey | undefined> = { basic: "routine", exercise: "workout", trade: "trade" };

export function orderPlansForSection<T extends { key: string }>(plans: readonly T[], section: SectionKey | null): T[] {
  if (!section) return [...plans];
  const rank = (key: string): number => {
    if (PLAN_SECTION[key] === section) return 0;
    if (key === "max") return 1;
    return 2;
  };
  // Array.prototype.sort پایدار است، پس ترتیب اصلی داخل هر گروه حفظ می‌شود.
  return [...plans].sort((a, b) => rank(a.key) - rank(b.key));
}
