"use client";

// کارت «خواب» داشبورد بخش روتین و ورزش: خلاصه‌ی آخرین شب نسبت به هدف، هفت شب
// اخیر و دکمه‌ی ثبت/ویرایش خواب. داده از همون GET /api/dashboard میاد (data.sleep)؛
// ثبت با همون SleepLogSheet و persistence صفحه‌ی /sleep (lib/storage.ts) انجام
// می‌شه و پنجره فقط با زدن دکمه (next/dynamic) لود می‌شه.

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { SmartLink as Link } from "@/components/SmartLink";
import { m as motion } from "framer-motion";
import { Moon, Pencil, Plus } from "lucide-react";
import { faNum, isoLocal, weekdayShort } from "@/lib/jalali";
import { clockOf, durationLabel, type SleepRecord } from "@/lib/sleep";
import { goalDiffKind, signedDuration } from "@/lib/sleepWeekStats";
import { getSleepRange } from "@/lib/storage";
import { getSleepGoal } from "@/lib/sleepGoal";
import { DEFAULT_SLEEP, DEFAULT_WAKE } from "@/lib/wakeSleep";
import type { DashSleep } from "@/lib/dashboardTypes";
import { BentoCard, CardHead, D_EASE, Meter, Skel } from "./DashboardKit";
import { Spinner } from "./Spinner";
import { tr } from "@/lib/i18n";
import type { SleepLogSheetProps } from "./SleepLogSheet";

const loadSheet = () => import("./SleepLogSheet").then((m) => m.SleepLogSheet);
const SleepLogSheet = dynamic(loadSheet, { ssr: false });

type SheetState = { initial: SleepLogSheetProps["initial"]; existing: boolean; target: { wake: string; sleep: string } } | null;

export function DashboardSleep({ sleep, loading, onChanged }: { sleep: DashSleep | null; loading: boolean; onChanged?: () => void }) {
  const [sheet, setSheet] = useState<SheetState>(null);
  const [busy, setBusy] = useState(false);

  // امروز (روز بیدارشدن) ثبت شده؟ ویرایش؛ وگرنه ثبت تازه برای امروز
  const openLog = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      void loadSheet();
      const today = isoLocal(new Date());
      const [g, list] = await Promise.all([
        getSleepGoal().catch(() => ({ goal: { wake: DEFAULT_WAKE, sleep: DEFAULT_SLEEP } })),
        getSleepRange(today, today).catch(() => [] as SleepRecord[]),
      ]);
      const rec = list.find((r) => r.date === today) ?? null;
      setSheet({ initial: rec ?? { date: today }, existing: !!rec, target: g.goal });
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const todayLogged = !!sleep?.lastNight && sleep.lastNight.iso === isoLocal(new Date());
  const logBtn = (
    <button type="button" className="btn btn-primary btn-sm db-sleep-log" onClick={openLog} onPointerEnter={() => { void loadSheet(); }} disabled={busy}>
      {busy ? <Spinner label={null} /> : todayLogged ? <Pencil aria-hidden width={15} height={15} /> : <Plus aria-hidden width={16} height={16} />}
      <span>{todayLogged ? tr("ویرایش خواب دیشب", "Edit last night") : tr("ثبت خواب", "Log sleep")}</span>
    </button>
  );

  return (
    <BentoCard area="sleep" className="db-sleep" label={tr("خواب", "Sleep")}>
      <CardHead icon="moon" title={tr("خواب", "Sleep")} href="/sleep" hrefLabel={tr("آمار", "Stats")} />
      {loading ? (
        <Skel w="100%" h={110} r={12} />
      ) : !sleep ? null : !sleep.lastNight ? (
        <div className="db-empty db-sleep-empty">
          <span className="db-empty-icon"><Moon aria-hidden /></span>
          <p>{tr("در هفت شب اخیر خوابی ثبت نشده. با ثبت خواب، مقایسه با هدف و روند هفته‌ت این‌جا میاد.", "No sleep logged in the last seven nights. Log your sleep to see how you compare to your goal.")}</p>
          {logBtn}
        </div>
      ) : (
        <SleepBody s={sleep} action={logBtn} />
      )}
      {sheet && (
        <SleepLogSheet
          open
          initial={sheet.initial}
          existing={sheet.existing}
          target={sheet.target}
          onClose={() => setSheet(null)}
          onChanged={() => { setSheet(null); onChanged?.(); }}
        />
      )}
    </BentoCard>
  );
}

function SleepBody({ s, action }: { s: DashSleep; action: React.ReactNode }) {
  const last = s.lastNight!;
  const diff = last.minutes - s.goalMin;
  const top = Math.max(s.goalMin * 1.25, ...s.week.map((w) => w.minutes));
  const [y, m, d] = last.iso.split("-").map(Number);
  return (
    <div className="db-sleep-body">
      <div className="db-sleep-top">
        <span className="db-sleep-cap">{tr("آخرین شب ثبت‌شده", "Last logged night")} · {weekdayShort(new Date(y, m - 1, d).getDay())}</span>
        <b className="db-sleep-dur">{durationLabel(last.minutes)}</b>
        <span className="db-sleep-times" dir="ltr">{faNum(clockOf(last.sleptAt))} {"→"} {faNum(clockOf(last.wokeAt))}</span>
        <Meter value={last.minutes / s.goalMin} color="var(--moon)" delay={0.3} />
        <span className="db-sleep-sub">
          <span>{tr(`هدف ${durationLabel(s.goalMin)}`, `Goal ${durationLabel(s.goalMin)}`)}</span>
          <b dir="ltr" className={`db-sleep-diff is-${goalDiffKind(diff)}`}>{faNum(signedDuration(diff))}</b>
          {s.avgMin !== null && <span>{tr(`میانگین هفته ${durationLabel(s.avgMin)}`, `Weekly avg ${durationLabel(s.avgMin)}`)}</span>}
        </span>
      </div>
      <ul className="db-sleep-week" aria-label={tr("هفت شب اخیر", "Last seven nights")}>
        {s.week.map((w, i) => {
          const [yy, mm, dd] = w.iso.split("-").map(Number);
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
                <span className="db-sleep-wd">{weekdayShort(new Date(yy, mm - 1, dd).getDay())}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="db-sleep-act">{action}</div>
    </div>
  );
}
