"use client";

import "@/app/sleep/sleep.css";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DashCard } from "./DashCard";
import { ICONS } from "./NavDrawer";
import { getSleepRange } from "@/lib/storage";
import { useLiveRefresh } from "@/lib/liveSync";
import { isoLocal } from "@/lib/jalali";
import { clockOf, durationLabel, sleepMinutes, type SleepRecord } from "@/lib/sleep";

// کارتِ کوچکِ بالای /weekly: خوابِ دیشب (روزِ بیدارشدنِ امروز) یا دعوت به ثبت.
export function SleepMiniCard() {
  const [rec, setRec] = useState<SleepRecord | null>(null);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const today = isoLocal(new Date());
    const list = await getSleepRange(today, today).catch(() => [] as SleepRecord[]);
    const r = list.find((e) => e.date === today && sleepMinutes(e) > 0) ?? null;
    setRec(r);
    setReady(true);
  }, []);

  useEffect(() => { load(); }, [load]);
  useLiveRefresh(["sleep"], () => { load(); });

  if (!ready) return null;

  return (
    <DashCard className="!p-3 sm:!p-4">
      <Link href="/sleep" prefetch={false} className="sl-mini">
        <span className="sl-mini-ic">{ICONS.sleep}</span>
        <span className="sl-mini-body">
          {rec ? (
            <>
              <b>{durationLabel(sleepMinutes(rec))}</b>
              <span>دیشب · {clockOf(rec.sleptAt)} تا {clockOf(rec.wokeAt)}</span>
            </>
          ) : (
            <>
              <b>ثبتِ خوابِ دیشب</b>
              <span>خوابت را ثبت کن تا آمارش را ببینی</span>
            </>
          )}
        </span>
        <span className="sl-mini-go">{rec ? "جزئیات" : "ثبت"}</span>
      </Link>
    </DashCard>
  );
}
