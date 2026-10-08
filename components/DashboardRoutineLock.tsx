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

export function DashboardRoutineLock({ area }: { area: "today" | "heat" }) {
  const today = area === "today";
  // قیمت از پنل ادمین (/admin/pricing)، نه عدد ثابت
  const { pricing, ready } = usePlanPricing();
  const offer = entryOffer(pricing, ROUTINE_PLAN_KEY);
  const buyHref = `/subscription/checkout?plan=${ROUTINE_PLAN_KEY}&duration=${offer.duration}`;
  return (
    <BentoCard area={area} className="db-lock" label={today ? "برنامه‌های امروز" : "نقشه‌ی ثبات"}>
      <CardHead icon={today ? "routine" : "chart"} title={today ? "برنامه‌های امروز" : "نقشه‌ی ثبات"} />
      <div className="db-empty">
        <span className="db-empty-icon"><DashIcon name="lock" /></span>
        <p>
          {today
            ? `دوره‌ی ${ROUTINE_TRIAL_DAYS} روزه‌ی رایگان «روتین من» تموم شد. برنامه‌ها و تیک‌هات سر جاشونه — با خرید پلن همون‌جا ادامه بده.`
            : "استریک، نقشه‌ی ثبات و اچیومنت‌ها با پلن «روتین من» دوباره فعال می‌شن."}
        </p>
        <Link href={buyHref} prefetch={false} className="trade-primary-btn db-empty-cta">
          {ready ? `خرید «روتین من» — ${offer.label}` : "خرید «روتین من»"}
        </Link>
      </div>
    </BentoCard>
  );
}
