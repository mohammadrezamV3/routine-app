"use client";

import { DashCard } from "./DashCard";
import { StreakFlame } from "./StreakFlame";

// جایگزینِ «یادآوری‌ها»ی روتین توی داشبوردِ بدنسازی — استریکِ روزهای
// باشگاهِ پشت‌سرهم + پیغامِ وضعیتِ امروز (هنوز تمرین نکردی / تمرین کردی /
// امروز روزِ باشگاه نیست).
export function ExerciseReminderCard({
  streak,
  todayIsGymDay,
  todayDone,
  delay,
}: {
  streak: number;
  todayIsGymDay: boolean;
  todayDone: boolean;
  delay?: number;
}) {
  const message = !todayIsGymDay
    ? "امروز روزِ باشگاهِ برنامه‌ات نیست."
    : todayDone
    ? "امروز تمرینتو انجام دادی."
    : "امروز هنوز تمرینی ثبت نکردی.";

  return (
    <DashCard delay={delay}>
      <h2 className="text-[13px] font-bold text-dash-text sm:text-[15px]">وضعیت امروز</h2>

      <div className="mt-4 flex flex-col items-center gap-3 sm:mt-5 sm:gap-4">
        <StreakFlame streak={streak} className="text-[22px] sm:text-[26px]" />
        <span className="text-[10.5px] text-dash-muted sm:text-[12px]">روزِ متوالیِ تمرین</span>

        <div
          className="mt-1 w-full rounded-2xl border border-dash-border px-3 py-2.5 text-center text-[11px] text-dash-text sm:mt-2 sm:px-3.5 sm:py-3 sm:text-[12.5px]"
          style={
            todayIsGymDay && !todayDone
              ? { background: "rgba(224,82,82,.1)", borderColor: "rgba(224,82,82,.35)", color: "#E05252" }
              : { background: "rgba(var(--accent-rgb),.08)" }
          }
        >
          {message}
        </div>
      </div>
    </DashCard>
  );
}
