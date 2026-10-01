"use client";

// کارت‌های «روتین من» وقتی دوره‌ی ۱۴ روزه‌ی رایگان تموم شده و پلن خریده نشده.
// جای «برنامه‌های امروز» و «نقشه‌ی ثبات» می‌شینن تا چیدمان بنتو خالی نمونه.
// هیچ داده‌ی واقعی‌ای نشون داده نمی‌شه — فقط پیام خرید (گیت واقعی سمت سرور).

import Link from "next/link";
import { ROUTINE_PLAN_KEY, ROUTINE_PLAN_PRICE_TOMAN, ROUTINE_TRIAL_DAYS } from "@/lib/trial";
import { BentoCard, CardHead } from "./DashboardKit";
import { DashIcon } from "./DashboardIcons";

const BUY = `/subscription/checkout?plan=${ROUTINE_PLAN_KEY}&duration=1`;

export function DashboardRoutineLock({ area }: { area: "today" | "heat" }) {
  const today = area === "today";
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
        <Link href={BUY} prefetch={false} className="trade-primary-btn db-empty-cta">
          خرید «روتین من» — ماهانه {ROUTINE_PLAN_PRICE_TOMAN.toLocaleString("en-US")} تومان
        </Link>
      </div>
    </BentoCard>
  );
}
