"use client";

// کارت‌های «روتین من» وقتی دوره‌ی ۱۴ روزه‌ی رایگان تموم شده و پلن خریده نشده.
// جای «برنامه‌های امروز» و «نقشه‌ی ثبات» می‌شینن تا چیدمان بنتو خالی نمونه.
// هیچ داده‌ی واقعی‌ای نشون داده نمی‌شه — فقط پیام خرید (گیت واقعی سمت سرور).

import Link from "next/link";
import { ROUTINE_PLAN_KEY, ROUTINE_TRIAL_DAYS } from "@/lib/trial";
import { entryOffer } from "@/lib/planPricing";
import { usePlanPricing } from "@/lib/usePlanPricing";
import { BentoCard, CardHead } from "./DashboardKit";
import { DashIcon } from "./DashboardIcons";
import { tr, isEn } from "@/lib/i18n";

export function DashboardRoutineLock({ area }: { area: "today" | "heat" }) {
  const today = area === "today";
  // قیمت از پنل ادمین (/admin/pricing)، نه عدد ثابت
  const { pricing, ready } = usePlanPricing();
  const offer = entryOffer(pricing, ROUTINE_PLAN_KEY);
  const buyHref = `/subscription/checkout?plan=${ROUTINE_PLAN_KEY}&duration=${offer.duration}`;
  return (
    <BentoCard area={area} className="db-lock" label={today ? tr("برنامه‌های امروز", "Today's programs") : tr("نقشه‌ی ثبات", "Consistency map")}>
      <CardHead icon={today ? "routine" : "chart"} title={today ? tr("برنامه‌های امروز", "Today's programs") : tr("نقشه‌ی ثبات", "Consistency map")} />
      <div className="db-empty">
        <span className="db-empty-icon"><DashIcon name="lock" /></span>
        <p>
          {today
            ? tr(`دوره‌ی ${ROUTINE_TRIAL_DAYS} روزه‌ی رایگان «روتین من» تموم شد. برنامه‌ها و تیک‌هات سر جاشونه — با خرید پلن همون‌جا ادامه بده.`, `Your ${ROUTINE_TRIAL_DAYS}-day free trial of My Routine has ended. Your programs and ticks are still here — buy a plan to pick up where you left off.`)
            : tr("استریک، نقشه‌ی ثبات و اچیومنت‌ها با پلن «روتین من» دوباره فعال می‌شن.", "Your streak, consistency map and achievements come back with the My Routine plan.")}
        </p>
        <Link href={buyHref} prefetch={false} className="trade-primary-btn db-empty-cta">
          {ready ? tr(`خرید «روتین من» — ${offer.label}`, `Get My Routine — ${offer.label}`) : tr("خرید «روتین من»", "Get My Routine")}
        </Link>
      </div>
    </BentoCard>
  );
}
