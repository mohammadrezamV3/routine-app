"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { FoodSeedItem } from "@/lib/foodSeed";
import { FoodUnit, UNIT_LABELS, UNIT_TO_GRAMS } from "@/lib/calorieCalc";
import { SegmentedTabs } from "./SegmentedTabs";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { NumberInput } from "./NumberInput";
import { Spinner } from "./Spinner";
import { isEn, tr } from "@/lib/i18n";
import { foodNameDisplay, searchFoodNamesEn } from "@/lib/foodNamesEn";

const LAST_UNIT_KEY = "arion-calorie-last-unit";

function readLastUnit(): FoodUnit {
  if (typeof window === "undefined") return "gram";
  const v = localStorage.getItem(LAST_UNIT_KEY);
  return v && v in UNIT_LABELS ? (v as FoodUnit) : "gram";
}

// پاپ‌آپ «افزودن غذا» پشت دکمه‌ی «افزودن» توی کارت «برنامه غذایی»: واردکردن
// دستی یا جستجوی کاتالوگ. درشت‌مغذی‌ها (پروتئین/کربوهیدرات/چربی) همیشه
// اختیاری در دسترسن، چه کاتالوگی چه دستی.

export function CalorieAddEntryModal({
  date,
  mealTypes,
  onClose,
  onAdded,
}: {
  date: string;
  mealTypes: { key: string; label: string }[];
  onClose: () => void;
  onAdded: () => void;
}) {
  useLockBodyScroll();
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
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => { setUnit(readLastUnit()); }, []);

  function changeUnit(u: FoodUnit) {
    setUnit(u);
    setUnitPickerOpen(false);
    try { localStorage.setItem(LAST_UNIT_KEY, u); } catch {}
  }

  useEffect(() => {
    const id = setTimeout(() => {
      // جستجوی لاتین در حالت انگلیسی: روی نام‌های انگلیسی کاتالوگ (سمت کلاینت)
      if (isEn() && /[a-z]/i.test(query)) {
        import("@/lib/foodSeed").then(({ FOOD_SEED }) => {
          const names = searchFoodNamesEn(query);
          setSuggestions(names.map((n) => FOOD_SEED.find((f) => f.name === n)).filter((f): f is FoodSeedItem => !!f));
        });
        return;
      }
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

    // درشت‌مغذی‌های دستی فقط وقتی ارسال می‌شن که واقعا چیزی وارد شده باشه —
    // یا هر سه‌تا با هم می‌رن، یا هیچ‌کدوم (تا API نصفه‌ونیمه رد نکنه).
    const hasMacros = proteinG.trim() || carbsG.trim() || fatG.trim();

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
      setSubmitted(true);
      setTimeout(onClose, 850);
    }
  }

  const canAdd = !!selectedFood || (query.trim() && +customPer100 > 0);

  return (
    <>
      <div className="modal-overlay open" onClick={onClose} />
      <div className="modal-panel liquid-glass-panel dash-scope open">
        <div className="modal-head">
          <div className="modal-title">{tr("افزودن غذا", "Add food")}</div>
          <button className="nav-close" onClick={onClose} aria-label={tr("بستن", "Close")}>×</button>
        </div>
        <div className="modal-body" style={{ position: "relative" }}>
          <motion.div animate={{ filter: submitted ? "blur(6px)" : "blur(0px)", opacity: submitted ? 0.35 : 1 }} transition={{ duration: 0.3 }}>
            <div className="relative">
              <label className="calorie-field-label" htmlFor="calorie-food-name">{tr("نام غذا", "Food name")}</label>
              <input
                id="calorie-food-name"
                type="text"
                className="wsearch-newform-name calorie-glass-field w-full"
                placeholder={tr("جستجوی غذا…", "Search food…")}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelectedFood(null); }}
              />
              {!selectedFood && query.trim() && suggestions.length > 0 && (
                <div className="mt-1.5 flex max-h-[180px] flex-col gap-1.5 overflow-y-auto">
                  {suggestions.map((f) => (
                    <div
                      key={f.name}
                      onClick={() => { setSelectedFood(f); setQuery(foodNameDisplay(f.name)); setCustomPer100(""); }}
                      className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-dash-border bg-white/[0.02] px-3 py-2 transition hover:border-dash-green/40"
                    >
                      <span className="text-[11.5px] font-semibold text-dash-text sm:text-[12.5px]">{foodNameDisplay(f.name)}</span>
                      <span className="mono text-[10.5px] text-dash-muted sm:text-[11.5px]" dir="ltr">{f.caloriesPer100g} kcal/100g</span>
                    </div>
                  ))}
                </div>
              )}
              {isManual && (
                <div className="mt-2 flex flex-col gap-2">
                  <div className="text-[10.5px] text-dash-muted sm:text-[11.5px]">{tr("غذا در لیست پیدا نشد — کالری هر 100 گرمش رو دستی وارد کن", "Food not found in the list. Enter its calories per 100 g manually")}</div>
                  <NumberInput
                    className="wsearch-newform-name calorie-glass-field w-full"
                    placeholder={tr("کالری به‌ازای هر 100 گرم", "Calories per 100 g")}
                    value={customPer100}
                    onChange={(v) => setCustomPer100(v)}
                  />
                </div>
              )}

            </div>

            {/* «مقدار» و «واحد اندازه‌گیری» دو ستون دقیقا هم‌عرض و هم‌ارتفاعن
                (هر دو flex-1 با همون کلاس فیلد) — قبلا یکی <input> با پدینگ
                خودش بود و اون‌یکی <button> با پدینگ دیگه، برای همین نه عرضشون
                یکی درمی‌اومد نه ارتفاعشون. */}
            <div className="mt-2.5 flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <label className="calorie-field-label" htmlFor="calorie-qty">{tr("مقدار", "Amount")}</label>
                <NumberInput
                  id="calorie-qty"
                  decimal
                  className="wsearch-newform-name calorie-glass-field calorie-qty-field w-full text-center"
                  placeholder={tr("مقدار", "Amount")}
                  value={qty}
                  onChange={(v) => setQty(v)}
                />
              </div>
              <div className="relative min-w-0 flex-1">
                <label className="calorie-field-label">{tr("واحد اندازه‌گیری", "Unit")}</label>
                <button
                  type="button"
                  onClick={() => setUnitPickerOpen((v) => !v)}
                  className="wsearch-newform-name calorie-glass-field calorie-qty-field flex w-full items-center justify-between gap-1.5"
                >
                  <span className="truncate">{UNIT_LABELS[unit]}</span>
                  <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-dash-muted transition-transform ${unitPickerOpen ? "rotate-180" : ""}`} />
                </button>
                {unitPickerOpen && (
                  <>
                    <div className="fixed inset-0 z-[19]" onClick={() => setUnitPickerOpen(false)} />
                    {/* لیست کوتاهه و همه‌ی واحدها جا می‌شن، پس اسکرول‌بار
                        (که کاربر گفت دیده نشه) کاملا حذف شده. */}
                    <div className="calorie-unit-dropdown absolute inset-x-0 top-[calc(100%+4px)] z-20 border p-1 shadow-lg">
                      {(Object.keys(UNIT_LABELS) as FoodUnit[]).map((u) => (
                        <div
                          key={u}
                          onClick={() => changeUnit(u)}
                          className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-[11px] transition ${u === unit ? "font-bold text-dash-green" : "text-dash-muted hover:text-dash-text"}`}
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
              <label className="calorie-field-label">{tr("وعده", "Meal")}</label>
              <SegmentedTabs active={mealType} onChange={setMealType} options={mealTypes.map((m) => ({ value: m.key, label: m.label }))} />
            </div>

            <label className="calorie-field-label mt-2.5">{tr("درشت‌مغذی‌ها (اختیاری)", "Macros (optional)")}</label>
            <div className="mt-1.5 flex gap-2">
              <NumberInput className="wsearch-newform-name calorie-glass-field flex-1" placeholder={tr("پروتئین (گرم)", "Protein (g)")} value={proteinG} onChange={(v) => setProteinG(v)} />
              <NumberInput className="wsearch-newform-name calorie-glass-field flex-1" placeholder={tr("کربوهیدرات (گرم)", "Carbs (g)")} value={carbsG} onChange={(v) => setCarbsG(v)} />
              <NumberInput className="wsearch-newform-name calorie-glass-field flex-1" placeholder={tr("چربی (گرم)", "Fat (g)")} value={fatG} onChange={(v) => setFatG(v)} />
            </div>

            <button
              type="button"
              onClick={addEntry}
              disabled={!canAdd || saving}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-[13px] font-bold disabled:opacity-40 sm:text-[15px]"
              style={{ background: "var(--accent)", color: "var(--bg)", boxShadow: "0 8px 22px rgba(var(--accent-rgb),.3)" }}
            >
              {saving ? <Spinner size={15} /> : tr("افزودن", "Add")}
            </button>
          </motion.div>

          <AnimatePresence>
            {submitted && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2.5"
              >
                <motion.div
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 20 }}
                  className="flex h-14 w-14 items-center justify-center rounded-full"
                  style={{ background: "var(--accent)", boxShadow: "0 0 24px rgba(var(--accent-rgb),.5)" }}
                >
                  <Check className="h-7 w-7" style={{ color: "var(--bg)" }} strokeWidth={3} />
                </motion.div>
                <div className="text-[12.5px] font-bold text-dash-text sm:text-[13.5px]">{tr("با موفقیت اضافه شد", "Added successfully")}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
