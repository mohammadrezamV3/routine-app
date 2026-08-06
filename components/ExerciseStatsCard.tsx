"use client";

import { DashCard } from "./DashCard";
import { DashProgressCircle } from "./DashProgressCircle";

// سه‌تیکه‌ی بالای داشبوردِ بدنسازی: تعداد جلساتِ این‌هفته (چقدر رفته/چقدر
// مونده)، درصدِ پیشرفتِ امروز و درصدِ پیشرفتِ هفتگی — دقیقاً هم‌ساختار با
// کارت‌های دیگرِ داشبورد (DashCard + DashProgressCircle).
export function ExerciseStatsCard({
  sessionsDone,
  sessionsTotal,
  todayPct,
  weekPct,
  delay,
}: {
  sessionsDone: number;
  sessionsTotal: number;
  todayPct: number;
  weekPct: number;
  delay?: number;
}) {
  return (
    <DashCard delay={delay}>
      <div className="grid grid-cols-3 items-start gap-2 sm:gap-3">
        <div className="flex flex-col items-center gap-2.5 sm:gap-3">
          <span className="text-center text-[9.5px] font-semibold leading-tight text-dash-muted sm:text-[11px]">تعداد جلسات</span>
          <div className="flex items-center justify-center" style={{ height: 60 }}>
            <span className="mono whitespace-nowrap text-[16px] font-bold text-dash-text sm:text-[19px]" dir="ltr">
              {sessionsDone}
              <span className="text-dash-muted"> / {sessionsTotal}</span>
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2.5 sm:gap-3">
          <span className="text-center text-[9.5px] font-semibold leading-tight text-dash-muted sm:text-[11px]">پیشرفت امروز</span>
          <DashProgressCircle value={todayPct} size={60} strokeWidth={5} />
        </div>

        <div className="flex flex-col items-center gap-2.5 sm:gap-3">
          <span className="text-center text-[9.5px] font-semibold leading-tight text-dash-muted sm:text-[11px]">پیشرفت هفتگی</span>
          <DashProgressCircle value={weekPct} size={60} strokeWidth={5} />
        </div>
      </div>
    </DashCard>
  );
}
