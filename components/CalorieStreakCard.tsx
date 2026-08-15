"use client";

import { motion } from "framer-motion";
import { Check, Trophy } from "lucide-react";
import { faNum, FA_WEEKDAY_SHORT, isoLocal } from "@/lib/jalali";
import { DashCard } from "./DashCard";
import { StreakFlame } from "./StreakFlame";

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

// «روند موفقیت» — خلاصه‌ی استریک دیگه یه تمبرِ دایره‌ایِ بزرگِ وسطِ کارت
// نیست؛ طبقِ درخواستِ صریحِ کاربر همون بالای کارت، سمتِ چپ (کنارِ تایتل)
// جا گرفته — فقط آیکونِ شعله + عدد، بدونِ هیچ دایره/باکسی دورش (از
// `StreakFlame`ِ مشترک استفاده می‌کنه، هم‌قاعده‌ی استریکِ دوست‌ها توی
// DashFriendsCard). ردیفِ دایره‌ی روزها زیرش دست‌نخورده مونده. امروز
// همیشه «در انتظار»ه (دایره‌ی خالی، بدون تیک) چون هنوز روز تموم نشده.
export function CalorieStreakCard({ rangeEntries, targetKcal, delay }: { rangeEntries: Entry[]; targetKcal: number; delay?: number }) {
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
    <DashCard delay={delay}>
      <div className="flex items-center justify-between pl-2 sm:pl-0">
        <h2 className="flex items-center gap-1.5 text-[13px] font-bold text-dash-text sm:text-[15px]">
          <Trophy className="h-4 w-4 text-dash-green sm:h-[18px] sm:w-[18px]" />
          روند موفقیت
        </h2>
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35, ease: "backOut" }}
        >
          <StreakFlame streak={streak} className="text-[13px] font-extrabold sm:text-[15px]" />
        </motion.div>
      </div>

      <div className="mt-3.5 flex justify-between gap-1.5 sm:mt-4 sm:gap-2">
        {days.map((d, i) => (
          <div key={d.key} className="flex flex-1 flex-col items-center gap-1.5 sm:gap-2">
            <motion.div
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] sm:h-[30px] sm:w-[30px]"
              style={
                d.done
                  ? { borderColor: "var(--accent)", background: "var(--accent)", color: "var(--bg)" }
                  : { borderColor: "var(--line)", color: "var(--muted2)" }
              }
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25, delay: i * 0.05 }}
            >
              {d.done && <Check size={13} strokeWidth={3} />}
            </motion.div>
            <span className="text-[9.5px] font-bold text-dash-muted sm:text-[11px]">{d.letter}</span>
          </div>
        ))}
      </div>
    </DashCard>
  );
}
