import { faNum, J_MONTHS, toJalali } from "@m/lib/jalali";

// نمایشِ فارسیِ زمانِ آخرین همگام‌سازی.
//
// عمدا از `toLocaleString("fa-IR")` استفاده نمی‌کنیم: اون هم ارقام رو به
// گلیف‌های فارسیِ واقعی (۰-۹) تبدیل می‌کنه (بر خلافِ ارقامِ لاتینِ faNum که
// بقیه‌ی اپ ازش استفاده می‌کنه) و هم `toLocaleDateString("fa-IR")` تقویمِ
// میلادی رو با ارقامِ فارسی نشون می‌ده، نه جلالی — یعنی دو ناسازگاریِ جدا با
// بقیه‌ی اپ. این‌جا با همون faNum + toJalali که همه‌جای دیگه استفاده می‌شه
// یکدست شده.
export function formatLastSync(iso: string | null, now = Date.now()): string {
  if (!iso) return "هنوز انجام نشده";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  const diff = Math.max(0, now - t);
  if (diff < 60_000) return "همین الان";
  if (diff < 3_600_000) return `${faNum(Math.floor(diff / 60_000))} دقیقه پیش`;
  if (diff < 86_400_000) return `${faNum(Math.floor(diff / 3_600_000))} ساعت پیش`;
  const d = new Date(t);
  const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${faNum(j[2])} ${J_MONTHS[j[1] - 1]} ${faNum(j[0])}`;
}
