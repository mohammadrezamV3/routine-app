"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { isoLocal, faNum } from "@/lib/jalali";
import { FoodSeedItem } from "@/lib/foodSeed";
import { CalorieGoal, CALORIE_GOAL_LABELS, Sex } from "@/lib/calorieCalc";
import { SegmentedTabs } from "./SegmentedTabs";

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
};

type MealBreakdownItem = { key: string; label: string; kcal: number };

type Target = {
  dailyTargetKcal: number;
  goal: CalorieGoal | null;
  mealsPerDay: number | null;
  mealBreakdown: MealBreakdownItem[] | null;
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

  // افزودن غذا
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<FoodSeedItem[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodSeedItem | null>(null);
  const [customPer100, setCustomPer100] = useState("");
  const [grams, setGrams] = useState("100");
  const [mealType, setMealType] = useState("lunch");

  // تاریخچه
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<Entry[]>([]);

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

  useEffect(() => {
    if (status !== "authenticated") return;
    loadTarget();
    loadEntries();
  }, [status]);

  useEffect(() => {
    const id = setTimeout(() => {
      fetch(`/api/calorie/foods?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((d) => setSuggestions(d.results || []));
    }, 150);
    return () => clearTimeout(id);
  }, [query]);

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
  }

  async function addEntry() {
    const name = selectedFood?.name || query.trim();
    const per100 = selectedFood ? selectedFood.caloriesPer100g : +customPer100;
    const g = +grams;
    if (!name || !per100 || per100 <= 0 || !g) return;
    const totalKcal = Math.round((per100 * g) / 100);

    const res = await fetch("/api/calorie/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: todayKey, customName: name, customCalories: totalKcal, grams: g, mealType }),
    });
    if (res.ok) {
      setQuery(""); setSelectedFood(null); setCustomPer100(""); setGrams("100");
      loadEntries();
    }
  }

  async function removeEntry(id: string) {
    setEntries((e) => e.filter((x) => x.id !== id));
    await fetch(`/api/calorie/log?id=${id}`, { method: "DELETE" });
  }

  async function toggleHistory() {
    const next = !historyOpen;
    setHistoryOpen(next);
    if (next && historyEntries.length === 0) {
      setHistoryLoading(true);
      const from = isoLocal(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));
      const res = await fetch(`/api/calorie/log/range?from=${from}&to=${todayKey}`);
      const data = await res.json();
      setHistoryEntries(data.entries || []);
      setHistoryLoading(false);
    }
  }

  if (status === "unauthenticated") {
    return (
      <div>
        <div className="section-note" style={{ marginTop: 10 }}>برای ثبت کالری روزانه اول وارد حساب بشو.</div>
        <Link href="/auth/login" className="nav-link" style={{ display: "inline-block", marginTop: 10 }}>ورود / ثبت‌نام →</Link>
      </div>
    );
  }

  if (target === undefined) {
    return <div className="item-line" style={{ marginTop: 10 }}>در حال بارگذاری…</div>;
  }

  const mealTypes = target?.mealBreakdown?.length ? target.mealBreakdown.map((m) => ({ key: m.key, label: m.label })) : DEFAULT_MEAL_TYPES;
  const totalToday = entries.reduce((s, e) => s + e.customCalories, 0);
  const pct = target ? Math.min(100, Math.round((totalToday / target.dailyTargetKcal) * 100)) : 0;

  const historyByDate = historyEntries.reduce<Record<string, Entry[]>>((acc, e) => {
    const d = (e.date || "").slice(0, 10);
    if (!acc[d]) acc[d] = [];
    acc[d].push(e);
    return acc;
  }, {});
  const historyDates = Object.keys(historyByDate).sort((a, b) => (a < b ? 1 : -1));

  return (
    <div>
      {!target ? (
        <div style={{ marginTop: 10 }}>
          <div className="section-note">اول هدفت رو مشخص کن تا کالری روزانه و هر وعده رو براش حساب کنیم</div>

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
          <button onClick={saveGoal} disabled={savingGoal} style={{ marginTop: 14, borderColor: "var(--accent)", color: "var(--accent)" }}>
            {savingGoal ? "در حال محاسبه…" : "محاسبه‌ی برنامه کالری"}
          </button>
        </div>
      ) : (
        <>
          <div className="home-stats" style={{ marginTop: 8 }}>
            <b>{faNum(totalToday)}</b> از <b>{faNum(target.dailyTargetKcal)}</b> کالری امروز ({faNum(pct)}٪)
          </div>
          <div className="conflict-alert-bar" style={{ position: "static", marginTop: 8, opacity: 1, transform: "none", pointerEvents: "auto" }}>
            <div className="conflict-alert-bar-fill" style={{ transform: `scaleX(${pct / 100})`, background: pct > 100 ? "#E05252" : "var(--accent)" }} />
          </div>

          {!!target.mealBreakdown?.length && (
            <div className="tm-extra">
              <div className="domain-sub">سهم هر وعده</div>
              <div className="calorie-meal-grid">
                {target.mealBreakdown.map((m) => {
                  const consumed = entries.filter((e) => e.mealType === m.key).reduce((s, e) => s + e.customCalories, 0);
                  return (
                    <div key={m.key} className="calorie-meal-tile">
                      <div className="trade-stat-label">{m.label}</div>
                      <div className="trade-stat-value">{faNum(consumed)}<span className="calorie-meal-of"> / {faNum(m.kcal)}</span></div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="tm-extra">
            <div className="domain-sub">افزودن غذا</div>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                className="wsearch-newform-name"
                placeholder="جستجوی غذا…"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelectedFood(null); }}
              />
              {!selectedFood && query.trim() && suggestions.length > 0 && (
                <div style={{ border: "1px solid var(--line)", borderRadius: 8, marginTop: 4, overflow: "hidden" }}>
                  {suggestions.map((f) => (
                    <div
                      key={f.name}
                      className="item-row"
                      style={{ padding: "8px 10px", cursor: "pointer", display: "flex", justifyContent: "space-between" }}
                      onClick={() => { setSelectedFood(f); setQuery(f.name); setCustomPer100(""); }}
                    >
                      <span className="name">{f.name}</span>
                      <span className="mono" style={{ color: "var(--muted2)" }}>{f.caloriesPer100g} kcal/۱۰۰g</span>
                    </div>
                  ))}
                </div>
              )}
              {!selectedFood && query.trim() && suggestions.length === 0 && (
                <div style={{ marginTop: 6 }}>
                  <div className="section-note">غذا در لیست پیدا نشد — کالری هر ۱۰۰ گرمش رو دستی وارد کن</div>
                  <input
                    type="number"
                    className="wsearch-newform-name"
                    style={{ marginTop: 6 }}
                    placeholder="کالری به‌ازای هر ۱۰۰ گرم"
                    value={customPer100}
                    onChange={(e) => setCustomPer100(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input type="number" className="wsearch-newform-name" style={{ flex: 1 }} placeholder="گرم" value={grams} onChange={(e) => setGrams(e.target.value)} />
              <div style={{ flex: 2 }}>
                <SegmentedTabs
                  active={mealType}
                  onChange={setMealType}
                  options={mealTypes.map((m) => ({ value: m.key, label: m.label }))}
                />
              </div>
            </div>
            <button
              onClick={addEntry}
              disabled={!selectedFood && !(query.trim() && +customPer100 > 0)}
              style={{ marginTop: 10, borderColor: "var(--accent)", color: "var(--accent)" }}
            >
              افزودن به امروز
            </button>
          </div>

          <div className="tm-extra">
            <div className="domain-sub">امروز</div>
            {entries.length ? (
              entries.map((e) => (
                <div key={e.id} className="item-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="name">
                    {e.customName} <span className="mono" style={{ color: "var(--muted2)" }}>({faNum(e.grams)}g)</span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="mono">{faNum(e.customCalories)} kcal</span>
                    <button className="small" onClick={() => removeEntry(e.id)} style={{ borderColor: "#E05252", color: "#E05252" }}>×</button>
                  </span>
                </div>
              ))
            ) : (
              <div className="item-line empty">هنوز چیزی برای امروز ثبت نشده</div>
            )}
          </div>

          <div className="tm-extra">
            <div className="domain-sub" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={toggleHistory}>
              <span>تاریخچه غذایی (۳۰ روز اخیر)</span>
              <span>{historyOpen ? "▲" : "▼"}</span>
            </div>
            {historyOpen && (
              historyLoading ? (
                <div className="item-line">در حال بارگذاری…</div>
              ) : historyDates.length ? (
                historyDates.map((d) => {
                  const dayEntries = historyByDate[d];
                  const dayTotal = dayEntries.reduce((s, e) => s + e.customCalories, 0);
                  return (
                    <div key={d} className="calorie-history-day">
                      <div className="calorie-history-day-head">
                        <span className="mono">{d}</span>
                        <span className="mono" style={{ color: "var(--accent)" }}>{faNum(dayTotal)} kcal</span>
                      </div>
                      <div className="calorie-history-day-items">
                        {dayEntries.map((e) => `${e.customName} (${faNum(e.customCalories)}kcal)`).join("، ")}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="item-line empty">هنوز تاریخچه‌ای ثبت نشده</div>
              )
            )}
          </div>
        </>
      )}

      <div className="disclaimer-note">
        این جدول کالری/وعده‌ها فقط یک پیشنهاد است و هیچ اجباری به اجرای دقیق آن نیست؛ مسئولیت کل برنامه‌ی غذایی با خود کاربر است.
      </div>
    </div>
  );
}
