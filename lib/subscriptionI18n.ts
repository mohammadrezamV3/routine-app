// متن‌ها و قالب‌های دوزبانه‌ی اشتراک/چک‌اوت (قیمت، مدت، اسم پلن). همه تابع‌اند، نه ثابت
// سطح ماژول، تا زبان هر درخواست جدا انتخاب بشه (docs/i18n.md).
import { tr, isEn } from "@/lib/i18n";
import { formatToman, formatTomanShort, monthlyPriceToman, type PricingConfig } from "@/lib/planPricing";
import { TRIAL_COPY_FA } from "@/lib/trial";
import { formatPriceAmount } from "@/lib/formatPrice";

const PLAN_NAMES_EN: Record<string, string> = {
  basic: "My Routine",
  exercise: "Workout plan",
  trade: "Trading plan",
  max: "Max plan",
};

/** اسم پلن به زبان جاری؛ برای کلید ناشناخته همون اسم فارسی دیتابیس */
export function planDisplayName(plan: { key: string; nameFa: string }): string {
  return isEn() ? (PLAN_NAMES_EN[plan.key] ?? plan.nameFa) : plan.nameFa;
}

/** «99,000 تومان» / «99,000 Toman» */
export function tomanText(toman: number): string {
  return isEn() ? `${Math.round(toman).toLocaleString("en-US")} Toman` : formatToman(toman);
}

/** «99 هزار تومان» / «99,000 Toman» */
export function tomanShortText(toman: number): string {
  return isEn() ? `${Math.round(toman).toLocaleString("en-US")} Toman` : formatTomanShort(toman);
}

/** «3 ماهه» / «3 months» */
export function monthsText(months: number): string {
  return isEn() ? `${months} ${months === 1 ? "month" : "months"}` : `${months} ماهه`;
}

/** متن معرفی دوره‌ی آزمایشی (lib/trial.ts → TRIAL_COPY_FA) */
export function trialCopy(): string {
  return tr(TRIAL_COPY_FA, "3 days of access to Workout, the Calorie tracker and the Trading journal, with limited AI use");
}

/** متن «روتین من» 14 روز رایگان + قیمت ماهانه‌ی پنل (جایگزین FREE_ROUTINE_COPY_FA در انگلیسی) */
export function freeRoutineCopyEn(cfg: PricingConfig): string {
  return `My Routine is free for 14 days, then continues with the My Routine plan (${tomanShortText(monthlyPriceToman(cfg, "basic"))} per month); the smart assistant Nomo has 10 free messages and is unlimited on paid plans.`;
}

/** مثل formatPriceAmount (ریال خام → تومان) ولی با واحد زبان جاری */
export function priceText(amountRaw: number): string {
  return isEn() ? `${Math.round(amountRaw / 10).toLocaleString("en-US")} Toman` : formatPriceAmount(amountRaw);
}

const PLAN_NAME_FA_TO_EN: Record<string, string> = {
  "روتین من": "My Routine",
  "پلن بدنسازی": "Workout plan",
  "پلن ترید": "Trading plan",
  "پلن مکس": "Max plan",
};

/**
 * توضیح تراکنش کیف (در دیتابیس فارسی ذخیره شده، lib/subscriptionActivation.ts) برای نمایش:
 * در فارسی همون متن، در انگلیسی دو قالب شناخته‌شده ترجمه می‌شن و بقیه (مثل تعدیل ادمین) دست‌نخورده.
 */
export function walletDescriptionText(desc: string): string {
  if (!isEn()) return desc;
  const planOf = (n: string) => PLAN_NAME_FA_TO_EN[n.trim()] ?? n.trim();
  let m = desc.match(/^استفاده از کیفِ اعتبار برای خریدِ (.+)$/);
  if (m) return `Wallet credit used to buy ${planOf(m[1])}`;
  m = desc.match(/^۱۰٪ پاداشِ رفرال از خریدِ (.+) توسطِ کاربرِ دعوت‌شده$/);
  if (m) return `10% referral reward from ${planOf(m[1])} bought by an invited user`;
  return desc;
}
