"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { isoLocal, faNum } from "@/lib/jalali";
import { AuthGate } from "./AuthGate";
import { CalorieGoal, CALORIE_GOAL_LABELS, Sex } from "@/lib/calorieCalc";
import { SegmentedTabs } from "./SegmentedTabs";
import { CalorieTodayCard } from "./CalorieTodayCard";
import { CalorieChartCard } from "./CalorieChartCard";
import { CalorieStreakCard } from "./CalorieStreakCard";
import { CalorieAddFoodCard } from "./CalorieAddFoodCard";
import { CalorieLogCard } from "./CalorieLogCard";
import { CalorieMacrosCard } from "./CalorieMacrosCard";
import { CalorieTutorial, hasSeenCalorieTutorial } from "./CalorieTutorial";

const todayKey = isoLocal(new Date());
const DEFAULT_MEAL_TYPES: { key: string; label: string }[] = [
  { key: "breakfast", label: "صبحانه" },
  { key: "lunch", label: "ناهار" },
  { key: "dinner", label: "شام" },
  { key: "snack", label: "میان‌وعده" },
];

type Entry = {
  id: string;
  customName: string;
  customCalories: number;
  grams: number;
  mealType: string | null;
  date?: string;
  createdAt?: string;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  aiScanned?: boolean;
};

type MealBreakdownItem = { key: string; label: string; kcal: number };

export type Target = {
  dailyTargetKcal: number;
  goal: CalorieGoal | null;
  mealsPerDay: number | null;
  mealBreakdown: MealBreakdownItem[] | null;
  sex: Sex | null;
  heightCm: number | null;
  weightKg: number | null;
};

export function CaloriePanel() {
  const { status } = useSession();
  const [target, setTarget] = useState<Target | null | undefined>(undefined);
  const [needsAge, setNeedsAge] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);

  // فرم هدف کالری
  const [goal, setGoal] = useState<CalorieGoal>("maintain");
  const [mealsPerDay, setMealsPerDay] = useState(4);
  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState("");
  const [goalHeight, setGoalHeight] = useState("");
  const [goalWeight, setGoalWeight] = useState("");
  const [goalError, setGoalError] = useState<string | null>(null);
  const [savingGoal, setSavingGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);

  // تاریخچه — دیگه lazy نیست، چون نمودار و روند موفقیت هم به همین ۳۰ روزِ
  // اخیر نیاز دارن
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<Entry[]>([]);

  // راهنمای اولین‌بار — دقیقاً وقتی صفحه با یه هدفِ کالریِ ازقبل‌ساخته‌شده
  // باز می‌شه (نه توی فرمِ ساختِ هدف) نشون داده می‌شه، یه بار برای همیشه
  const [showTutorial, setShowTutorial] = useState(false);

  async function loadTarget() {
    const res = await fetch("/api/calorie/target");
    const data = await res.json();
    setTarget(data.target ?? null);
    setNeedsAge(!!data.needsAge);
  }
  async function loadEntries() {
    const res = await fetch(`/api/calorie/log?date=${todayKey}`);
    const data = await res.json();
    setEntries(data.entries || []);
  }
  async function loadHistory() {
    setHistoryLoading(true);
    const from = isoLocal(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));
    const res = await fetch(`/api/calorie/log/range?from=${from}&to=${todayKey}`);
    const data = await res.json();
    setHistoryEntries(data.entries || []);
    setHistoryLoading(false);
  }

  useEffect(() => {
    if (status !== "authenticated") return;
    loadTarget();
    loadEntries();
    loadHistory();
  }, [status]);

  useEffect(() => {
    if (target && !editingGoal && !hasSeenCalorieTutorial()) setShowTutorial(true);
  }, [target, editingGoal]);

  async function saveGoal() {
    if (!goal) { setGoalError("انتخاب هدف لازمه"); return; }
    if (!sex) { setGoalError("انتخاب جنسیت لازمه (فقط برای محاسبه‌ی دقیق‌تر کالری)"); return; }
    if (!goalHeight || !goalWeight) { setGoalError("قد و وزن لازمه"); return; }
    if (needsAge && !age) { setGoalError("چون تاریخ تولدت توی حساب ثبت نشده، سنت رو وارد کن"); return; }

    setGoalError(null);
    setSavingGoal(true);
    const res = await fetch("/api/calorie/target", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal, mealsPerDay, sex,
        ageYears: age ? +age : undefined,
        heightCm: +goalHeight, weightKg: +goalWeight,
      }),
    });
    const data = await res.json();
    setSavingGoal(false);
    if (!res.ok) { setGoalError(data.error || "خطایی پیش آمد"); return; }
    setTarget(data.target);
    setEditingGoal(false);
  }

  // «تغییر برنامه کالری» — همون فرم اولیه رو با مقادیر فعلی پر می‌کنه و دوباره باز می‌کنه
  function openEditGoal() {
    if (target) {
      setGoal(target.goal || "maintain");
      setSex(target.sex || "male");
      setMealsPerDay(target.mealsPerDay || 4);
      setGoalHeight(target.heightCm ? String(target.heightCm) : "");
      setGoalWeight(target.weightKg ? String(target.weightKg) : "");
    }
    setGoalError(null);
    setEditingGoal(true);
  }

  async function removeEntry(id: string) {
    setEntries((e) => e.filter((x) => x.id !== id));
    await fetch(`/api/calorie/log?id=${id}`, { method: "DELETE" });
  }

  if (status === "unauthenticated") {
    return <AuthGate message="برای استفاده از این سرویس وارد شوید" />;
  }

  if (target === undefined) {
    return <div className="item-line" style={{ marginTop: 10 }}>در حال بارگذاری…</div>;
  }

  const mealTypes = target?.mealBreakdown?.length ? target.mealBreakdown.map((m) => ({ key: m.key, label: m.label })) : DEFAULT_MEAL_TYPES;
  const totalToday = entries.reduce((s, e) => s + e.customCalories, 0);
  const pct = target ? Math.min(100, Math.round((totalToday / target.dailyTargetKcal) * 100)) : 0;

  return (
    <div>
      {!target || editingGoal ? (
        <div style={{ marginTop: 10 }}>
          <div className="section-note">
            {editingGoal ? "برنامه کالری‌ات رو دوباره حساب کن" : "اول هدفت رو مشخص کن تا کالری روزانه و هر وعده رو براش حساب کنیم"}
          </div>

          <label className="exercise-form-label">هدف</label>
          <SegmentedTabs
            active={goal}
            onChange={setGoal}
            options={(Object.keys(CALORIE_GOAL_LABELS) as CalorieGoal[]).map((g) => ({ value: g, label: CALORIE_GOAL_LABELS[g] }))}
          />

          <label className="exercise-form-label">جنسیت</label>
          <SegmentedTabs
            active={sex}
            onChange={setSex}
            options={[
              { value: "male", label: "مرد" },
              { value: "female", label: "زن" },
            ]}
          />

          <label className="exercise-form-label">چند وعده در روز می‌خوای؟</label>
          <SegmentedTabs
            active={String(mealsPerDay)}
            onChange={(v) => setMealsPerDay(Number(v))}
            options={[2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: faNum(n) }))}
          />

          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <div style={{ flex: 1 }}>
              <label className="exercise-form-label">قد (سانتی‌متر)</label>
              <input type="number" className="wsearch-newform-name" value={goalHeight} onChange={(e) => setGoalHeight(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="exercise-form-label">وزن (کیلوگرم)</label>
              <input type="number" className="wsearch-newform-name" value={goalWeight} onChange={(e) => setGoalWeight(e.target.value)} />
            </div>
            {needsAge && (
              <div style={{ flex: 1 }}>
                <label className="exercise-form-label">سن</label>
                <input type="number" className="wsearch-newform-name" value={age} onChange={(e) => setAge(e.target.value)} />
              </div>
            )}
          </div>

          {goalError && <div className="field-error-msg" style={{ display: "block", marginTop: 10 }}>{goalError}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            {editingGoal && (
              <button onClick={() => setEditingGoal(false)} className="small" style={{ flex: 1 }}>انصراف</button>
            )}
            <button onClick={saveGoal} disabled={savingGoal} style={{ flex: 2, borderColor: "var(--accent)", color: "var(--accent)" }}>
              {savingGoal ? "در حال محاسبه…" : "محاسبه‌ی برنامه کالری"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="dash-scope">
            <div className="flex flex-col gap-4 sm:gap-6 lg:grid lg:grid-cols-[1.6fr_1fr] lg:items-start lg:gap-6">
              {/* ستونِ اصلی — اولین فرزندِ DOM، توی RTL سمتِ راست */}
              <div className="flex flex-col gap-4 sm:gap-6">
                <CalorieTodayCard
                  target={target}
                  entries={entries}
                  totalToday={totalToday}
                  pct={pct}
                  onEditGoal={openEditGoal}
                  onTargetChange={setTarget}
                />
                <CalorieChartCard todayEntries={entries} rangeEntries={historyEntries} targetKcal={target.dailyTargetKcal} delay={0.08} />
                <CalorieMacrosCard entries={entries} mealTypes={mealTypes} onLogged={loadEntries} delay={0.1} />
              </div>

              {/* ستونِ کناری */}
              <div className="flex flex-col gap-4 sm:gap-6">
                <CalorieStreakCard rangeEntries={historyEntries} targetKcal={target.dailyTargetKcal} delay={0.05} />
                <CalorieAddFoodCard mealTypes={mealTypes} onAdded={loadEntries} delay={0.12} />
                <CalorieLogCard entries={entries} onRemove={removeEntry} historyEntries={historyEntries} historyLoading={historyLoading} delay={0.16} />
              </div>
            </div>
          </div>

          <div className="disclaimer-note">
            <span className="disclaimer-warn">توجه: </span>
            این جدول کالری/وعده‌ها فقط یک پیشنهاد است و هیچ اجباری به اجرای دقیق آن نیست؛ مسئولیت کل برنامه‌ی غذایی با خود کاربر است.
          </div>
        </>
      )}

      {showTutorial && createPortal(
        <CalorieTutorial onDone={() => setShowTutorial(false)} />,
        document.body
      )}
    </div>
  );
}
