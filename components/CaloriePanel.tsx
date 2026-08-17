"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, History } from "lucide-react";
import { useSession } from "next-auth/react";
import { isoLocal, faNum, toJalali, J_MONTHS } from "@/lib/jalali";
import { WEEK_ORDER } from "@/lib/schedule";
import { AuthGate } from "./AuthGate";
import { CalorieGoal, CALORIE_GOAL_LABELS, Sex } from "@/lib/calorieCalc";
import { SegmentedTabs } from "./SegmentedTabs";
import { DashDateSelector, DashDay } from "./DashDateSelector";
import { LockBodyScroll } from "./LockBodyScroll";
import { DashFilterButton } from "./DashFilterButton";
import { DashFriendsCard } from "./DashFriendsCard";
import { CalorieGoalModal } from "./CalorieGoalModal";
import { CalorieChartCard } from "./CalorieChartCard";
import { CalorieStreakCard } from "./CalorieStreakCard";
import { CalorieMacrosCard } from "./CalorieMacrosCard";
import { CalorieMealBreakdownCard } from "./CalorieMealBreakdownCard";
import { CalorieFoodPlanCard } from "./CalorieFoodPlanCard";
import { CalorieHistoryCalendar } from "./CalorieHistoryCalendar";
import { CalorieTutorial, hasSeenCalorieTutorial } from "./CalorieTutorial";
import { getBodyMetrics, isWeightStale, saveBodyMetrics } from "@/lib/bodyMetrics";
import { useDashboardPrefs } from "@/lib/dashboardPrefs";

const now = new Date();
const todayIso = isoLocal(now);
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
  const dashboardPrefs = useDashboardPrefs();
  const [target, setTarget] = useState<Target | null | undefined>(undefined);
  const [needsAge, setNeedsAge] = useState(false);

  // انتخابِ روز — طبقِ طرحِ کاربر، بالای صفحه یه نوارِ روزهای هفته‌ست که
  // مشخص می‌کنه داری کدوم روز رو می‌بینی/واردش می‌کنی؛ دقیقاً هم‌الگوی
  // انتخابِ روزِ داشبوردِ بدنسازی (DashDateSelector + weekOffset/dayWindow).
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedIso, setSelectedIso] = useState(todayIso);
  const [dayWindow, setDayWindow] = useState(5);
  const isSelectedToday = selectedIso === todayIso;

  const dashDays: DashDay[] = useMemo(() => {
    const center = new Date(now);
    center.setDate(now.getDate() + weekOffset * dayWindow);
    return Array.from({ length: dayWindow }, (_, i) => {
      const d = new Date(center);
      d.setDate(center.getDate() - Math.floor(dayWindow / 2) + i);
      const iso = isoLocal(d);
      const order = WEEK_ORDER.find((w) => w.jsDay === d.getDay())!;
      const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
      return { iso, weekday: order.name, dateLabel: `${faNum(j[2])} ${J_MONTHS[j[1] - 1]}` };
    });
  }, [weekOffset, dayWindow]);

  const [historyPickerOpen, setHistoryPickerOpen] = useState(false);

  // انتخابِ یه تاریخِ دلخواه از تقویم — پنجره‌ی نوارِ روزها هم باید دورِ همون
  // تاریخ وسط‌چین بشه، نه اینکه روزِ انتخاب‌شده بیرونِ پنجره‌ی فعلی بمونه
  // (دقیقاً هم‌منطقِ pickDate توی داشبوردِ بدنسازی).
  function pickDate(iso: string) {
    setSelectedIso(iso);
    const [y, m, d] = iso.split("-").map(Number);
    const picked = new Date(y, m - 1, d);
    const diffDays = Math.round((picked.getTime() - now.getTime()) / 86400000);
    setWeekOffset(Math.round(diffDays / dayWindow));
    setHistoryPickerOpen(false);
  }

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

  // تاریخچه — ۳۰ روزِ واقعیِ اخیر از «امروز»، مستقل از روزی که کاربر داره
  // می‌بینه؛ چون نمودارِ هفتگی/ماهانه و روندِ موفقیت به تاریخِ واقعی نیاز دارن
  const [historyEntries, setHistoryEntries] = useState<Entry[]>([]);

  // راهنمای اولین‌بار — دقیقاً وقتی صفحه با یه هدفِ کالریِ ازقبل‌ساخته‌شده
  // باز می‌شه (نه توی فرمِ ساختِ هدف) نشون داده می‌شه، یه بار برای همیشه
  const [showTutorial, setShowTutorial] = useState(false);

  // یادآوریِ به‌روزکردنِ وزن — هر دو هفته یک‌بار
  const [weightReminder, setWeightReminder] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    getBodyMetrics().then(({ data, updatedAt }) => {
      if (data?.heightCm) setGoalHeight((v) => v || String(data.heightCm));
      if (data?.weightKg) setGoalWeight((v) => v || String(data.weightKg));
      if (data?.ageYears) setAge((v) => v || String(data.ageYears));
      setWeightReminder(isWeightStale(updatedAt));
    });
  }, [status]);

  async function loadTarget() {
    const res = await fetch("/api/calorie/target");
    const data = await res.json();
    setTarget(data.target ?? null);
    setNeedsAge(!!data.needsAge);
  }
  async function loadEntries() {
    const res = await fetch(`/api/calorie/log?date=${selectedIso}`);
    const data = await res.json();
    setEntries(data.entries || []);
  }
  async function loadHistory() {
    const from = isoLocal(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));
    const res = await fetch(`/api/calorie/log/range?from=${from}&to=${todayIso}`);
    const data = await res.json();
    setHistoryEntries(data.entries || []);
  }

  useEffect(() => {
    if (status !== "authenticated") return;
    loadTarget();
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, selectedIso]);

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
    saveBodyMetrics({ heightCm: +goalHeight, weightKg: +goalWeight, ageYears: age ? +age : undefined });
    setWeightReminder(false);
    setTarget(data.target);
  }

  async function removeEntry(id: string) {
    setEntries((e) => e.filter((x) => x.id !== id));
    await fetch(`/api/calorie/log?id=${id}`, { method: "DELETE" });
  }

  // بعدِ افزودن/حذف/اسکن، هم لیستِ روزِ انتخاب‌شده هم تاریخچه‌ی ۳۰روزه باید
  // به‌روز بشن — چون نمودار/روندِ موفقیت/ریزِ درشت‌مغذی‌ها به هردو وابسته‌ن
  function refreshAfterChange() {
    loadEntries();
    loadHistory();
  }

  if (status === "unauthenticated") {
    return <AuthGate message="برای استفاده از این سرویس وارد شوید" />;
  }

  if (target === undefined) {
    return <div className="item-line" style={{ marginTop: 10 }}>در حال بارگذاری…</div>;
  }

  const mealTypes = target?.mealBreakdown?.length ? target.mealBreakdown.map((m) => ({ key: m.key, label: m.label })) : DEFAULT_MEAL_TYPES;
  const totalToday = entries.reduce((s, e) => s + e.customCalories, 0);
  // عمداً اینجا سقف ۱۰۰٪ زده نمی‌شه — کارتِ کالری امروز خودش برای طولِ نوار
  // سقف می‌زنه ولی برای تشخیصِ «رد شدن از هدف» (رنگِ قرمز) به همون درصدِ
  // واقعی نیاز داره؛ سقف‌زدن اینجا باعث می‌شد pct هیچ‌وقت از ۱۰۰ رد نشه و
  // رنگِ قرمز هیچ‌وقت فعال نشه، حتی وقتی کاربر چند برابرِ هدفش خورده بود.
  const pct = target ? Math.round((totalToday / target.dailyTargetKcal) * 100) : 0;

  return (
    <div>
      {!target ? (
        <div style={{ marginTop: 10 }}>
          <div className="section-note">
            اول هدفت رو مشخص کن تا کالری روزانه و هر وعده رو براش حساب کنیم
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
            <button onClick={saveGoal} disabled={savingGoal} style={{ flex: 2, borderColor: "var(--accent)", color: "var(--accent)" }}>
              {savingGoal ? "در حال محاسبه…" : "محاسبه‌ی برنامه کالری"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="dash-scope flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col gap-2.5 sm:gap-3 lg:flex-row lg:items-center lg:gap-4">
              <DashDateSelector
                days={dashDays}
                activeIso={selectedIso}
                onSelect={setSelectedIso}
                onPrevWeek={() => setWeekOffset((v) => v - 1)}
                onNextWeek={() => setWeekOffset((v) => v + 1)}
                onVisibleCountChange={setDayWindow}
                className="lg:order-2"
              />
              <div className="flex flex-wrap items-center gap-2 lg:order-1 lg:shrink-0 lg:flex-nowrap">
                <DashFilterButton
                  label="تاریخچه"
                  icon={<History size={15} />}
                  active={!isSelectedToday}
                  onClick={() => setHistoryPickerOpen(true)}
                />
                <DashFilterButton
                  label="امروز"
                  icon={<Calendar size={15} />}
                  active={isSelectedToday}
                  onClick={() => { setWeekOffset(0); setSelectedIso(todayIso); }}
                />
              </div>
            </div>

            {weightReminder && (
              <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border px-3.5 py-2.5" style={{ borderColor: "rgba(var(--accent-rgb),.35)", background: "rgba(var(--accent-rgb),.08)" }}>
                <span className="text-[11.5px] font-semibold text-dash-text sm:text-[12.5px]">
                  دو هفته از آخرین ثبتِ وزنت گذشته — برای دقیق‌موندنِ محاسبه‌ها به‌روزش کن
                </span>
                <button
                  type="button"
                  onClick={() => setEditingGoal(true)}
                  className="text-[11px] font-bold text-dash-green transition hover:brightness-110 sm:text-[12.5px]"
                >
                  به‌روزرسانیِ وزن
                </button>
              </div>
            )}

            {/* موبایل: یه ستونِ ساده به ترتیبِ DOM. دسکتاپ: گریدِ نام‌دار
                (.calorie-dash-grid توی globals.css) که مستقلِ از این ترتیب،
                برنامه‌ی غذایی رو ستونِ اصلیِ راست می‌کنه و بقیه رو توی دو
                ردیفِ سمتِ چپ می‌چینه — نمودار/استریک/دوستان بالا،
                ریزِ درشت‌مغذی‌ها/کالری هر وعده پایین. */}
            <div className="calorie-dash-grid">
              <div className="calorie-col-food">
                <CalorieFoodPlanCard
                  date={selectedIso}
                  isToday={isSelectedToday}
                  entries={entries}
                  onRemove={removeEntry}
                  onAdded={refreshAfterChange}
                  mealTypes={mealTypes}
                  target={target}
                  totalToday={totalToday}
                  pct={pct}
                  onEditGoal={() => setEditingGoal(true)}
                  delay={0.06}
                />
              </div>

              <div className="calorie-col-mid">
                <CalorieMealBreakdownCard target={target} entries={entries} delay={0.16} />
                <CalorieMacrosCard entries={entries} delay={0.19} />
              </div>

              <div className="calorie-col-side">
                {dashboardPrefs.showFriends && <DashFriendsCard delay={0.12} module="calorie" unitLabel="روز موفق" />}
                <CalorieStreakCard rangeEntries={historyEntries} targetKcal={target.dailyTargetKcal} delay={0.1} />
                {dashboardPrefs.showChart && <CalorieChartCard todayEntries={entries} rangeEntries={historyEntries} targetKcal={target.dailyTargetKcal} delay={0.22} />}
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

      {historyPickerOpen && target && createPortal(
        <>
          <LockBodyScroll />
          <div className="modal-overlay open" onClick={() => setHistoryPickerOpen(false)} />
          <div className="modal-panel liquid-glass-panel dash-scope open">
            <div className="modal-head">
              <div className="modal-title">انتخاب تاریخ</div>
              <button className="nav-close" onClick={() => setHistoryPickerOpen(false)} aria-label="بستن">×</button>
            </div>
            <div className="modal-body">
              <CalorieHistoryCalendar targetKcal={target.dailyTargetKcal} onPick={pickDate} />
            </div>
          </div>
        </>,
        document.body
      )}

      {editingGoal && target && createPortal(
        <CalorieGoalModal
          target={target}
          needsAge={needsAge}
          onClose={() => setEditingGoal(false)}
          onSaved={(t) => { setWeightReminder(false); setTarget(t); }}
        />,
        document.body
      )}
    </div>
  );
}
