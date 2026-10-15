"use client";

// کارت «خواب» داشبورد بخش روتین و ورزش: خواب آخرین شب ثبت‌شده نسبت به هدف و هفت
// شب اخیر. داده از همون GET /api/dashboard میاد (data.sleep)، پس هیچ درخواست جدایی
// روی مسیر لود نیست؛ ثبت و ویرایش خواب فقط در صفحه‌ی /sleep انجام می‌شه.

import { SmartLink as Link } from "@/components/SmartLink";
import { m as motion } from "framer-motion";
import { weekdayShort } from "@/lib/jalali";
import { durationLabel } from "@/lib/sleep";
import type { DashSleep } from "@/lib/dashboardTypes";
import { BentoCard, CardHead, D_EASE, EmptyState, Meter, Skel } from "./DashboardKit";
import { tr } from "@/lib/i18n";

export function DashboardSleep({ sleep, loading }: { sleep: DashSleep | null; loading: boolean }) {
  return (
    <BentoCard area="sleep" className="db-sleep" label={tr("خواب", "Sleep")}>
      <CardHead icon="moon" title={tr("خواب", "Sleep")} href="/sleep" hrefLabel={tr("ثبت و آمار", "Log and stats")} />
      {loading ? (
        <Skel w="100%" h={110} r={12} />
      ) : !sleep ? null : !sleep.lastNight ? (
        <EmptyState icon="moon" text={tr("در هفت شب اخیر خوابی ثبت نشده — با ثبت خواب، امتیاز و روند هفته‌ت این‌جا میاد.", "No sleep logged in the last seven nights — log your sleep to see your week here.")} href="/sleep" cta={tr("ثبت خواب", "Log sleep")} />
      ) : (
        <SleepBody s={sleep} />
      )}
    </BentoCard>
  );
}

function SleepBody({ s }: { s: DashSleep }) {
  const last = s.lastNight!;
  const top = Math.max(s.goalMin * 1.25, ...s.week.map((w) => w.minutes));
  return (
    <div className="db-sleep-body">
      <div className="db-sleep-top">
        <b className="db-sleep-dur">{durationLabel(last.minutes)}</b>
        <span className="db-sleep-sub">
          {tr(`هدف: ${durationLabel(s.goalMin)}`, `Goal: ${durationLabel(s.goalMin)}`)}
          {s.avgMin !== null && <> · {tr(`میانگین هفته: ${durationLabel(s.avgMin)}`, `Weekly average: ${durationLabel(s.avgMin)}`)}</>}
        </span>
        <Meter value={last.minutes / s.goalMin} color="var(--moon)" delay={0.3} />
      </div>
      <ul className="db-sleep-week" aria-label={tr("هفت شب اخیر", "Last seven nights")}>
        {s.week.map((w, i) => {
          const [y, m, d] = w.iso.split("-").map(Number);
          const logged = w.minutes > 0;
          return (
            <li key={w.iso}>
              <Link href={`/sleep?date=${w.iso}`} prefetch={false} className={`db-sleep-day${logged ? "" : " is-empty"}${logged && w.minutes >= s.goalMin * 0.9 ? " is-ok" : ""}`} title={logged ? durationLabel(w.minutes) : tr("ثبت نشده", "Not logged")}>
                <span className="db-sleep-bar">
                  <motion.span
                    className="db-sleep-fill"
                    style={{ height: `${Math.round((w.minutes / top) * 100)}%` }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.7, ease: D_EASE, delay: 0.25 + i * 0.05 }}
                  />
                </span>
                <span className="db-sleep-wd">{weekdayShort(new Date(y, m - 1, d).getDay())}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
