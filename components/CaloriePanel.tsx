"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { isoLocal, faNum } from "@/lib/jalali";
import { FoodSeedItem } from "@/lib/foodSeed";

const todayKey = isoLocal(new Date());

const MEAL_TYPES: { key: string; label: string }[] = [
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
};

export function CaloriePanel() {
  const { status } = useSession();
  const [target, setTarget] = useState<number | null>(null);
  const [targetInput, setTargetInput] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<FoodSeedItem[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodSeedItem | null>(null);
  const [grams, setGrams] = useState("100");
  const [mealType, setMealType] = useState("lunch");

  async function loadTarget() {
    const res = await fetch("/api/calorie/target");
    const data = await res.json();
    setTarget(data.target?.dailyTargetKcal ?? null);
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

  async function saveTarget() {
    const val = +targetInput;
    if (!val || val < 800) return;
    const res = await fetch("/api/calorie/target", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dailyTargetKcal: val }),
    });
    const data = await res.json();
    if (res.ok) { setTarget(data.target.dailyTargetKcal); setTargetInput(""); }
  }

  async function addEntry() {
    const name = selectedFood?.name || query.trim();
    const per100 = selectedFood?.caloriesPer100g;
    const g = +grams;
    if (!name || !per100 || !g) return;
    const totalKcal = Math.round((per100 * g) / 100);

    const res = await fetch("/api/calorie/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: todayKey, customName: name, customCalories: totalKcal, grams: g, mealType }),
    });
    if (res.ok) {
      setQuery(""); setSelectedFood(null); setGrams("100");
      loadEntries();
    }
  }

  async function removeEntry(id: string) {
    setEntries((e) => e.filter((x) => x.id !== id));
    await fetch(`/api/calorie/log?id=${id}`, { method: "DELETE" });
  }

  if (status === "unauthenticated") {
    return (
      <div>
        <div className="section-note" style={{ marginTop: 10 }}>برای ثبت کالری روزانه اول وارد حساب بشو.</div>
        <Link href="/auth/login" className="nav-link" style={{ display: "inline-block", marginTop: 10 }}>ورود / ثبت‌نام →</Link>
      </div>
    );
  }

  const totalToday = entries.reduce((s, e) => s + e.customCalories, 0);
  const pct = target ? Math.min(100, Math.round((totalToday / target) * 100)) : 0;

  return (
    <div>

      {target === null ? (
        <div style={{ marginTop: 12 }}>
          <div className="section-note">اول هدف کالری روزانه‌ات رو مشخص کن</div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <input type="number" className="wsearch-newform-name" placeholder="مثلاً 2000" value={targetInput} onChange={(e) => setTargetInput(e.target.value)} />
            <button onClick={saveTarget} style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>ثبت</button>
          </div>
        </div>
      ) : (
        <>
          <div className="home-stats" style={{ marginTop: 8 }}>
            <b>{faNum(totalToday)}</b> از <b>{faNum(target)}</b> کالری امروز ({faNum(pct)}٪)
          </div>
          <div className="conflict-alert-bar" style={{ position: "static", marginTop: 8, opacity: 1, transform: "none", pointerEvents: "auto" }}>
            <div className="conflict-alert-bar-fill" style={{ transform: `scaleX(${pct / 100})`, background: pct > 100 ? "#E05252" : "var(--accent)" }} />
          </div>

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
                      onClick={() => { setSelectedFood(f); setQuery(f.name); }}
                    >
                      <span className="name">{f.name}</span>
                      <span className="mono" style={{ color: "var(--muted2)" }}>{f.caloriesPer100g} kcal/۱۰۰g</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input type="number" className="wsearch-newform-name" style={{ flex: 1 }} placeholder="گرم" value={grams} onChange={(e) => setGrams(e.target.value)} />
              <div className="day-picker" style={{ flex: 2 }}>
                {MEAL_TYPES.map((m) => (
                  <span key={m.key} className={`day-pill${mealType === m.key ? " on" : ""}`} onClick={() => setMealType(m.key)}>{m.label}</span>
                ))}
              </div>
            </div>
            <button onClick={addEntry} disabled={!selectedFood} style={{ marginTop: 10, borderColor: "var(--accent)", color: "var(--accent)" }}>
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
        </>
      )}
    </div>
  );
}
