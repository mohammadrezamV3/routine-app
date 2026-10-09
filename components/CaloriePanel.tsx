"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, History } from "lucide-react";
import { useSession } from "next-auth/react";
import { isoLocal, faNum } from "@/lib/jalali";
import { AuthGate } from "./AuthGate";
import { CalorieGoal, CALORIE_GOAL_LABELS, Sex, mealLabelDisplay } from "@/lib/calorieCalc";
import { SegmentedTabs } from "./SegmentedTabs";
import { DashDateSelector } from "./DashDateSelector";
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
import { NumberInput } from "./NumberInput";
import { reportLiveError, useLiveRefresh } from "@/lib/liveSync";
import { Spinner } from "./Spinner";
import { tr } from "@/lib/i18n";

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
  // هدف درشت‌مغذی‌ها (گرم در روز) — اختیاری، فقط از «وارد کردن دستی»
  proteinTargetG?: number | null;
  carbsTargetG?: number | null;
  fatTargetG?: number | null;
};

export function CaloriePanel() {
  const { status } = useSession();
  const dashboardPrefs = useDashboardPrefs();
  const [target, setTarget] = useState<Target | null | undefined>(undefined);
  // شبکه‌ی ایمنی: اگه هر دلیلی (فچ گیرکرده، پاسخ کند سرور، ...) بعد از
  // چند ثانیه هنوز روی «در حال بارگذاری» مانده بودیم، به‌جای اسپینر ابدی
  // (دقیقا گزارش کاربر: «کالری‌شمار بالا نمیاد») یک پیام خطا با دکمه‌ی
  // تلاش دوباره نشان بده.
  const [loadStuck, setLoadStuck] = useState(false);
  const [needsAge, setNeedsAge] = useState(false);

  // انتخاب روز — طبق طرح کاربر، بالای صفحه یه نوار روزهاست که مشخص می‌کنه
  // داری کدوم روز رو می‌بینی/واردش می‌کنی (DashDateSelector، نوار آزاد
  // قابل‌کشیدن؛ روز دور انتخاب‌شده از تقویم رو خودش باز و وسط‌چین می‌کنه).
  const [selectedIso, setSelectedIso] = useState(todayIso);
  const [recenterKey, setRecenterKey] = useState(0);
  const isSelectedToday = selectedIso === todayIso;

  const [historyPickerOpen, setHistoryPickerOpen] = useState(false);

  function pickDate(iso: string) {
    setSelectedIso(iso);
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

  // تاریخچه — ۳۰ روز واقعی اخیر از «امروز»، مستقل از روزی که کاربر داره
  // می‌بینه؛ چون نمودار هفتگی/ماهانه و روند موفقیت به تاریخ واقعی نیاز دارن
  const [historyEntries, setHistoryEntries] = useState<Entry[]>([]);

  // راهنمای اولین‌بار — دقیقا وقتی صفحه با یه هدف کالری ازقبل‌ساخته‌شده
  // باز می‌شه (نه توی فرم ساخت هدف) نشون داده می‌شه، یه بار برای همیشه
  const [showTutorial, setShowTutorial] = useState(false);

  // یادآوری به‌روزکردن وزن — هر دو هفته یک‌بار
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

  // بدون چک res.ok، یک ۵۰۰ که بدنه‌اش JSON نیست باعث می‌شد res.json()
  // throw کند، هیچ‌جا catch نشود، و target تا ابد روی حالت اولیه‌ی
  // undefined بماند — یعنی از دید کاربر «کالری‌شمار بالا نمی‌آید»
  // (اسکلتون «در حال بارگذاری…» بی‌نهایت). الگوی ExercisePanel.tsx.
  async function loadTarget() {
    try {
      const res = await fetch("/api/calorie/target");
      const data = res.ok ? await res.json() : null;
      setTarget(data?.target ?? null);
      setNeedsAge(!!data?.needsAge);
    } catch {
      setTarget(null);
    }
  }
  async function loadEntries() {
    try {
      const res = await fetch(`/api/calorie/log?date=${selectedIso}`);
      const data = res.ok ? await res.json() : null;
      setEntries(data?.entries || []);
    } catch {
      setEntries([]);
    }
  }
  async function loadHistory() {
    try {
      const from = isoLocal(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));
      const res = await fetch(`/api/calorie/log/range?from=${from}&to=${todayIso}`);
      const data = res.ok ? await res.json() : null;
      setHistoryEntries(data?.entries || []);
    } catch {
      setHistoryEntries([]);
    }
  }

  useEffect(() => {
    if (status !== "authenticated") return;
    setLoadStuck(false);
    loadTarget();
    loadHistory();
    const t = setTimeout(() => setLoadStuck(true), 12_000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, selectedIso]);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (target && !editingGoal && !hasSeenCalorieTutorial()) setShowTutorial(true);
  }, [status, target, editingGoal]);

  async function saveGoal() {
    if (!goal) { setGoalError(tr("انتخاب هدف لازمه", "Please choose a goal")); return; }
    if (!sex) { setGoalError(tr("انتخاب جنسیت لازمه (فقط برای محاسبه‌ی دقیق‌تر کالری)", "Please choose your sex (only used for a more accurate calorie estimate)")); return; }
    if (!goalHeight || !goalWeight) { setGoalError(tr("قد و وزن لازمه", "Height and weight are required")); return; }
    if (needsAge && !age) { setGoalError(tr("چون تاریخ تولدت توی حساب ثبت نشده، سنت رو وارد کن", "Your birth date is not saved on your account, so please enter your age")); return; }

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
    if (!res.ok) { setGoalError(data.error || tr("خطایی پیش آمد", "Something went wrong")); return; }
    saveBodyMetrics({ heightCm: +goalHeight, weightKg: +goalWeight, ageYears: age ? +age : undefined });
    setWeightReminder(false);
    setTarget(data.target);
  }

  async function removeEntry(id: string) {
    // optimistic: همون لحظه از لیست (و از جمع امروز/تاریخچه) حذف می‌شه؛
    // اگه سرور رد کرد برمی‌گرده و پیام خطا نشون داده می‌شه.
    const prevEntries = entries;
    const prevHistory = historyEntries;
    setEntries((e) => e.filter((x) => x.id !== id));
    setHistoryEntries((h) => h.filter((x: { id?: string }) => x.id !== id));
    const res = await fetch(`/api/calorie/log?id=${id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      setEntries(prevEntries);
      setHistoryEntries(prevHistory);
      reportLiveError(tr("حذف نشد — دوباره امتحان کن", "Could not delete. Try again"));
    }
  }

  // زنده: افزودن/حذف از هرجا (مودال، تب دیگه، سرور) یا برگشت به تب
  useLiveRefresh("calorie", () => { loadTarget(); refreshAfterChange(); }, { enabled: status === "authenticated" });

  // بعد افزودن/حذف، هم لیست روز انتخاب‌شده هم تاریخچه‌ی ۳۰روزه باید
  // به‌روز بشن — چون نمودار/روند موفقیت/ریز درشت‌مغذی‌ها به هردو وابسته‌ن
  function refreshAfterChange() {
    loadEntries();
    loadHistory();
  }

  if (status === "unauthenticated") {
    return <AuthGate message={tr("برای استفاده از این سرویس وارد شوید", "Sign in to use this service")} />;
  }

  if (target === undefined) {
    if (loadStuck) {
      return (
        <div className="item-line empty" style={{ marginTop: 10 }}>
          {tr("بارگذاری کالری‌شمار خیلی طول کشید — اتصال اینترنت را چک کن.", "Loading the calorie tracker took too long. Check your internet connection.")}
          <button
            type="button"
            className="account-outline-btn"
            style={{ marginInlineStart: 10 }}
            onClick={() => { setLoadStuck(false); loadTarget(); }}
          >
            {tr("تلاش دوباره", "Try again")}
          </button>
        </div>
      );
    }
    return <div className="item-line is-loading" style={{ marginTop: 10 }}>{tr("در حال بارگذاری…", "Loading…")}</div>;
  }

  const mealTypes = (target?.mealBreakdown?.length ? target.mealBreakdown.map((m) => ({ key: m.key, label: m.label })) : DEFAULT_MEAL_TYPES).map((m) => ({ key: m.key, label: mealLabelDisplay(m.key, m.label) }));
  const totalToday = entries.reduce((s, e) => s + e.customCalories, 0);
  // عمدا اینجا سقف ۱۰۰٪ زده نمی‌شه — کارت کالری امروز خودش برای طول نوار
  // سقف می‌زنه ولی برای تشخیص «رد شدن از هدف» (رنگ قرمز) به همون درصد
  // واقعی نیاز داره؛ سقف‌زدن اینجا باعث می‌شد pct هیچ‌وقت از ۱۰۰ رد نشه و
  // رنگ قرمز هیچ‌وقت فعال نشه، حتی وقتی کاربر چند برابر هدفش خورده بود.
  const pct = target ? Math.round((totalToday / target.dailyTargetKcal) * 100) : 0;

  return (
    <div>
      {!target ? (
        <div style={{ marginTop: 10 }}>
          <div className="section-note">
            {tr("اول هدفت رو مشخص کن تا کالری روزانه و هر وعده رو براش حساب کنیم", "First set your goal so we can work out your daily and per-meal calories")}
          </div>

          <label className="exercise-form-label">{tr("هدف", "Goal")}</label>
          <SegmentedTabs
            active={goal}
            onChange={setGoal}
            options={(Object.keys(CALORIE_GOAL_LABELS) as CalorieGoal[]).map((g) => ({ value: g, label: CALORIE_GOAL_LABELS[g] }))}
          />

          <label className="exercise-form-label">{tr("جنسیت", "Sex")}</label>
          <SegmentedTabs
            active={sex}
            onChange={setSex}
            options={[
              { value: "male", label: tr("مرد", "Male") },
              { value: "female", label: tr("زن", "Female") },
            ]}
          />

          <label className="exercise-form-label">{tr("چند وعده در روز می‌خوای؟", "How many meals a day?")}</label>
          <SegmentedTabs
            active={String(mealsPerDay)}
            onChange={(v) => setMealsPerDay(Number(v))}
            options={[2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: faNum(n) }))}
          />

          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <div style={{ flex: 1 }}>
              <label className="exercise-form-label">{tr("قد (سانتی‌متر)", "Height (cm)")}</label>
              <NumberInput className="wsearch-newform-name" value={goalHeight} onChange={(v) => setGoalHeight(v)} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="exercise-form-label">{tr("وزن (کیلوگرم)", "Weight (kg)")}</label>
              <NumberInput className="wsearch-newform-name" value={goalWeight} onChange={(v) => setGoalWeight(v)} />
            </div>
            {needsAge && (
              <div style={{ flex: 1 }}>
                <label className="exercise-form-label">{tr("سن", "Age")}</label>
                <NumberInput className="wsearch-newform-name" value={age} onChange={(v) => setAge(v)} />
              </div>
            )}
          </div>

          {goalError && <div className="field-error-msg" style={{ display: "block", marginTop: 10 }}>{goalError}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button onClick={saveGoal} disabled={savingGoal} style={{ flex: 2, borderColor: "var(--accent)", color: "var(--accent)" }}>
              {savingGoal ? <Spinner size={14} /> : tr("محاسبه‌ی برنامه کالری", "Calculate calorie plan")}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="dash-scope flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col gap-2.5 sm:gap-3 lg:flex-row lg:items-center lg:gap-4">
              <DashDateSelector
                activeIso={selectedIso}
                onSelect={setSelectedIso}
                recenterKey={recenterKey}
                className="lg:order-2"
              />
              <div className="flex flex-wrap items-center gap-2 lg:order-1 lg:shrink-0 lg:flex-nowrap">
                <DashFilterButton
                  label={tr("تاریخچه", "History")}
                  icon={<History size={15} />}
                  active={!isSelectedToday}
                  onClick={() => setHistoryPickerOpen(true)}
                />
                <DashFilterButton
                  label={tr("امروز", "Today")}
                  icon={<Calendar size={15} />}
                  active={isSelectedToday}
                  onClick={() => { setSelectedIso(todayIso); setRecenterKey((k) => k + 1); }}
                />
              </div>
            </div>

            {weightReminder && (
              <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border px-3.5 py-2.5" style={{ borderColor: "rgba(var(--accent-rgb),.35)", background: "rgba(var(--accent-rgb),.08)" }}>
                <span className="text-[11.5px] font-semibold text-dash-text sm:text-[12.5px]">
                  {tr("دو هفته از آخرین ثبت وزنت گذشته — برای دقیق‌موندن محاسبه‌ها به‌روزش کن", "It has been two weeks since you last logged your weight. Update it to keep the numbers accurate")}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingGoal(true)}
                  className="text-[11px] font-bold text-dash-green transition hover:brightness-110 sm:text-[12.5px]"
                >
                  {tr("به‌روزرسانی وزن", "Update weight")}
                </button>
              </div>
            )}

            {/* موبایل: یه ستون ساده به ترتیب DOM. دسکتاپ: گرید نام‌دار
                (.calorie-dash-grid توی globals.css) که مستقل از این ترتیب،
                برنامه‌ی غذایی رو ستون اصلی راست می‌کنه و بقیه رو توی دو
                ردیف سمت چپ می‌چینه — نمودار/استریک/دوستان بالا،
                ریز درشت‌مغذی‌ها/کالری هر وعده پایین. */}
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
                <CalorieMacrosCard entries={entries} target={target} delay={0.19} />
              </div>

              <div className="calorie-col-side">
                {dashboardPrefs.showFriends && <DashFriendsCard delay={0.12} module="calorie" />}
                <CalorieStreakCard rangeEntries={historyEntries} targetKcal={target.dailyTargetKcal} delay={0.1} />
                {dashboardPrefs.showChart && <CalorieChartCard rangeEntries={historyEntries} targetKcal={target.dailyTargetKcal} delay={0.22} />}
              </div>
            </div>
          </div>

          <div className="disclaimer-note">
            <span className="disclaimer-warn">{tr("توجه: ", "Note: ")}</span>
            {tr("این جدول کالری/وعده‌ها فقط یک پیشنهاد است و هیچ اجباری به اجرای دقیق آن نیست؛ مسئولیت کل برنامه‌ی غذایی با خود کاربر است.", "This calorie and meal table is only a suggestion and there is no obligation to follow it exactly; the user is responsible for the whole meal plan.")}
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
              <div className="modal-title">{tr("انتخاب تاریخ", "Pick a date")}</div>
              <button className="nav-close" onClick={() => setHistoryPickerOpen(false)} aria-label={tr("بستن", "Close")}>×</button>
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
