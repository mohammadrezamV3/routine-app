"use client";

// نقشه‌ی ثبات بخش ورزش — همان کامپوننت و استایل نقشه‌ی ثبات داشبورد روتین
// (HeatmapBody)؛ فقط داده فرق می‌کنه (lib/workoutHeat.ts). دو نسخه:
//  • WorkoutHeatPanel: پایین صفحه‌ی /exercise و /calorie، داده رو خودش از
//    GET /api/workout/heat می‌گیره.
//  • WorkoutHeatBento: کارت داشبورد بخش ورزش؛ داده از همون GET /api/dashboard
//    میاد (بدون درخواست اضافه) و با SegmentedTabs بین تمرین و کالری عوض می‌شه.

import "@/app/dashboard/dashboard.css";
import { useEffect, useMemo, useState } from "react";
import { DashCard } from "./DashCard";
import { BentoCard, CardHead } from "./DashboardKit";
import { HeatmapBody } from "./DashboardHeatmap";
import { SegmentedTabs } from "./SegmentedTabs";
import { isoLocal } from "@/lib/jalali";
import { streakFromHeatmap } from "@/lib/dashboardCompute";
import { buildPctHeat, heatDaysToMap, WORKOUT_HEAT_WEEKS, type HeatDay } from "@/lib/workoutHeat";
import { tr } from "@/lib/i18n";

export type WorkoutHeatKind = "exercise" | "calorie";

const titleOf = (kind: WorkoutHeatKind) => (kind === "exercise" ? tr("نقشه‌ی ثبات تمرین", "Workout consistency map") : tr("نقشه‌ی ثبات کالری", "Calorie consistency map"));

function useHeatCells(days: HeatDay[] | null | undefined) {
  return useMemo(() => buildPctHeat(new Date(), WORKOUT_HEAT_WEEKS, heatDaysToMap(days)), [days]);
}

export function WorkoutHeatPanel({ kind, delay }: { kind: WorkoutHeatKind; delay?: number }) {
  const [days, setDays] = useState<HeatDay[] | null>(null);
  const [serverStreak, setServerStreak] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    const tz = -new Date().getTimezoneOffset();
    fetch(`/api/workout/heat?kind=${kind}&date=${isoLocal(new Date())}&tz=${tz}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d) return;
        setDays(Array.isArray(d.heat) ? d.heat : []);
        setServerStreak(typeof d.streak === "number" ? d.streak : null);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [kind]);
  const heat = useHeatCells(days);
  const streak = kind === "exercise" && serverStreak !== null ? serverStreak : days ? streakFromHeatmap(heat) : null;
  return (
    <DashCard delay={delay} label={titleOf(kind)} className="db-heat flex flex-col gap-3">
      <CardHead icon="chart" title={titleOf(kind)} />
      <HeatmapBody heat={heat} streak={streak} ready={days !== null} />
    </DashCard>
  );
}

export function WorkoutHeatBento({ exercise, calorie, loading }: { exercise: HeatDay[] | null; calorie: HeatDay[] | null; loading: boolean }) {
  const kinds = [exercise ? "exercise" : null, calorie ? "calorie" : null].filter(Boolean) as WorkoutHeatKind[];
  const [pick, setPick] = useState<WorkoutHeatKind>("exercise");
  const kind: WorkoutHeatKind = kinds.includes(pick) ? pick : kinds[0] ?? "exercise";
  const days = kind === "exercise" ? exercise : calorie;
  const heat = useHeatCells(days);
  const streak = days ? streakFromHeatmap(heat) : null;
  return (
    <BentoCard area="wheat" className="db-heat" label={tr("نقشه‌ی ثبات", "Consistency map")}>
      <CardHead
        icon="chart"
        title={tr("نقشه‌ی ثبات", "Consistency map")}
        href={kind === "exercise" ? "/exercise" : "/calorie"}
        hrefLabel={kind === "exercise" ? tr("تمرین", "Workout") : tr("کالری", "Calories")}
      />
      {kinds.length > 1 && (
        <SegmentedTabs
          className="!mt-0"
          ariaLabel={tr("نوع نقشه", "Map type")}
          active={kind}
          options={[{ value: "exercise", label: tr("تمرین", "Workout") }, { value: "calorie", label: tr("کالری", "Calories") }]}
          onChange={(v) => setPick(v as WorkoutHeatKind)}
        />
      )}
      <HeatmapBody heat={heat} streak={streak} ready={!loading && days !== null} />
    </BentoCard>
  );
}
