"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X, Sparkles, ShoppingCart } from "lucide-react";
import { ICONS } from "@/components/NavDrawer";
import { useTheme } from "@/components/ThemeProvider";
import { toJalali, J_MONTHS } from "@/lib/jalali";
import { TRIAL_COPY_FA } from "@/lib/trial";
import { Duration, durationLabel, enabledDurations, formatToman, isPaidPlanKey } from "@/lib/planPricing";
import { usePlanPricing } from "@/lib/usePlanPricing";

// دقیقا هم‌شکل خروجی upgradeOffer توی app/api/plans — پیش‌نمایش قیمت
// «ارتقا به مکس» وقتی کاربر از قبل ورزش/ترید فعال داره. مبلغ واقعی همیشه
// سمت سرور چک‌اوت دوباره محاسبه می‌شه؛ این‌جا فقط برای نمایشه.
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

// قیمت‌ها/مدت‌ها/تخفیف‌ها دیگه این‌جا هاردکد نیستن: از پنل ادمین
// (/admin/pricing) میان و با usePlanPricing خونده می‌شن — همون پیکربندی‌ای
// که چک‌اوت سمت سرور مبلغ واقعی رو ازش حساب می‌کنه (lib/planPricing.ts).
export type { Duration } from "@/lib/planPricing";

export type PlanCard = {
  key: string; nameFa: string; highlight?: boolean; icon: JSX.Element;
  free?: boolean; note?: string;
  // فهرست کوتاه امکانات همین پلن، شامل سقف استفاده‌ی ماهانه‌ی فیچرهایی
  // که واقعا سقف دارن (lib/aiQuota.ts) — عددها فقط جایی نوشته می‌شن که یک
  // مکانیزم واقعی enforcement پشتشونه، نه یک ادعای تبلیغاتی بدون پشتوانه.
  features?: string[];
};

// ترتیب پلن‌ها: «روتین من» اول، بعد Plan Gym و Plan Trader، در پایان Plan Max
export const PLANS_IRAN: PlanCard[] = [
  {
    key: "basic", nameFa: "روتین من", icon: ICONS.weekly,
    // «روتین من» دیگه رایگان دائمی نیست: 14 روز آزمایشی، بعد پلن پولی.
    note: "14 روز رایگان",
    features: ["روتین روزانه و برنامه‌ی هفتگی", "یادآوری برنامه‌ها و دارو", "ثبت خواب و پیوستگی روزها"],
  },
  {
    key: "exercise", nameFa: "پلن بدنسازی", icon: ICONS.exercise,
    features: ["ساخت برنامه‌ی بدنسازی با هوش مصنوعی — 3 بار در ماه", "ثبت و پیگیری کالری و ماکروها", "روتین روزانه"],
  },
  {
    key: "trade", nameFa: "پلن ترید", icon: ICONS.trade,
    features: ["ژورنال ترید و چک‌لیست قبل از معامله", "تقویم اقتصادی", "ورود خودکار معاملات از MT4 و MT5", "روتین روزانه"],
  },
  {
    key: "max", nameFa: "پلن مکس", highlight: true, icon: <Sparkles size={16} />,
    // «تحلیل هوشمند» طبق درخواست صریح از فیچرهای پلن حذف شد (هنوز آماده
    // نیست — به بخش «به‌زودی»ی جدول جزئیات منتقل شده، COMPARE_ROWS_IRAN
    // پایین همین فایل)؛ جایگزینش «مدیربرنامه هوشمند» است.
    features: ["ساخت برنامه‌ی بدنسازی با هوش مصنوعی — 5 بار در ماه", "ثبت و پیگیری کالری و ماکروها", "ژورنال ترید و چک‌لیست قبل از معامله", "تقویم اقتصادی", "ورود خودکار معاملات از MT4 و MT5", "نومو، مدیر برنامه هوشمند — با جمله‌ی فارسی بساز و ویرایش کن", "روتین روزانه"],
  },
];


export type CompareRow = { label: string; included: Record<string, boolean>; upcoming?: boolean };

export const COMPARE_ROWS_IRAN: CompareRow[] = [
  { label: "روتین روزانه", included: { basic: true, exercise: true, trade: true, max: true } },
  // طبق درخواست صریح: توی نسخه‌ی رایگان هم یادآوری دارو رایگانه — یک ردیف
  // جدا (نه فقط بخشی از «روتین روزانه») که واضح نشون بده حتی «روتین من» هم
  // این رو داره، در همه‌ی پلن‌ها همیشه فعاله.
  { label: "یادآوری دارو", included: { basic: true, exercise: true, trade: true, max: true } },
  { label: "برنامه بدنسازی", included: { basic: false, exercise: true, trade: false, max: true } },
  { label: "شمارش کالری", included: { basic: false, exercise: true, trade: false, max: true } },
  { label: "ژورنال ترید", included: { basic: false, exercise: false, trade: true, max: true } },
  { label: "چک‌لیست ترید", included: { basic: false, exercise: false, trade: true, max: true } },
  { label: "تقویم اقتصادی", included: { basic: false, exercise: false, trade: true, max: true } },
  { label: "اتصال متاتریدر", included: { basic: false, exercise: false, trade: true, max: true } },
  { label: "رودمپ", included: { basic: false, exercise: true, trade: true, max: true } },
  { label: "مدیر برنامه هوشمند", included: { basic: false, exercise: false, trade: false, max: true } },
  { label: "اپلیکیشن موبایل", included: { basic: false, exercise: false, trade: false, max: true }, upcoming: true },
  { label: "یکپارچه‌سازی با ساعت هوشمند", included: { basic: false, exercise: false, trade: false, max: true }, upcoming: true },
  { label: "آنالیز هفتگی هوش مصنوعی", included: { basic: false, exercise: false, trade: false, max: true }, upcoming: true },
  // «تحلیل هوشمند» طبق درخواست صریح دیگر فیچر آماده نیست — به همین بخش
  // «به‌زودی» (تارشده در جدول) منتقل شد.
  { label: "تحلیل هوشمند", included: { basic: false, exercise: false, trade: false, max: true }, upcoming: true },
  { label: "اشتراک‌گذاری با مربی یا دوستان", included: { basic: false, exercise: false, trade: false, max: true }, upcoming: true },
  { label: "ردیابی کدنویسی", included: { basic: false, exercise: false, trade: false, max: true }, upcoming: true },
];


// زیر md عمدا بدون کف‌عرض پیکسلی‌ست (نه minmax با کف px) — تا هیچ‌کدوم از
// عرض صفحه بیرون نزنه و نیازی به اسکرول افقی نباشه، حتی روی باریک‌ترین موبایل؛
// sm یک برش میانی (تبلت) هم داره تا موبایل/دسکتاپ صرف نباشه.
export const PLANS_GRID_COLS = "grid-cols-1 sm:grid-cols-2 md:grid-cols-4";
// روی دسکتاپ (md+) از ستون باریک ۶۲۰px سایت بیرون می‌زنه تا هر ۴ پلن بدون
// اسکرول کنار هم جا بشن.
//
// باگ گزارش‌شده («توی دسکتاپ اشتراک اومده وسط صفحه [و از لبه بیرون می‌زنه]»):
// نسخه‌ی قبلی عرض رو با `w-screen + max-w-[1240px]` می‌ساخت ولی margin-right
// رو یک عدد *ثابت* (-310px، یعنی دقیقا نصف ۱۲۴۰-۶۲۰) می‌ذاشت — درست فقط
// وقتی عرض واقعی دقیقا ۱۲۴۰px بود؛ زیر آن (اکثر لپ‌تاپ‌ها، ۱۰۲۴/۱۲۸۰px)
// که `w-screen` عرض را کوچیک‌تر می‌کرد، همان مارجین ثابت باقی می‌ماند و
// جعبه از لبه بیرون می‌زد. کلاس Tailwind `mx-auto` هم اینجا امتحان شد ولی
// مرورگر مارجین منفی حاصل از auto را قرینه تقسیم نکرد (یک سمت صفر، سمت
// دیگر کل عدد منفی) — به‌جایش `.plans-breakout` در globals.css با یک
// margin-inline صریح و محاسبه‌شده تعریف شده که هر دو سمت را قطعی و برابر
// می‌کند، مستقل از عرض واقعی و جهت (RTL/LTR).
export const BREAKOUT = "plans-breakout";

// روز = نارنجی (طبق طرح جدید)، شب = همون هویت رنگی قبلی سایت (سبز اصلی +
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
// mode="account": کاربر از قبل واردشده — دکمه می‌بره به چک‌اوت واقعی، و
// پلن فعلیش (currentPlanKey) به‌جای دکمه‌ی خرید یه نشان «پلن فعلی تو» می‌گیره.
function PlanCardView({ p, mode, currentPlanKey, upgradeOffer, upgradeFromNameFa }: { p: PlanCard; mode: "landing" | "account"; currentPlanKey?: string | null; upgradeOffer?: UpgradeOffer | null; upgradeFromNameFa?: string }) {
  const t = useThemeTokens();
  const { pricing, ready } = usePlanPricing();
  const durations = enabledDurations(pricing);
  const [picked, setDuration] = useState<Duration | null>(null);
  // مدت انتخاب‌شده اگه از پنل خاموش شده باشه، اولین مدت فعال جاش می‌شینه
  const duration: Duration = picked && durations.includes(picked) ? picked : durations[0];
  const [renewOpen, setRenewOpen] = useState(false);
  const durationGridStyle = { gridTemplateColumns: `repeat(${durations.length}, minmax(0, 1fr))` };
  const cell = isPaidPlanKey(p.key) ? pricing.plans[p.key][duration] : undefined;
  // تا قیمت‌های پنل نرسیده، عدد نشون داده نمی‌شه (نه پیش‌فرض کد که ممکنه عوض شده باشه)
  const priceLabel = ready && cell ? formatToman(cell.price) : "…";
  const originalLabel = ready && cell && cell.original > cell.price ? formatToman(cell.original) : undefined;
  const isCurrent = mode === "account" && currentPlanKey === p.key;
  // پیشنهاد «ارتقا به مکس» فقط روی خود کارت مکس نشون داده می‌شه — فقط
  // وقتی کاربر از قبل پلن ورزش/ترید فعال داره (upgradeOffer از سرور اومده).
  const offer = mode === "account" && upgradeOffer?.toPlanKey === p.key ? upgradeOffer.perDuration[duration] : undefined;
  const originalPrice = offer ? (ready ? priceLabel : undefined) : originalLabel;

  const cardClass = p.highlight
    ? `relative flex flex-col rounded-[22px] border ${t.secondaryBorderSoft} ${t.secondaryBgSoft} p-4 backdrop-blur-xl ${t.secondaryCardShadow}`
    : `relative flex flex-col rounded-[22px] border ${t.cardBorder} ${t.cardBg} p-4 backdrop-blur-xl ${t.shadow}`;

  const buyHref = mode === "landing" ? `/auth/signup?plan=${p.key}&duration=${duration}` : `/subscription/checkout?plan=${p.key}&duration=${duration}`;

  return (
    <div className={cardClass}>
      {p.highlight && (
        <span className={`absolute -top-2.5 right-5 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold text-white ${t.secondaryBg}`}>
          پیشنهادی
        </span>
      )}
      {/* طبق درخواست صریح: زیر تایتل دیگر متن «جزئیات» نوشته نمی‌شود —
          خود جدول مقایسه‌ی پایین صفحه برای همین کافی‌ست. */}
      <div className="flex items-center gap-2">
        <span className={`plan-icon-badge flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${t.accentBgSofter} ${t.accentText}`}>{p.icon}</span>
        <div className={`text-right text-[15px] font-extrabold ${t.accentText}`}>{p.nameFa}</div>
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

      {p.note && (
        <div className={`mt-2 text-[11px] font-bold ${t.accentText}`}>{p.note}</div>
      )}

      {p.free ? (
        mode === "landing" ? (
          <>
            <div className={`mt-3 text-[15px] font-extrabold ${t.heading}`}>رایگان</div>
            <Link href="/auth/signup" className={`mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-center text-[12.5px] font-bold text-white transition hover:brightness-105 active:scale-[0.98] ${t.accentBg}`}>
              شروع رایگان
            </Link>
          </>
        ) : (
          <>
            <div className={`mt-3 text-[15px] font-extrabold ${t.heading}`}>رایگان</div>
            <div className={`mt-2.5 flex w-full items-center justify-center rounded-xl py-2.5 text-center text-[12.5px] font-bold ${t.muted}`}>
              همیشه همراه حساب توئه
            </div>
          </>
        )
      ) : isCurrent ? (
        <>
          {/* پلن فعلی کاربر: به‌جای پیل‌های انتخاب مدت (که برای تصمیم خرید
              معنا دارن، نه پلنی که از قبل خریداری شده)، یه تیک بزرگ وسط
              کارت — بعدش یه باکس جدا برای تمدید که با کلیک، مدت تمدید رو
              می‌پرسه (طبق درخواست صریح کاربر). */}
          <div className="mt-3 flex flex-col items-center gap-1.5 py-1.5">
            <span className={`flex h-11 w-11 items-center justify-center rounded-full text-white ${t.accentBg}`}>
              <Check size={22} strokeWidth={3} />
            </span>
            <span className={`text-[12px] font-bold ${t.heading}`}>پلن فعلی تو</span>
          </div>

          {renewOpen ? (
            <div className={`mt-1.5 flex flex-col gap-2 rounded-xl border ${t.line} p-2.5`}>
              <div className="grid gap-1.5" style={durationGridStyle}>
                {durations.map((d) => {
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
                      {durationLabel(pricing, d)}
                    </button>
                  );
                })}
              </div>
              <div className={`text-center text-[13.5px] font-extrabold ${t.heading}`}>{priceLabel}</div>
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
            // طبق درخواست صریح: دیگر یک دکمه‌ی بزرگ نیست — فقط یک متن
            // کوچک کلیک‌پذیر پایین کارت.
            <button
              type="button"
              onClick={() => setRenewOpen(true)}
              className={`plan-details-btn mt-2 block w-full border-0 bg-transparent p-0 text-center text-[11.5px] font-bold shadow-none no-underline outline-none transition [backdrop-filter:none] hover:bg-transparent hover:shadow-none ${t.accentText}`}
            >
              تمدید اشتراک
            </button>
          )}
        </>
      ) : (
        <>
          {/* دکمه‌های انتخاب مدت — پیل تخت، انتخاب‌شده پر رنگ اصلی، بدون
              نشان چک‌مارک. از راست: 1 ماهه، 3 ماهه، 6 ماهه، 12 ماهه.
              رنگ پس‌زمینه/متن عمدا inline style‌ه، نه کلاس Tailwind — چون
              قانون سراسری `button:hover` (globals.css) اسپسیفیسیتی‌ش از یه
              کلاس Tailwind تکی بیشتره و روی هاور/لمس، رنگ انتخاب‌شده رو با
              یه تینت کم‌رنگ جایگزین می‌کرد؛ inline style همیشه برنده‌ست. */}
          <div className="mt-3 grid gap-1.5" style={durationGridStyle}>
            {durations.map((d) => {
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
                  {durationLabel(pricing, d)}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-[15px] font-extrabold ${t.heading}`}>{offer ? offer.priceLabel : priceLabel}</span>
            {originalPrice && (
              <span className={`text-[12px] font-semibold line-through ${t.muted}`}>{originalPrice}</span>
            )}
          </div>

          {offer && (
            <div className={`mt-1.5 text-[10.5px] font-semibold leading-relaxed ${t.muted}`}>
              {upgradeFromNameFa ? `با اعتبار پلن ${upgradeFromNameFa}‌ی فعلیت — ` : ""}
              {offer.capped ? `این پلن تا ${formatJalaliLong(offer.capEndIso)} فعال می‌مونه` : "به‌مدت کامل خریداری‌شده فعال می‌مونه"}
            </div>
          )}

          <Link
            href={buyHref}
            className={`mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-center text-[12.5px] font-bold transition active:scale-[0.98] ${p.highlight ? `text-white hover:brightness-105 ${t.secondaryBg}` : `border ${t.line} ${t.secondaryBtnBg} ${t.heading} ${t.accentHoverBorder}`}`}
          >
            <ShoppingCart size={14} /> {mode === "landing" ? "شروع با این پلن" : "خرید اشتراک"}
          </Link>
        </>
      )}
    </div>
  );
}

// لیبل‌های کاملا لاتین (مثل نام‌های انگلیسی باقی‌مانده) باید چپ‌چین بمونن،
// نه راست‌چین — حتی داخل جدولی که کلا dir="rtl" ارث می‌بره. «مدیربرنامه
// هوشمند» فارسی‌ست، پس این قانون رویش اثر نمی‌کند و خودش راست‌چین می‌ماند.
const isLatinLabel = (label: string) => /^[A-Za-z0-9 .,'&/-]+$/.test(label.trim());

// گرید پلن‌ها + جدول مقایسه — از صفحه‌ی لندینگ و صفحه‌ی اشتراک داخل
// حساب هردو استفاده می‌شه، فقط رفتار دکمه‌ها (mode) فرق می‌کنه.
export function PlansSection({ mode, currentPlanKey, title = "از چیزی که لازم داری شروع کن.", upgradeOffer }: { mode: "landing" | "account"; currentPlanKey?: string | null; title?: string; upgradeOffer?: UpgradeOffer | null }) {
  const t = useThemeTokens();
  // توی صفحه‌ی اشتراک (mode="account") کارت پلن رایگان (اگه وجود داشته باشه) نشون داده نمی‌شه.
  // «روتین من» الان پولیه و این‌جا نشون داده می‌شه.
  // این فقط کارت خرید بالای صفحه رو مخفی می‌کنه، نه دیتای پلن: PLANS_IRAN
  // دست‌نخورده می‌مونه و جدول مقایسه‌ی پایین (tablePlans) هم‌چنان ستون
  // رایگان رو داره، چون خود جدول برای مقایسه‌ست، نه خرید.
  const tablePlans = PLANS_IRAN;
  const plans = mode === "account" ? PLANS_IRAN.filter((p) => !p.free) : PLANS_IRAN;
  const compareRows = COMPARE_ROWS_IRAN;
  const mainRows = compareRows.filter((r) => !r.upcoming);
  const upcomingRows = compareRows.filter((r) => r.upcoming);
  const upgradeFromNameFa = upgradeOffer ? plans.find((pp) => pp.key === upgradeOffer.fromPlanKey)?.nameFa : undefined;

  return (
    <>
      {title && (
        <div style={{ textAlign: "center", marginBottom: mode === "landing" ? 8 : 18 }}>
          <h2 className={`text-2xl font-extrabold ${t.heading}`}>{title}</h2>
        </div>
      )}
      {/* دوره‌ی آزمایشی حساب تازه (lib/trial.ts) — فقط لندینگ؛ صفحه‌ی اشتراک
          همین متن رو توی یادداشت بالای خودش داره. متن ساده، بی‌بک‌گراند. */}
      {mode === "landing" && (
        <p className={`text-center text-[13px] font-bold ${t.muted}`} style={{ marginBottom: 18 }}>
          14 روز رایگان امتحان کن و بعد بر اساس نیازت، امکانات موردنظرت را انتخاب کن. هر حساب تازه: {TRIAL_COPY_FA}. «نومو» 10 پیام رایگان دارد و در پلن‌های پولی نامحدود است.
        </p>
      )}

      <div className={`grid gap-6 pt-5 ${PLANS_GRID_COLS} ${BREAKOUT}`}>
        {plans.map((p) => (
          <PlanCardView key={p.key} p={p} mode={mode} currentPlanKey={currentPlanKey} upgradeOffer={upgradeOffer} upgradeFromNameFa={upgradeFromNameFa} />
        ))}
      </div>

      {/* جدول HTML واقعی؛ بدون sticky/بک‌گراند مخصوص ستون لیبل و بدون
          minWidth/overflow-x — با tableLayout:fixed و عرض‌های درصدی، خودش
          با اندازه‌ی هر صفحه (حتی موبایل باریک) جمع می‌شه، بدون نیاز به اسکرول.
          ردیف‌های «به‌زودی» توی یک tbody جدا، ولی همون یک باکس/جدول‌ان —
          به‌جای متن ساده‌ی «به‌زودی…» (که کم‌کنتراست و عملا نامرئی بود)،
          محتوای واقعی ردیف‌ها با بلور کم تمام‌کنتراست پیش‌نمایش می‌شه و یک
          نشان صریح «به‌زودی» روش می‌شینه — حس شیشه‌ی مات، نه خالی. */}
      <div id="plans-compare-table" className={`mt-6 scroll-mt-[96px] rounded-[24px] border ${t.cardBorder} ${t.cardBg} p-6 ${t.shadow} backdrop-blur-2xl ${BREAKOUT}`}>
        <table className="w-full border-collapse" style={{ tableLayout: "fixed" }} aria-label="مقایسه پلن‌ها">
          <colgroup>
            <col style={{ width: "24%" }} />
            {tablePlans.map((p) => <col key={p.key} style={{ width: "19%" }} />)}
          </colgroup>
          <thead>
            <tr className={`border-b ${t.line}`}>
              <th className={`pb-3 text-right text-[12.5px] font-bold ${t.heading}`} />
              {tablePlans.map((p) => (
                <th key={p.key} className={`pb-3 text-center text-[11.5px] font-bold ${t.heading}`}>{p.nameFa}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mainRows.map((row) => (
              <tr key={row.label} className={`border-b ${t.line} last:border-none`}>
                <th scope="row" dir={isLatinLabel(row.label) ? "ltr" : undefined} className={`py-3.5 text-[11.5px] font-normal ${t.muted} ${isLatinLabel(row.label) ? "text-left" : "text-right"}`}>{row.label}</th>
                {tablePlans.map((p) => (
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
                <td colSpan={tablePlans.length + 1} className={`border-t ${t.line} p-0`}>
                  <div className="relative py-1">
                    <table
                      className="pointer-events-none w-full select-none border-collapse blur-sm"
                      style={{ tableLayout: "fixed" }}
                      aria-hidden="true"
                    >
                      <colgroup>
                        <col style={{ width: "24%" }} />
                        {tablePlans.map((p) => <col key={p.key} style={{ width: "19%" }} />)}
                      </colgroup>
                      <tbody>
                        {upcomingRows.map((row) => (
                          <tr key={row.label}>
                            <th scope="row" dir={isLatinLabel(row.label) ? "ltr" : undefined} className={`py-3.5 text-[11.5px] font-normal ${t.muted} ${isLatinLabel(row.label) ? "text-left" : "text-right"}`}>{row.label}</th>
                            {tablePlans.map((p) => (
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
                        {"به‌زودی"}
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

export function findPlanCard(key: string): PlanCard | undefined {
  return PLANS_IRAN.find((p) => p.key === key);
}
