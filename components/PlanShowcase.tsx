"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X, Sparkles, ShoppingCart } from "lucide-react";
import { ICONS } from "@/components/NavDrawer";
import { useTheme } from "@/components/ThemeProvider";
import { toJalali, J_MONTHS } from "@/lib/jalali";

// دقیقاً هم‌شکلِ خروجیِ upgradeOffer توی app/api/plans — پیش‌نمایشِ قیمتِ
// «ارتقا به مکس» وقتی کاربر از قبل ورزش/ترید فعال داره. مبلغِ واقعی همیشه
// سمتِ سرورِ چک‌اوت دوباره محاسبه می‌شه؛ این‌جا فقط برای نمایشه.
export type UpgradeOffer = {
  fromPlanKey: string;
  toPlanKey: string;
  perDuration: Record<string, { amount: number; priceLabel: string; capEndIso: string; capped: boolean }>;
};

export function formatJalaliLong(iso: string): string {
  const d = new Date(iso);
  const [jy, jm, jd] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${jd} ${J_MONTHS[jm - 1]} ${jy}`;
}

export type Duration = "1" | "3" | "6" | "12";
export const DURATIONS: Duration[] = ["1", "3", "6", "12"];
export const DURATION_LABELS: Record<Duration, string> = { "1": "1 ماهه", "3": "3 ماهه", "6": "6 ماهه", "12": "12 ماهه" };
export const DURATION_LABELS_INTL: Record<Duration, string> = { "1": "1 mo", "3": "3 mo", "6": "6 mo", "12": "12 mo" };

export type PlanCard = {
  key: string; nameFa: string; highlight?: boolean; icon: JSX.Element;
  free?: boolean; prices?: Record<Duration, string>;
  // مبلغِ خامِ هر مدت به کوچک‌ترین واحدِ ارز (ریال برای ایران، سنت برای
  // بین‌المللی) — دقیقاً هم‌ارزِ همون رشته‌ی نمایشیِ prices، ولی برای
  // پرداختِ واقعی (چک‌اوت) لازمه، چون parseِ رشته‌ی فرمت‌شده شکننده‌ست.
  amounts?: Record<Duration, number>;
  // قیمتِ اصلیِ (قبل‌ازتخفیفِ) پلنِ یک‌ماهه — فقط اگه ست بشه، به‌صورت خط‌خورده
  // کنارِ قیمتِ واقعی نشون داده می‌شه.
  originalPrice1mo?: string;
  // تخفیفِ ۱۲.۵٪ (هم‌ارزِ «۴۵ روز رایگان به‌ازای هر سال») — روی ۳/۶/۱۲ ماهه هم
  // با همین نرخ اعمال شده، نه فقط سالانه. قیمتِ واقعیِ تخفیف‌خورده توی
  // prices جایگزین شده؛ اینجا فقط عددِ اصلیِ (پیش‌ازتخفیفِ) خط‌خورده‌ست.
  originalPrices?: Partial<Record<Duration, string>>;
  // فهرستِ کوتاهِ امکاناتِ همین پلن، شاملِ سقفِ استفاده‌ی ماهانه‌ی فیچرهایی
  // که واقعاً سقف دارن (lib/aiQuota.ts) — عددها فقط جایی نوشته می‌شن که یک
  // مکانیزمِ واقعیِ enforcement پشتشونه، نه یک ادعای تبلیغاتیِ بدونِ پشتوانه.
  features?: string[];
};

// ترتیب پلن‌ها: Base Plan (رایگان) اول، بعد Plan Gym و Plan Trader، در پایان Plan Max
export const PLANS_IRAN: PlanCard[] = [
  {
    key: "basic", nameFa: "پلن پایه", free: true, icon: ICONS.weekly,
  },
  {
    key: "exercise", nameFa: "پلن بدنسازی", icon: ICONS.exercise,
    prices: { "1": "150,000 تومان", "3": "394,000 تومان", "6": "788,000 تومان", "12": "1,575,000 تومان" },
    originalPrices: { "3": "450,000 تومان", "6": "900,000 تومان", "12": "1,800,000 تومان" },
    amounts: { "1": 1500000, "3": 3940000, "6": 7880000, "12": 15750000 },
    features: ["برنامه‌ی بدنسازی با هوش مصنوعی — ۳ بار در ماه", "شمارش و ردیابیِ کالری", "روتینِ روزانه + خواب"],
  },
  {
    key: "trade", nameFa: "پلن ترید", icon: ICONS.trade,
    prices: { "1": "150,000 تومان", "3": "394,000 تومان", "6": "788,000 تومان", "12": "1,575,000 تومان" },
    originalPrices: { "3": "450,000 تومان", "6": "900,000 تومان", "12": "1,800,000 تومان" },
    amounts: { "1": 1500000, "3": 3940000, "6": 7880000, "12": 15750000 },
    features: ["ژورنال و چک‌لیستِ ترید", "روتینِ روزانه + خواب"],
  },
  {
    key: "max", nameFa: "پلن مکس", highlight: true, icon: <Sparkles size={16} />,
    prices: { "1": "250,000 تومان", "3": "656,000 تومان", "6": "1,313,000 تومان", "12": "2,625,000 تومان" },
    originalPrices: { "3": "750,000 تومان", "6": "1,500,000 تومان", "12": "3,000,000 تومان" },
    amounts: { "1": 2500000, "3": 6560000, "6": 13130000, "12": 26250000 },
    features: ["برنامه‌ی بدنسازی با هوش مصنوعی — ۵ بار در ماه", "شمارش و ردیابیِ کالری", "ژورنال و چک‌لیستِ ترید", "تحلیلِ هوشمندِ هفتگی (AI Insight)", "روتینِ روزانه + خواب"],
  },
];

export const PLANS_INTL: PlanCard[] = [
  {
    key: "basic", nameFa: "Basic", free: true, icon: ICONS.weekly,
  },
  {
    key: "exercise", nameFa: "Plan Gym", icon: ICONS.exercise,
    prices: { "1": "$7.99", "3": "$20.97", "6": "$41.95", "12": "$83.90" },
    originalPrices: { "3": "$23.97", "6": "$47.94", "12": "$95.88" },
    amounts: { "1": 799, "3": 2097, "6": 4195, "12": 8390 },
  },
  {
    key: "trade", nameFa: "Plan Trader", icon: ICONS.trade,
    prices: { "1": "$12.99", "3": "$34.10", "6": "$68.20", "12": "$136.40" },
    originalPrices: { "3": "$38.97", "6": "$77.94", "12": "$155.88" },
    amounts: { "1": 1299, "3": 3410, "6": 6820, "12": 13640 },
  },
  {
    key: "max", nameFa: "Plan Max", highlight: true, icon: <Sparkles size={16} />,
    prices: { "1": "$17.99", "3": "$47.22", "6": "$94.45", "12": "$188.90" },
    originalPrices: { "3": "$53.97", "6": "$107.94", "12": "$215.88" },
    amounts: { "1": 1799, "3": 4722, "6": 9445, "12": 18890 },
  },
];

export type CompareRow = { label: string; included: Record<string, boolean>; upcoming?: boolean };

export const COMPARE_ROWS_IRAN: CompareRow[] = [
  { label: "روتین روزانه", included: { basic: true, exercise: true, trade: true, max: true } },
  { label: "برنامه بدنسازی", included: { basic: false, exercise: true, trade: false, max: true } },
  { label: "شمارش کالری", included: { basic: false, exercise: true, trade: false, max: true } },
  { label: "ژورنال ترید", included: { basic: false, exercise: false, trade: true, max: true } },
  { label: "چک‌لیست ترید", included: { basic: false, exercise: false, trade: true, max: true } },
  { label: "ai mapping", included: { basic: false, exercise: true, trade: true, max: true } },
  { label: "تحلیل هوشمند", included: { basic: false, exercise: false, trade: false, max: true } },
  { label: "اپلیکیشن موبایل", included: { basic: false, exercise: false, trade: false, max: true }, upcoming: true },
  { label: "یکپارچه‌سازی با ساعت هوشمند", included: { basic: false, exercise: false, trade: false, max: true }, upcoming: true },
  { label: "گزارش هفتگی هوش مصنوعی", included: { basic: false, exercise: false, trade: false, max: true }, upcoming: true },
  { label: "اشتراک‌گذاری با مربی یا دوستان", included: { basic: false, exercise: false, trade: false, max: true }, upcoming: true },
  { label: "ردیابی کدنویسی", included: { basic: false, exercise: false, trade: false, max: true }, upcoming: true },
];

export const COMPARE_ROWS_INTL: CompareRow[] = [
  { label: "Daily routine", included: { basic: true, exercise: true, trade: true, max: true } },
  { label: "Bodybuilding program", included: { basic: false, exercise: true, trade: false, max: true } },
  { label: "Calorie tracking", included: { basic: false, exercise: true, trade: false, max: true } },
  { label: "Trade journal", included: { basic: false, exercise: false, trade: true, max: true } },
  { label: "Trade checklist", included: { basic: false, exercise: false, trade: true, max: true } },
  { label: "ai mapping", included: { basic: false, exercise: true, trade: true, max: true } },
  { label: "Smart insights", included: { basic: false, exercise: false, trade: false, max: true } },
  { label: "Mobile app", included: { basic: false, exercise: false, trade: false, max: true }, upcoming: true },
  { label: "Smartwatch integration", included: { basic: false, exercise: false, trade: false, max: true }, upcoming: true },
  { label: "AI weekly report", included: { basic: false, exercise: false, trade: false, max: true }, upcoming: true },
  { label: "Share with a coach or friends", included: { basic: false, exercise: false, trade: false, max: true }, upcoming: true },
  { label: "Coding tracker", included: { basic: false, exercise: false, trade: false, max: true }, upcoming: true },
];

// زیر md عمداً بدون کف‌عرضِ پیکسلی‌ست (نه minmax با کفِ px) — تا هیچ‌کدوم از
// عرضِ صفحه بیرون نزنه و نیازی به اسکرولِ افقی نباشه، حتی روی باریک‌ترین موبایل؛
// sm یک برش میانی (تبلت) هم داره تا موبایل/دسکتاپ صرف نباشه.
export const PLANS_GRID_COLS = "grid-cols-1 sm:grid-cols-2 md:grid-cols-4";
// روی دسکتاپ (md+) از ستون باریک ۶۲۰px سایت بیرون می‌زنه تا هر ۴ پلن بدون
// اسکرول کنار هم جا بشن؛ margin-right ثابته (نه بر پایه‌ی vw) چون توی RTL،
// margin-left در تعارض نادیده گرفته می‌شه و فقط margin-right اثر می‌کنه —
// مقدار از (عرض ستون ۶۲۰px - عرض هدف ۱۲۴۰px)/۲ به دست اومده.
export const BREAKOUT = "md:w-screen md:max-w-[1240px] md:mr-[-310px]";

// روز = نارنجی (طبق طرح جدید)، شب = همون هویت رنگی قبلیِ سایت (سبز اصلی +
// آبی برای تراز ویژه‌ی پلن مکس) — یکی‌شدن دو تم فقط قالب/چیدمانه، نه رنگ.
export function useThemeTokens() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  return {
    isLight,
    cardBg: isLight ? "bg-white/40" : "bg-white/[0.05]",
    cardBorder: isLight ? "border-white/60" : "border-[#242E28]",
    shadow: isLight ? "shadow-[0_15px_45px_rgba(0,0,0,0.06)]" : "shadow-[0_15px_45px_rgba(0,0,0,0.35)]",
    heading: isLight ? "text-[#2B2118]" : "text-[#F3EADD]",
    muted: isLight ? "text-[#6B5D4D]" : "text-[#A79A8A]",
    line: isLight ? "border-[#E7DCC8]" : "border-[#262A2C]",
    secondaryBtnBg: isLight ? "bg-white/70 hover:bg-white" : "bg-white/5 hover:bg-white/10",

    accentColorRaw: isLight ? "#D97706" : "#00A86B",
    accentText: isLight ? "text-[#D97706]" : "text-[#00A86B]",
    accentHoverText: isLight ? "hover:text-[#D97706]" : "hover:text-[#00A86B]",
    accentBg: isLight ? "bg-[#D97706]" : "bg-[#00A86B]",
    accentBgSoft: isLight ? "bg-[#D97706]/10" : "bg-[#00A86B]/10",
    accentBgSofter: isLight ? "bg-[#D97706]/12" : "bg-[#00A86B]/12",
    accentBorder: isLight ? "border-[#D97706]" : "border-[#00A86B]",
    accentHoverBorder: isLight ? "hover:border-[#D97706]" : "hover:border-[#00A86B]",
    accentShadow: isLight ? "shadow-[0_12px_30px_rgba(217,119,6,0.28)]" : "shadow-[0_12px_30px_rgba(0,168,107,0.28)]",

    secondaryText: isLight ? "text-[#D97706]" : "text-[#3E7BFA]",
    secondaryBg: isLight ? "bg-[#D97706]" : "bg-[#3E7BFA]",
    secondaryBgSoft: isLight ? "bg-[#D97706]/10" : "bg-[#3E7BFA]/10",
    secondaryBorderSoft: isLight ? "border-[#D97706]/50" : "border-[#3E7BFA]/50",
    secondaryCardShadow: isLight ? "shadow-[0_18px_45px_rgba(217,119,6,0.16)]" : "shadow-[0_18px_45px_rgba(62,123,250,0.18)]",
    secondaryBadgeShadow: isLight ? "shadow-[0_8px_20px_rgba(217,119,6,0.35)]" : "shadow-[0_8px_20px_rgba(62,123,250,0.35)]",
  };
}

// mode="landing": دکمه‌ی هر پلن می‌بره به ثبت‌نام (کاربر هنوز حسابی نداره).
// mode="account": کاربر از قبل واردشده — دکمه می‌بره به چک‌اوتِ واقعی، و
// پلنِ فعلیش (currentPlanKey) به‌جای دکمه‌ی خرید یه نشانِ «پلنِ فعلیِ تو» می‌گیره.
function PlanCardView({ p, isIntl, mode, currentPlanKey, upgradeOffer, upgradeFromNameFa }: { p: PlanCard; isIntl: boolean; mode: "landing" | "account"; currentPlanKey?: string | null; upgradeOffer?: UpgradeOffer | null; upgradeFromNameFa?: string }) {
  const t = useThemeTokens();
  const [duration, setDuration] = useState<Duration>("1");
  const [renewOpen, setRenewOpen] = useState(false);
  const labels = isIntl ? DURATION_LABELS_INTL : DURATION_LABELS;
  const isCurrent = mode === "account" && currentPlanKey === p.key;
  // پیشنهادِ «ارتقا به مکس» فقط روی خودِ کارتِ مکس نشون داده می‌شه — فقط
  // وقتی کاربر از قبل پلنِ ورزش/ترید فعال داره (upgradeOffer از سرور اومده).
  const offer = mode === "account" && upgradeOffer?.toPlanKey === p.key ? upgradeOffer.perDuration[duration] : undefined;
  const originalPrice = offer ? p.prices?.[duration] : p.originalPrices?.[duration];

  const cardClass = p.highlight
    ? `relative flex flex-col rounded-[22px] border ${t.secondaryBorderSoft} ${t.secondaryBgSoft} p-4 backdrop-blur-xl ${t.secondaryCardShadow}`
    : `relative flex flex-col rounded-[22px] border ${t.cardBorder} ${t.cardBg} p-4 backdrop-blur-xl ${t.shadow}`;

  function scrollToDetails() {
    document.getElementById("plans-compare-table")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const buyHref = mode === "landing" ? `/auth/signup?plan=${p.key}&duration=${duration}` : `/subscription/checkout?plan=${p.key}&duration=${duration}`;

  return (
    <div className={cardClass}>
      {p.highlight && (
        <span className={`absolute -top-2.5 right-5 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold text-white ${t.secondaryBg}`}>
          محبوب‌ترین
        </span>
      )}
      <div className="flex items-center gap-2">
        <span className={`plan-icon-badge flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${t.accentBgSofter} ${t.accentText}`}>{p.icon}</span>
        <div className={`text-right text-[15px] font-extrabold ${t.accentText}`}>{p.nameFa}</div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={scrollToDetails}
          className={`plan-details-btn border-0 bg-transparent p-0 text-[11px] font-bold shadow-none no-underline outline-none transition [backdrop-filter:none] hover:bg-transparent hover:shadow-none focus:no-underline focus-visible:no-underline active:no-underline ${t.accentText}`}
        >
          {isIntl ? "Details" : "جزئیات"}
        </button>
      </div>

      {p.features && p.features.length > 0 ? (
        <ul className={`mt-3 flex flex-1 flex-col gap-1.5 text-[11px] leading-relaxed ${t.muted}`}>
          {p.features.map((f) => (
            <li key={f} className="flex items-start gap-1.5">
              <Check size={13} className={`mt-0.5 shrink-0 ${t.accentText}`} />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex-1" />
      )}

      {p.free ? (
        mode === "landing" ? (
          <>
            <div className={`mt-3 text-[15px] font-extrabold ${t.heading}`}>رایگان</div>
            <Link href="/auth/signup" className={`mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-center text-[12.5px] font-bold text-white transition hover:brightness-105 active:scale-[0.98] ${t.accentBg}`}>
              <ShoppingCart size={14} /> شروع رایگان
            </Link>
          </>
        ) : (
          <>
            <div className={`mt-3 text-[15px] font-extrabold ${t.heading}`}>رایگان</div>
            <div className={`mt-2.5 flex w-full items-center justify-center rounded-xl py-2.5 text-center text-[12.5px] font-bold ${t.muted}`}>
              همیشه همراهِ حساب توئه
            </div>
          </>
        )
      ) : isCurrent ? (
        <>
          {/* پلنِ فعلیِ کاربر: به‌جای پیل‌های انتخابِ مدت (که برای تصمیمِ خرید
              معنا دارن، نه پلنی که از قبل خریداری شده)، یه تیکِ بزرگِ وسطِ
              کارت — بعدش یه باکسِ جدا برای تمدید که با کلیک، مدتِ تمدید رو
              می‌پرسه (طبقِ درخواستِ صریحِ کاربر). */}
          <div className="mt-3 flex flex-col items-center gap-1.5 py-1.5">
            <span className={`flex h-11 w-11 items-center justify-center rounded-full text-white ${t.accentBg}`}>
              <Check size={22} strokeWidth={3} />
            </span>
            <span className={`text-[12px] font-bold ${t.heading}`}>پلنِ فعلیِ تو</span>
          </div>

          {renewOpen ? (
            <div className="mt-1.5 flex flex-col gap-2">
              <div className="grid grid-cols-4 gap-1.5">
                {DURATIONS.map((d) => {
                  const selected = d === duration;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      className={`plan-duration-btn whitespace-nowrap rounded-full py-2 text-[10px] font-bold transition ${selected ? "" : t.muted}`}
                      style={selected
                        ? { background: t.accentColorRaw, color: "#fff" }
                        : { background: t.isLight ? "rgba(43,33,24,.07)" : "rgba(255,255,255,.06)" }}
                    >
                      {labels[d]}
                    </button>
                  );
                })}
              </div>
              <div className={`text-center text-[13.5px] font-extrabold ${t.heading}`}>{p.prices![duration]}</div>
              <Link
                href={buyHref}
                className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-center text-[12.5px] font-bold text-white transition hover:brightness-105 active:scale-[0.98] ${t.accentBg}`}
              >
                <ShoppingCart size={14} /> پرداخت و تمدید
              </Link>
              <button type="button" onClick={() => setRenewOpen(false)} className={`plan-details-btn border-0 bg-transparent p-0 text-[11px] font-semibold shadow-none [backdrop-filter:none] ${t.muted}`}>
                انصراف
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setRenewOpen(true)}
              className={`mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-xl border ${t.line} ${t.secondaryBtnBg} py-2.5 text-center text-[12.5px] font-bold transition active:scale-[0.98] ${t.heading} ${t.accentHoverBorder}`}
            >
              تمدیدِ اشتراک
            </button>
          )}
        </>
      ) : (
        <>
          {/* دکمه‌های انتخابِ مدت — پیلِ تخت، انتخاب‌شده پرِ رنگِ اصلی، بدونِ
              نشانِ چک‌مارک. از راست: ۱ ماهه، ۳ ماهه، ۶ ماهه، ۱۲ ماهه.
              رنگِ پس‌زمینه/متن عمداً inline style‌ه، نه کلاسِ Tailwind — چون
              قانونِ سراسریِ `button:hover` (globals.css) اسپسیفیسیتی‌ش از یه
              کلاسِ Tailwindِ تکی بیشتره و روی هاور/لمس، رنگِ انتخاب‌شده رو با
              یه تینتِ کم‌رنگ جایگزین می‌کرد؛ inline style همیشه برنده‌ست. */}
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {DURATIONS.map((d) => {
              const selected = d === duration;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`plan-duration-btn whitespace-nowrap rounded-full py-2 text-[10px] font-bold transition ${selected ? "" : t.muted}`}
                  style={selected
                    ? { background: t.accentColorRaw, color: "#fff" }
                    : { background: t.isLight ? "rgba(43,33,24,.07)" : "rgba(255,255,255,.06)" }}
                >
                  {labels[d]}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-[15px] font-extrabold ${t.heading}`}>{offer ? offer.priceLabel : p.prices![duration]}</span>
            {originalPrice && (
              <span className={`text-[12px] font-semibold line-through ${t.muted}`}>{originalPrice}</span>
            )}
          </div>

          {offer && (
            <div className={`mt-1.5 text-[10.5px] font-semibold leading-relaxed ${t.muted}`}>
              {upgradeFromNameFa ? `با اعتبارِ پلنِ ${upgradeFromNameFa}‌ی فعلیت — ` : ""}
              {offer.capped ? `این پلن تا ${formatJalaliLong(offer.capEndIso)} فعال می‌مونه` : "به‌مدتِ کامل خریداری‌شده فعال می‌مونه"}
            </div>
          )}

          <Link
            href={buyHref}
            className={`mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-center text-[12.5px] font-bold transition active:scale-[0.98] ${p.highlight ? `text-white hover:brightness-105 ${t.secondaryBg}` : `border ${t.line} ${t.secondaryBtnBg} ${t.heading} ${t.accentHoverBorder}`}`}
          >
            <ShoppingCart size={14} /> خرید این پلن
          </Link>
        </>
      )}
    </div>
  );
}

// گریدِ پلن‌ها + جدولِ مقایسه — از صفحه‌ی لندینگ و صفحه‌ی اشتراکِ داخلِ
// حساب هردو استفاده می‌شه، فقط رفتارِ دکمه‌ها (mode) فرق می‌کنه.
export function PlansSection({ isIntl, mode, currentPlanKey, title = "پلن‌ها", upgradeOffer }: { isIntl: boolean; mode: "landing" | "account"; currentPlanKey?: string | null; title?: string; upgradeOffer?: UpgradeOffer | null }) {
  const t = useThemeTokens();
  const plans = isIntl ? PLANS_INTL : PLANS_IRAN;
  const compareRows = isIntl ? COMPARE_ROWS_INTL : COMPARE_ROWS_IRAN;
  const mainRows = compareRows.filter((r) => !r.upcoming);
  const upcomingRows = compareRows.filter((r) => r.upcoming);
  const upgradeFromNameFa = upgradeOffer ? plans.find((pp) => pp.key === upgradeOffer.fromPlanKey)?.nameFa : undefined;

  return (
    <>
      {title && (
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <h2 className={`text-2xl font-extrabold ${t.heading}`}>{title}</h2>
        </div>
      )}

      <div className={`grid gap-6 pt-5 ${PLANS_GRID_COLS} ${BREAKOUT}`}>
        {plans.map((p) => (
          <PlanCardView key={p.key} p={p} isIntl={isIntl} mode={mode} currentPlanKey={currentPlanKey} upgradeOffer={upgradeOffer} upgradeFromNameFa={upgradeFromNameFa} />
        ))}
      </div>

      {/* جدول HTML واقعی؛ بدون sticky/بک‌گراندِ مخصوصِ ستونِ لیبل و بدون
          minWidth/overflow-x — با tableLayout:fixed و عرض‌های درصدی، خودش
          با اندازه‌ی هر صفحه (حتی موبایل باریک) جمع می‌شه، بدون نیاز به اسکرول.
          ردیف‌های «به‌زودی» توی یک tbody جدا، ولی همون یک باکس/جدول‌ان —
          به‌جای متنِ ساده‌ی «به‌زودی…» (که کم‌کنتراست و عملاً نامرئی بود)،
          محتوای واقعیِ ردیف‌ها با بلورِ کمِ تمام‌کنتراست پیش‌نمایش می‌شه و یک
          نشانِ صریحِ «به‌زودی» روش می‌شینه — حس شیشه‌ی مات، نه خالی. */}
      <div id="plans-compare-table" className={`mt-6 scroll-mt-[96px] rounded-[24px] border ${t.cardBorder} ${t.cardBg} p-6 ${t.shadow} backdrop-blur-2xl ${BREAKOUT}`}>
        <table className="w-full border-collapse" style={{ tableLayout: "fixed" }} aria-label={isIntl ? "Plan comparison" : "مقایسه پلن‌ها"}>
          <colgroup>
            <col style={{ width: "24%" }} />
            {plans.map((p) => <col key={p.key} style={{ width: "19%" }} />)}
          </colgroup>
          <thead>
            <tr className={`border-b ${t.line}`}>
              <th className={`pb-3 text-right text-[12.5px] font-bold ${t.heading}`} />
              {plans.map((p) => (
                <th key={p.key} className={`pb-3 text-center text-[11.5px] font-bold ${t.heading}`}>{p.nameFa}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mainRows.map((row) => (
              <tr key={row.label} className={`border-b ${t.line} last:border-none`}>
                <th scope="row" className={`py-3.5 text-right text-[11.5px] font-normal ${t.muted}`}>{row.label}</th>
                {plans.map((p) => (
                  <td key={p.key} className="py-3.5">
                    <div className="flex justify-center">
                      {row.included[p.key] ? <Check size={17} className={t.accentText} /> : <X size={17} className="text-[#C9524B]/60" />}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {upcomingRows.length > 0 && (
            <tbody>
              <tr>
                <td colSpan={plans.length + 1} className={`border-t ${t.line} p-0`}>
                  <div className="relative py-1">
                    <table
                      className="pointer-events-none w-full select-none border-collapse blur-sm"
                      style={{ tableLayout: "fixed" }}
                      aria-hidden="true"
                    >
                      <colgroup>
                        <col style={{ width: "24%" }} />
                        {plans.map((p) => <col key={p.key} style={{ width: "19%" }} />)}
                      </colgroup>
                      <tbody>
                        {upcomingRows.map((row) => (
                          <tr key={row.label}>
                            <th scope="row" className={`py-3.5 text-right text-[11.5px] font-normal ${t.muted}`}>{row.label}</th>
                            {plans.map((p) => (
                              <td key={p.key} className="py-3.5">
                                <div className="flex justify-center">
                                  {row.included[p.key] ? <Check size={16} className={t.accentText} /> : <X size={16} className="text-[#C9524B]" />}
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`rounded-full px-4 py-1.5 text-xs font-extrabold text-white ${t.accentBg} ${t.accentShadow}`}>
                        {isIntl ? "Coming soon" : "به‌زودی"}
                      </span>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          )}
        </table>
      </div>
    </>
  );
}

export function findPlanCard(key: string, isIntl: boolean): PlanCard | undefined {
  return (isIntl ? PLANS_INTL : PLANS_IRAN).find((p) => p.key === key);
}
