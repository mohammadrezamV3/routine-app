"use client";

// قفل ماژول پولی در داشبورد زیردامنه‌ی ورزش و ترید: وقتی کاربر ماژول همون بخش رو نداره،
// به‌جای یک بخش خالی، کارتی با پیام خرید جای کارت می‌شینه (همون الگوی DashboardRoutineLock).
// هیچ داده‌ای نشون داده نمی‌شه؛ گیت واقعی سمت سرور (buildDashboard + requireModule).

import { SmartLink as Link } from "@/components/SmartLink";
import { BentoCard, CardHead } from "./DashboardKit";
import { DashIcon, type DashIconName } from "./DashboardIcons";
import { tr } from "@/lib/i18n";

export type LockedArea = "ex" | "cal" | "trade";

const META: Record<LockedArea, { icon: DashIconName; title: () => string }> = {
  ex: { icon: "dumbbell", title: () => tr("برنامه‌ی تمرینی", "Workout plan") },
  cal: { icon: "apple", title: () => tr("کالری‌شمار", "Calorie tracker") },
  trade: { icon: "candles", title: () => tr("ژورنال و بازار", "Journal and market") },
};

export function DashboardModuleLock({ area }: { area: LockedArea }) {
  const m = META[area];
  return (
    <BentoCard area={area} className="db-lock" label={m.title()}>
      <CardHead icon={m.icon} title={m.title()} />
      <div className="db-empty">
        <span className="db-empty-icon"><DashIcon name="lock" /></span>
        <p>{tr("این بخش با خرید پلن فعال می‌شه. بعد از فعال‌سازی، آمار و برنامه‌هات همین‌جا زنده می‌شن.", "This section unlocks with a plan. Once it is active, your stats and plans come alive right here.")}</p>
        <Link href="/subscription" prefetch={false} className="trade-primary-btn db-empty-cta">{tr("مشاهده‌ی پلن‌ها", "View plans")}</Link>
      </div>
    </BentoCard>
  );
}
