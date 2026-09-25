import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Flame, Plus, Settings2, Trash2 } from "lucide-react";
import { useNetworkStatus } from "@/lib/useNetworkStatus";
import { tapHaptic } from "@/lib/haptics";
import { useLiveQuery } from "../hooks/useLiveQuery";
import { fitnessDb } from "../db";
import { entriesForDate, getActiveCalorieTarget, kcalOf, macrosOf, removeCalorieEntry, isoLocal } from "../lib/repo";
import { fitnessRoutePaths } from "../routes";
import { computeCalorieStreak } from "../lib/stats";
import { Card, SectionTitle, ProgressRing, MacroBar, EmptyState, OnlineFeatureButton } from "../components/ui";
import AddCalorieEntrySheet from "../components/AddCalorieEntrySheet";
import GoalSheet from "../components/GoalSheet";
import type { CalorieEntryRow } from "../lib/exerciseTypes";

const MEAL_LABELS: Record<string, string> = { breakfast: "صبحانه", lunch: "ناهار", dinner: "شام", snack: "میان‌وعده" };

export default function CalorieTab() {
  const navigate = useNavigate();
  const online = useNetworkStatus();
  const [dateOffset, setDateOffset] = useState(0);
  const date = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + dateOffset);
    return isoLocal(d);
  }, [dateOffset]);

  const target = useLiveQuery(getActiveCalorieTarget, [], undefined);
  const entries = useLiveQuery(() => entriesForDate(date), [date], [] as CalorieEntryRow[]);
  const loggedDates = useLiveQuery(
    async () => new Set((await fitnessDb.calorieEntries.filter((e) => !e.deletedAt).toArray()).map((e) => e.date)),
    [],
    new Set<string>()
  );

  const [addOpen, setAddOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);

  const totalKcal = entries.reduce((s, e) => s + kcalOf(e), 0);
  const macros = entries.reduce(
    (acc, e) => {
      const m = macrosOf(e);
      return { protein: acc.protein + m.protein, carbs: acc.carbs + m.carbs, fat: acc.fat + m.fat };
    },
    { protein: 0, carbs: 0, fat: 0 }
  );
  const streak = computeCalorieStreak(loggedDates, new Date());
  const pct = target ? Math.round((totalKcal / target.dailyTargetKcal) * 100) : 0;

  const byMeal = useMemo(() => {
    const map: Record<string, CalorieEntryRow[]> = {};
    for (const e of entries) {
      const k = e.mealType ?? "other";
      (map[k] ??= []).push(e);
    }
    return map;
  }, [entries]);

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 pt-4">
      <div className="flex items-center justify-between">
        <button onClick={() => setDateOffset((o) => o - 1)} style={{ width: 44, height: 44 }} aria-label="روز قبل">
          <ChevronRight size={20} color="var(--muted)" />
        </button>
        <span className="font-vazir text-[13px] font-medium" style={{ color: "var(--text)" }}>
          {dateOffset === 0 ? "امروز" : date}
        </span>
        <button
          onClick={() => setDateOffset((o) => Math.min(0, o + 1))}
          style={{ width: 44, height: 44 }}
          aria-label="روز بعد"
          disabled={dateOffset === 0}
        >
          <ChevronLeft size={20} color={dateOffset === 0 ? "var(--surface-line)" : "var(--muted)"} />
        </button>
      </div>

      <Card>
        <div className="flex items-center justify-between gap-4">
          <ProgressRing
            pct={pct}
            label={String(totalKcal)}
            sub={target ? `از ${target.dailyTargetKcal} kcal` : "kcal"}
          />
          <div className="flex flex-1 flex-col gap-2.5">
            <MacroBar label="پروتئین" value={macros.protein} target={target?.proteinTargetG} color="#3e7bfa" />
            <MacroBar label="کربوهیدرات" value={macros.carbs} target={target?.carbsTargetG} color="#f5a623" />
            <MacroBar label="چربی" value={macros.fat} target={target?.fatTargetG} color="#e05252" />
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setAddOpen(true)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl font-vazir text-[13.5px] font-semibold"
          style={{ minHeight: 48, background: "var(--accent)", color: "#fff" }}
        >
          <Plus size={16} /> افزودنِ غذا
        </button>
        <button
          onClick={() => setGoalOpen(true)}
          aria-label="تنظیمِ هدف"
          className="flex items-center justify-center rounded-xl"
          style={{ width: 48, height: 48, background: "var(--surface-2)" }}
        >
          <Settings2 size={17} color="var(--text)" />
        </button>
      </div>

      <OnlineFeatureButton label="اسکنِ عکسِ غذا با هوش مصنوعی" online={online} />

      <Card>
        <div className="flex items-center justify-between">
          <span className="font-vazir text-[13px]" style={{ color: "var(--text)" }}>
            استریکِ ثبتِ کالری
          </span>
          <div className="flex items-center gap-1.5">
            <Flame size={14} color="var(--accent)" />
            <span className="font-vazir text-[13px] font-bold" style={{ color: "var(--text)" }}>
              {streak} روز
            </span>
          </div>
        </div>
      </Card>

      <div>
        <SectionTitle
          action={
            <button
              onClick={() => navigate(fitnessRoutePaths.calorieHistory)}
              className="font-vazir text-[12px]"
              style={{ color: "var(--accent)", minHeight: 32 }}
            >
              تاریخچه
            </button>
          }
        >
          وعده‌های امروز
        </SectionTitle>
        {entries.length === 0 && <EmptyState title="هنوز چیزی ثبت نشده" />}
        <div className="flex flex-col gap-3">
          {Object.entries(byMeal).map(([meal, items]) => (
            <div key={meal}>
              <p className="mb-1 px-1 font-vazir text-[12px] font-medium" style={{ color: "var(--muted)" }}>
                {MEAL_LABELS[meal] ?? "سایر"}
              </p>
              <div className="flex flex-col gap-1.5">
                {items.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between rounded-xl p-3"
                    style={{ background: "var(--surface-1)", border: "1px solid var(--surface-line)" }}
                  >
                    <div>
                      <p className="font-vazir text-[13px]" style={{ color: "var(--text)" }}>
                        {e.name}
                      </p>
                      <p className="font-vazir text-[11px]" style={{ color: "var(--muted)" }}>
                        {e.grams} گرم · {kcalOf(e)} kcal
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        await removeCalorieEntry(e.id);
                        void tapHaptic();
                      }}
                      aria-label="حذف"
                      className="flex items-center justify-center"
                      style={{ width: 40, height: 40 }}
                    >
                      <Trash2 size={15} color="var(--muted)" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <AddCalorieEntrySheet open={addOpen} onClose={() => setAddOpen(false)} date={date} />
      <GoalSheet open={goalOpen} onClose={() => setGoalOpen(false)} current={target} />
    </div>
  );
}
