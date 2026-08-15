"use client";

import { useState } from "react";
import { Plus, UtensilsCrossed, X } from "lucide-react";
import { faNum } from "@/lib/jalali";
import { DashCard } from "./DashCard";
import { ProgressRing } from "./ProgressRing";
import type { Target } from "./CaloriePanel";

type Entry = { customCalories: number; mealType: string | null };
type MealDraftRow = { key: string; label: string; kcal: string };

// «کالری هر وعده» — از کارتِ «کالری امروز» جدا شده و کارتِ بزرگ‌ترِ خودش رو
// داره، چون تعدادِ وعده‌ها متغیره (۲ تا ۶ تا) و توی یه باکسِ کوچیک جا نمی‌شد.
export function CalorieMealBreakdownCard({
  target,
  entries,
  onTargetChange,
  delay,
}: {
  target: Target;
  entries: Entry[];
  onTargetChange: (target: Target) => void;
  delay?: number;
}) {
  const [editingMeals, setEditingMeals] = useState(false);
  const [mealDraft, setMealDraft] = useState<MealDraftRow[]>([]);
  const [mealDraftError, setMealDraftError] = useState<string | null>(null);
  const [savingMeals, setSavingMeals] = useState(false);

  function openEditMeals() {
    setMealDraft((target.mealBreakdown?.length ? target.mealBreakdown : []).map((m) => ({ key: m.key, label: m.label, kcal: String(m.kcal) })));
    setMealDraftError(null);
    setEditingMeals(true);
  }

  function addMealDraftRow() {
    if (mealDraft.length >= 8) return;
    setMealDraft((rows) => [...rows, { key: `meal_${Date.now()}`, label: "", kcal: "" }]);
  }
  function updateMealDraftRow(key: string, patch: Partial<MealDraftRow>) {
    setMealDraft((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function removeMealDraftRow(key: string) {
    setMealDraft((rows) => rows.filter((r) => r.key !== key));
  }

  async function saveMeals() {
    if (mealDraft.length === 0) { setMealDraftError("حداقل یک وعده لازمه"); return; }
    for (const r of mealDraft) {
      if (!r.label.trim()) { setMealDraftError("اسم همه‌ی وعده‌ها رو وارد کن"); return; }
      if (!r.kcal || +r.kcal <= 0) { setMealDraftError("کالری همه‌ی وعده‌ها باید عدد مثبت باشه"); return; }
    }
    setMealDraftError(null);
    setSavingMeals(true);
    const res = await fetch("/api/calorie/target", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mealBreakdown: mealDraft.map((r) => ({ key: r.key, label: r.label.trim(), kcal: +r.kcal })) }),
    });
    const data = await res.json();
    setSavingMeals(false);
    if (!res.ok) { setMealDraftError(data.error || "خطایی پیش آمد"); return; }
    onTargetChange(data.target);
    setEditingMeals(false);
  }

  return (
    <DashCard delay={delay} className="p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-[13px] font-bold text-dash-text sm:text-[15px]">
          <UtensilsCrossed className="h-4 w-4 text-dash-green sm:h-[18px] sm:w-[18px]" />
          کالری هر وعده
        </h2>
        {!editingMeals && (
          <button type="button" onClick={openEditMeals} className="text-[11px] font-semibold text-dash-green transition hover:brightness-110 sm:text-[12.5px]">
            ویرایش وعده‌ها
          </button>
        )}
      </div>

      {editingMeals ? (
        <div className="mt-3 flex flex-col gap-2.5">
          {mealDraft.map((row) => (
            <div key={row.key} className="flex items-center gap-1.5">
              <input
                className="wsearch-newform-name flex-[2]"
                placeholder="اسم وعده"
                value={row.label}
                onChange={(e) => updateMealDraftRow(row.key, { label: e.target.value })}
              />
              <input
                type="number"
                className="wsearch-newform-name flex-1"
                placeholder="کالری"
                value={row.kcal}
                onChange={(e) => updateMealDraftRow(row.key, { kcal: e.target.value })}
              />
              <button
                type="button"
                onClick={() => removeMealDraftRow(row.key)}
                aria-label="حذف وعده"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[13px] transition hover:bg-[rgba(224,82,82,.12)] hover:border-[#E05252] hover:text-[#E05252]"
                style={{ borderColor: "rgba(224,82,82,.35)", color: "#E05252" }}
              >
                <X size={13} />
              </button>
            </div>
          ))}

          {mealDraft.length < 8 && (
            <button
              type="button"
              onClick={addMealDraftRow}
              className="flex items-center justify-center gap-1 self-start text-[11px] font-semibold text-dash-green transition hover:brightness-110 sm:text-[12.5px]"
            >
              <Plus size={14} />
              افزودن وعده
            </button>
          )}

          <div className="text-[10.5px] text-dash-muted sm:text-[11.5px]">جمع: {faNum(mealDraft.reduce((s, r) => s + (+r.kcal || 0), 0))} کالری</div>

          {mealDraftError && <div className="field-error-msg" style={{ display: "block" }}>{mealDraftError}</div>}

          <div className="mt-1 flex gap-2">
            <button type="button" onClick={() => setEditingMeals(false)} className="flex-1 rounded-2xl border py-2.5 text-[12px] font-semibold text-dash-muted" style={{ borderColor: "var(--line)" }}>
              انصراف
            </button>
            <button
              type="button"
              disabled={savingMeals}
              onClick={saveMeals}
              className="flex-[2] rounded-2xl border py-2.5 text-[12px] font-bold disabled:opacity-40"
              style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
            >
              {savingMeals ? "در حال ذخیره…" : "ذخیره وعده‌ها"}
            </button>
          </div>
        </div>
      ) : !!target.mealBreakdown?.length && (
        <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5">
          {target.mealBreakdown.map((m) => {
            const consumed = entries.filter((e) => e.mealType === m.key).reduce((s, e) => s + e.customCalories, 0);
            const mealPct = m.kcal > 0 ? consumed / m.kcal : 0;
            const over = mealPct > 1;
            return (
              <div key={m.key} className="flex flex-col items-center gap-1.5 rounded-2xl border border-dash-border bg-white/[0.02] px-2 py-2.5 text-center">
                <span className="shrink-0 sm:hidden">
                  <ProgressRing pct={mealPct} size={38} strokeWidth={4} color={over ? "#E05252" : "var(--accent)"}>
                    <span className="mono text-[8.5px] font-extrabold" style={{ color: "var(--text)" }}>{faNum(Math.round(mealPct * 100))}٪</span>
                  </ProgressRing>
                </span>
                <span className="hidden shrink-0 sm:inline-flex">
                  <ProgressRing pct={mealPct} size={44} strokeWidth={4.5} color={over ? "#E05252" : "var(--accent)"}>
                    <span className="mono text-[9.5px] font-extrabold" style={{ color: "var(--text)" }}>{faNum(Math.round(mealPct * 100))}٪</span>
                  </ProgressRing>
                </span>
                <div className="text-[9px] font-semibold text-dash-muted sm:text-[10.5px]">{m.label}</div>
                <div className="mono text-[10px] font-bold text-dash-text sm:text-[12px]">
                  {faNum(consumed)}<span className="text-[9px] font-semibold text-dash-muted sm:text-[10.5px]"> / {faNum(m.kcal)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashCard>
  );
}
