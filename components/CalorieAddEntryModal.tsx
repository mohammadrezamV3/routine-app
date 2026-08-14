"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { FoodSeedItem } from "@/lib/foodSeed";
import { FoodUnit, UNIT_LABELS, UNIT_TO_GRAMS } from "@/lib/calorieCalc";
import { SegmentedTabs } from "./SegmentedTabs";

// پاپ‌آپِ «افزودن غذا» — از کارتِ همیشه‌بازِ قبلی به یه پاپ‌آپِ پشتِ دکمه‌ی
// «افزودن» توی کارتِ «برنامه غذایی» تبدیل شده (طبقِ طرحِ کاربر). سه راه برای
// ثبت: جستجو توی کاتالوگ، وارد کردنِ دستی (حالا با پروتئین/کربوهیدرات/چربیِ
// اختیاری هم)، یا اسکنِ عکس با هوش مصنوعی (که پاپ‌آپِ جداگانه‌ی خودش رو داره).
export function CalorieAddEntryModal({
  date,
  mealTypes,
  onClose,
  onAdded,
  onOpenAiScan,
}: {
  date: string;
  mealTypes: { key: string; label: string }[];
  onClose: () => void;
  onAdded: () => void;
  onOpenAiScan: () => void;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<FoodSeedItem[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodSeedItem | null>(null);
  const [customPer100, setCustomPer100] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [carbsG, setCarbsG] = useState("");
  const [fatG, setFatG] = useState("");
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

  const isManual = !selectedFood && query.trim() && suggestions.length === 0;

  async function addEntry() {
    const name = selectedFood?.name || query.trim();
    const per100 = selectedFood ? selectedFood.caloriesPer100g : +customPer100;
    const g = +qty * UNIT_TO_GRAMS[unit];
    if (!name || !per100 || per100 <= 0 || !g) return;
    const totalKcal = Math.round((per100 * g) / 100);

    // درشت‌مغذی‌های دستی فقط وقتی ارسال می‌شن که واقعاً چیزی وارد شده باشه —
    // یا هر سه‌تا با هم می‌رن، یا هیچ‌کدوم (تا API نصفه‌ونیمه رد نکنه).
    const hasMacros = isManual && (proteinG.trim() || carbsG.trim() || fatG.trim());

    setSaving(true);
    const res = await fetch("/api/calorie/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date, customName: name, customCalories: totalKcal, grams: g, mealType,
        ...(hasMacros ? { proteinG: +proteinG || 0, carbsG: +carbsG || 0, fatG: +fatG || 0 } : {}),
      }),
    });
    setSaving(false);
    if (res.ok) {
      onAdded();
      onClose();
    }
  }

  const canAdd = !!selectedFood || (query.trim() && +customPer100 > 0);

  return (
    <>
      <div className="modal-overlay open" onClick={onClose} />
      <div className="modal-panel liquid-glass-panel dash-scope open">
        <div className="modal-head">
          <div className="modal-title">افزودن غذا</div>
          <button className="nav-close" onClick={onClose} aria-label="بستن">×</button>
        </div>
        <div className="modal-body">
          <button
            type="button"
            onClick={onOpenAiScan}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl border py-2.5 text-[12px] font-bold sm:text-[13.5px]"
            style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
          >
            <Sparkles size={15} />
            اسکن غذا با هوش مصنوعی
          </button>

          <div className="my-3.5 flex items-center gap-2.5 text-[10.5px] text-dash-muted">
            <span className="h-px flex-1" style={{ background: "var(--line)" }} />
            یا دستی وارد کن
            <span className="h-px flex-1" style={{ background: "var(--line)" }} />
          </div>

          <div className="relative">
            <input
              type="text"
              className="wsearch-newform-name w-full"
              placeholder="جستجوی غذا…"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedFood(null); }}
            />
            {!selectedFood && query.trim() && suggestions.length > 0 && (
              <div className="mt-1.5 flex max-h-[180px] flex-col gap-1.5 overflow-y-auto">
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
            {isManual && (
              <div className="mt-2 flex flex-col gap-2">
                <div className="text-[10.5px] text-dash-muted sm:text-[11.5px]">غذا در لیست پیدا نشد — کالری هر ۱۰۰ گرمش رو دستی وارد کن</div>
                <input
                  type="number"
                  className="wsearch-newform-name w-full"
                  placeholder="کالری به‌ازای هر ۱۰۰ گرم"
                  value={customPer100}
                  onChange={(e) => setCustomPer100(e.target.value)}
                />
                <div className="text-[10.5px] text-dash-muted sm:text-[11.5px]">درشت‌مغذی‌ها (اختیاری — کلِ مقدارِ ثبت‌شده، نه هر ۱۰۰ گرم)</div>
                <div className="flex gap-2">
                  <input type="number" className="wsearch-newform-name flex-1" placeholder="پروتئین (گرم)" value={proteinG} onChange={(e) => setProteinG(e.target.value)} />
                  <input type="number" className="wsearch-newform-name flex-1" placeholder="کربوهیدرات (گرم)" value={carbsG} onChange={(e) => setCarbsG(e.target.value)} />
                  <input type="number" className="wsearch-newform-name flex-1" placeholder="چربی (گرم)" value={fatG} onChange={(e) => setFatG(e.target.value)} />
                </div>
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
            {saving ? "در حال ثبت…" : "افزودن"}
          </button>
        </div>
      </div>
    </>
  );
}
