"use client";

import { useEffect, useState } from "react";
import { ChevronDown, PlusCircle } from "lucide-react";
import { FoodSeedItem } from "@/lib/foodSeed";
import { FoodUnit, UNIT_LABELS, UNIT_TO_GRAMS } from "@/lib/calorieCalc";
import { isoLocal } from "@/lib/jalali";
import { DashCard } from "./DashCard";
import { SegmentedTabs } from "./SegmentedTabs";

const todayKey = isoLocal(new Date());

// «افزودن غذا» — فرمِ جستجو/ثبتِ غذای امروز، خودش با API صحبت می‌کنه و
// بعدِ ثبتِ موفق onAdded رو صدا می‌زنه (دقیقاً مثلِ الگوی AddExerciseProgramForm).
export function CalorieAddFoodCard({
  mealTypes,
  onAdded,
  delay,
}: {
  mealTypes: { key: string; label: string }[];
  onAdded: () => void;
  delay?: number;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<FoodSeedItem[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodSeedItem | null>(null);
  const [customPer100, setCustomPer100] = useState("");
  const [qty, setQty] = useState("100");
  const [unit, setUnit] = useState<FoodUnit>("gram");
  const [unitPickerOpen, setUnitPickerOpen] = useState(false);
  const [mealType, setMealType] = useState(mealTypes[0]?.key ?? "lunch");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      fetch(`/api/calorie/foods?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((d) => setSuggestions(d.results || []));
    }, 150);
    return () => clearTimeout(id);
  }, [query]);

  async function addEntry() {
    const name = selectedFood?.name || query.trim();
    const per100 = selectedFood ? selectedFood.caloriesPer100g : +customPer100;
    const g = +qty * UNIT_TO_GRAMS[unit];
    if (!name || !per100 || per100 <= 0 || !g) return;
    const totalKcal = Math.round((per100 * g) / 100);

    setSaving(true);
    const res = await fetch("/api/calorie/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: todayKey, customName: name, customCalories: totalKcal, grams: g, mealType }),
    });
    setSaving(false);
    if (res.ok) {
      setQuery(""); setSelectedFood(null); setCustomPer100(""); setQty("100"); setUnit("gram");
      onAdded();
    }
  }

  const canAdd = !!selectedFood || (query.trim() && +customPer100 > 0);

  return (
    <DashCard delay={delay}>
      <h2 className="flex items-center gap-1.5 text-[13px] font-bold text-dash-text sm:text-[15px]">
        <PlusCircle className="h-4 w-4 text-dash-green sm:h-[18px] sm:w-[18px]" />
        افزودن غذا
      </h2>

      <div className="relative mt-3">
        <input
          type="text"
          className="wsearch-newform-name w-full"
          placeholder="جستجوی غذا…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelectedFood(null); }}
        />
        {!selectedFood && query.trim() && suggestions.length > 0 && (
          <div className="mt-1.5 flex max-h-[220px] flex-col gap-1.5 overflow-y-auto">
            {suggestions.map((f) => (
              <div
                key={f.name}
                onClick={() => { setSelectedFood(f); setQuery(f.name); setCustomPer100(""); }}
                className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-dash-border bg-white/[0.02] px-3 py-2 transition hover:border-dash-green/40"
              >
                <span className="text-[11.5px] font-semibold text-dash-text sm:text-[12.5px]">{f.name}</span>
                <span className="mono text-[10.5px] text-dash-muted sm:text-[11.5px]">{f.caloriesPer100g} kcal/۱۰۰g</span>
              </div>
            ))}
          </div>
        )}
        {!selectedFood && query.trim() && suggestions.length === 0 && (
          <div className="mt-1.5">
            <div className="text-[10.5px] text-dash-muted sm:text-[11.5px]">غذا در لیست پیدا نشد — کالری هر ۱۰۰ گرمش رو دستی وارد کن</div>
            <input
              type="number"
              className="wsearch-newform-name mt-1.5 w-full"
              placeholder="کالری به‌ازای هر ۱۰۰ گرم"
              value={customPer100}
              onChange={(e) => setCustomPer100(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="mt-2.5 flex gap-2">
        <input
          type="number"
          className="wsearch-newform-name calorie-qty-input shrink-0 text-center"
          placeholder="مقدار"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />
        <div className="relative flex-1">
          <button
            type="button"
            onClick={() => setUnitPickerOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-1.5 rounded-[10px] border border-dash-border bg-white/[0.03] px-3 py-2.5 text-[11.5px] font-semibold text-dash-text sm:text-[12.5px]"
          >
            <span>{UNIT_LABELS[unit]}</span>
            <ChevronDown className={`h-3.5 w-3.5 text-dash-muted transition-transform ${unitPickerOpen ? "rotate-180" : ""}`} />
          </button>
          {unitPickerOpen && (
            <>
              <div className="fixed inset-0 z-[19]" onClick={() => setUnitPickerOpen(false)} />
              <div className="absolute inset-x-0 top-[calc(100%+4px)] z-20 max-h-[200px] overflow-y-auto rounded-xl border border-dash-border bg-dash-bg p-1 shadow-lg">
                {(Object.keys(UNIT_LABELS) as FoodUnit[]).map((u) => (
                  <div
                    key={u}
                    onClick={() => { setUnit(u); setUnitPickerOpen(false); }}
                    className={`cursor-pointer rounded-lg px-2.5 py-2 text-[11.5px] transition ${u === unit ? "font-bold text-dash-green" : "text-dash-muted hover:text-dash-text"}`}
                  >
                    {UNIT_LABELS[u]}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-2.5">
        <SegmentedTabs active={mealType} onChange={setMealType} options={mealTypes.map((m) => ({ value: m.key, label: m.label }))} />
      </div>

      <button
        type="button"
        onClick={addEntry}
        disabled={!canAdd || saving}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border py-3 text-[13px] font-bold disabled:opacity-40 sm:text-[15px]"
        style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
      >
        {saving ? "در حال ثبت…" : "افزودن به امروز"}
      </button>
    </DashCard>
  );
}
