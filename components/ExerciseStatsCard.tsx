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
      <div className="grid grid-cols-3 items-start gap-2 sm:gap-4">
        <div className="flex flex-col items-center gap-2 sm:gap-3">
          <span className="text-[10px] font-semibold text-dash-muted sm:text-[12px]">تعداد جلسات</span>
          <div className="flex items-center justify-center" style={{ height: 72 }}>
            <span className="mono whitespace-nowrap text-[18px] font-bold text-dash-text sm:text-[22px]">
              {sessionsDone}
              <span className="text-dash-muted"> / {sessionsTotal}</span>
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 sm:gap-3">
          <span className="text-[10px] font-semibold text-dash-muted sm:text-[12px]">پیشرفت امروز</span>
          <span className="sm:hidden"><DashProgressCircle value={todayPct} size={52} strokeWidth={4.5} /></span>
          <span className="hidden sm:inline-block"><DashProgressCircle value={todayPct} size={72} strokeWidth={6} /></span>
        </div>

        <div className="flex flex-col items-center gap-2 sm:gap-3">
          <span className="text-[10px] font-semibold text-dash-muted sm:text-[12px]">پیشرفت هفتگی</span>
          <span className="sm:hidden"><DashProgressCircle value={weekPct} size={52} strokeWidth={4.5} /></span>
          <span className="hidden sm:inline-block"><DashProgressCircle value={weekPct} size={72} strokeWidth={6} /></span>
        </div>
      </div>
    </DashCard>
  );
}
