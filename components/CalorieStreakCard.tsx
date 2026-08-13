"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { faNum, FA_WEEKDAY_SHORT, isoLocal } from "@/lib/jalali";

type Entry = { customCalories: number; date?: string };

const WINDOW_DAYS = 6;

function dailyTotals(entries: Entry[]): Record<string, number> {
  const byDate: Record<string, number> = {};
  for (const e of entries) {
    const d = (e.date || "").slice(0, 10);
    if (!d) continue;
    byDate[d] = (byDate[d] || 0) + e.customCalories;
  }
  return byDate;
}

// «روند موفقیت» — دقیقاً هم‌سبکِ رفرنسی که کاربر داد: عددِ بزرگِ روزهای
// متوالی + یه ردیف دایره‌ی حرفِ‌روزها (تیکِ سبز = اون روز کالری ثبت شده و
// از هدف رد نشده). امروز همیشه «در انتظار»ه (دایره‌ی خالی، بدون تیک) چون
// هنوز روز تموم نشده؛ شمارشِ روزهای متوالی از دیروز به عقب حساب می‌شه.
// عمداً بدونِ دکمه‌ی «مشاهده جزئیات» — طبقِ درخواستِ صریحِ کاربر.
export function CalorieStreakCard({ rangeEntries, targetKcal }: { rangeEntries: Entry[]; targetKcal: number }) {
  const byDate = dailyTotals(rangeEntries);
  const todayKey = isoLocal(new Date());

  function isSuccess(dateKey: string): boolean {
    const total = byDate[dateKey];
    return !!total && total > 0 && total <= targetKcal;
  }

  let streak = 0;
  for (let i = 1; i <= 90; i++) {
    const key = isoLocal(new Date(Date.now() - i * 24 * 60 * 60 * 1000));
    if (isSuccess(key)) streak++;
    else break;
  }

  // امروز باید اولین فرزندِ DOM باشه — توی چیدمانِ RTL یعنی سمتِ راست (دقیقاً
  // مثلِ رفرنس: «ش» امروز و خالیه، سمتِ راست؛ روزهای قدیمی‌تر به چپ می‌رن)
  const days = Array.from({ length: WINDOW_DAYS }, (_, i) => {
    const offset = i;
    const d = new Date(Date.now() - offset * 24 * 60 * 60 * 1000);
    const key = isoLocal(d);
    const isToday = key === todayKey;
    return { key, letter: FA_WEEKDAY_SHORT[d.getDay()], done: !isToday && isSuccess(key), isToday };
  });

  return (
    <div className="tm-extra calorie-streak-card">
      <div className="domain-sub">روند موفقیت</div>

      <div className="calorie-streak-count">
        <span className="calorie-streak-count-num mono">{faNum(streak)}</span>
        <span className="calorie-streak-count-label">روز<br />متوالی</span>
      </div>

      <div className="calorie-streak-days">
        {days.map((d, i) => (
          <div key={d.key} className="calorie-streak-day">
            <motion.div
              className={`calorie-streak-dot${d.done ? " on" : ""}`}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25, delay: i * 0.05 }}
            >
              {d.done && <Check size={13} strokeWidth={3} />}
            </motion.div>
            <span className="calorie-streak-day-letter">{d.letter}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
