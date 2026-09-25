import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import BottomSheet from "@/components/BottomSheet";
import { tapHaptic } from "@/lib/haptics";
import { searchFoods, addCalorieEntry, type FoodSearchResult } from "../lib/repo";
import { UNIT_LABELS, UNIT_TO_GRAMS, type FoodUnit } from "../lib/calorieCalc";
import type { MealType } from "../lib/exerciseTypes";

const MEAL_OPTIONS: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "صبحانه" },
  { value: "lunch", label: "ناهار" },
  { value: "dinner", label: "شام" },
  { value: "snack", label: "میان‌وعده" },
];

/** ثبتِ آفلاینِ یک ردیفِ غذا — جستجو در FOOD_SEED محلی + غذاهای سفارشیِ کاربر. */
export default function AddCalorieEntrySheet({
  open,
  onClose,
  date,
}: {
  open: boolean;
  onClose: () => void;
  date: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [selected, setSelected] = useState<FoodSearchResult | null>(null);
  const [amount, setAmount] = useState("100");
  const [unit, setUnit] = useState<FoodUnit>("gram");
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    searchFoods(query).then(setResults);
  }, [open, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelected(null);
      setAmount("100");
      setUnit("gram");
    }
  }, [open]);

  async function submit() {
    if (!selected) return;
    setSaving(true);
    try {
      const grams = Math.max(1, Number(amount) || 0) * UNIT_TO_GRAMS[unit];
      await addCalorieEntry({
        name: selected.name,
        caloriesPer100g: selected.caloriesPer100g,
        proteinPer100g: selected.proteinPer100g,
        carbsPer100g: selected.carbsPer100g,
        fatPer100g: selected.fatPer100g,
        grams,
        date,
        mealType,
      });
      void tapHaptic();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="افزودنِ غذا">
      <div className="flex flex-col gap-3">
        {!selected && (
          <>
            <div
              className="flex items-center gap-2 rounded-xl px-3"
              style={{ height: 46, background: "var(--surface-2)" }}
            >
              <Search size={16} color="var(--muted)" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="جستجوی غذا…"
                className="min-w-0 flex-1 bg-transparent font-vazir text-[13.5px]"
                style={{ color: "var(--text)" }}
                autoFocus
              />
            </div>
            <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
              {results.map((f) => (
                <button
                  key={f.name}
                  onClick={() => setSelected(f)}
                  className="flex items-center justify-between rounded-lg px-3 text-start"
                  style={{ minHeight: 46, background: "var(--surface-2)" }}
                >
                  <span className="font-vazir text-[13px]" style={{ color: "var(--text)" }}>
                    {f.name}
                  </span>
                  <span className="font-vazir text-[11.5px]" style={{ color: "var(--muted)" }}>
                    {f.caloriesPer100g} kcal/۱۰۰g
                  </span>
                </button>
              ))}
              {query.trim() && results.length === 0 && (
                <p className="py-4 text-center font-vazir text-[12.5px]" style={{ color: "var(--muted)" }}>
                  پیدا نشد — می‌تونی از «افزودنِ غذای سفارشی» در تنظیمات استفاده کنی.
                </p>
              )}
            </div>
          </>
        )}

        {selected && (
          <>
            <div className="flex items-center justify-between rounded-xl p-3" style={{ background: "var(--surface-2)" }}>
              <span className="font-vazir text-[13.5px] font-medium" style={{ color: "var(--text)" }}>
                {selected.name}
              </span>
              <button onClick={() => setSelected(null)} className="font-vazir text-[12px]" style={{ color: "var(--accent)" }}>
                تغییر
              </button>
            </div>

            <div className="flex gap-2">
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                className="min-w-0 flex-1 rounded-lg px-3 font-vazir text-[13.5px]"
                style={{ height: 46, background: "var(--surface-2)", color: "var(--text)" }}
              />
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as FoodUnit)}
                className="rounded-lg px-2 font-vazir text-[13px]"
                style={{ height: 46, background: "var(--surface-2)", color: "var(--text)" }}
              >
                {(Object.keys(UNIT_LABELS) as FoodUnit[]).map((u) => (
                  <option key={u} value={u}>
                    {UNIT_LABELS[u]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              {MEAL_OPTIONS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMealType(m.value)}
                  className="rounded-full px-3 font-vazir text-[12.5px]"
                  style={{
                    minHeight: 40,
                    background: mealType === m.value ? "var(--accent)" : "var(--surface-2)",
                    color: mealType === m.value ? "#fff" : "var(--text)",
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <button
              onClick={submit}
              disabled={saving}
              className="rounded-xl font-vazir text-[14px] font-semibold"
              style={{ minHeight: 48, background: "var(--accent)", color: "#fff" }}
            >
              {saving ? "در حال ذخیره…" : "افزودن"}
            </button>
          </>
        )}
      </div>
    </BottomSheet>
  );
}
