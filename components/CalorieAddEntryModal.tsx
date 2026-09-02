"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Sparkles } from "lucide-react";
import { FoodSeedItem } from "@/lib/foodSeed";
import { FoodUnit, UNIT_LABELS, UNIT_TO_GRAMS } from "@/lib/calorieCalc";
import { SegmentedTabs } from "./SegmentedTabs";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { NumberInput } from "./NumberInput";

const LAST_UNIT_KEY = "arion-calorie-last-unit";

function readLastUnit(): FoodUnit {
  if (typeof window === "undefined") return "gram";
  const v = localStorage.getItem(LAST_UNIT_KEY);
  return v && v in UNIT_LABELS ? (v as FoodUnit) : "gram";
}

// پاپ‌آپِ «افزودن غذا» — از کارتِ همیشه‌بازِ قبلی به یه پاپ‌آپِ پشتِ دکمه‌ی
// «افزودن» توی کارتِ «برنامه غذایی» تبدیل شده. مسیرِ اصلی حالا واردکردنِ
// دستی/جستجوی کاتالوگه؛ اسکنِ عکس با هوش مصنوعی به‌عنوانِ یه راهِ جایگزینِ
// سریع‌تر زیرِ دکمه‌ی اصلیِ «افزودن» جا گرفته (نه بالای فرم، طبقِ درخواستِ
// کاربر). درشت‌مغذی‌ها (پروتئین/کربوهیدرات/چربی) دیگه فقط وقتی غذا توی
// کاتالوگ پیدا نشه نیستن — همیشه اختیاری در دسترسن، چه کاتالوگی چه دستی.
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
          <div className="modal-title">افزودن غذا</div>
          <button className="nav-close" onClick={onClose} aria-label="بستن">×</button>
        </div>
        <div className="modal-body" style={{ position: "relative" }}>
          <motion.div animate={{ filter: submitted ? "blur(6px)" : "blur(0px)", opacity: submitted ? 0.35 : 1 }} transition={{ duration: 0.3 }}>
            <div className="relative">
              <input
                type="text"
                className="wsearch-newform-name calorie-glass-field w-full"
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
                  <NumberInput
                    className="wsearch-newform-name calorie-glass-field w-full"
                    placeholder="کالری به‌ازای هر ۱۰۰ گرم"
                    value={customPer100}
                    onChange={(v) => setCustomPer100(v)}
                  />
                </div>
              )}

            </div>

            <div className="mt-2.5 flex gap-2">
              <NumberInput
                className="wsearch-newform-name calorie-glass-field calorie-unit-btn-wrap shrink-0 text-center"
                placeholder="مقدار"
                value={qty}
                onChange={(v) => setQty(v)}
              />
              <div className="calorie-unit-btn-wrap relative shrink-0">
                <button
                  type="button"
                  onClick={() => setUnitPickerOpen((v) => !v)}
                  className="calorie-glass-field flex w-full items-center justify-between gap-1.5 border px-3 py-2 text-[11px] font-semibold text-dash-text sm:text-[12px]"
                >
                  <span>{UNIT_LABELS[unit]}</span>
                  <ChevronDown className={`h-3.5 w-3.5 text-dash-muted transition-transform ${unitPickerOpen ? "rotate-180" : ""}`} />
                </button>
                {unitPickerOpen && (
                  <>
                    <div className="fixed inset-0 z-[19]" onClick={() => setUnitPickerOpen(false)} />
                    <div className="calorie-unit-dropdown absolute inset-x-0 top-[calc(100%+4px)] z-20 max-h-[172px] border p-1 shadow-lg" dir="ltr">
                      <div className="calorie-unit-dropdown-inner thin-scroll" dir="rtl">
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
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="mt-2.5">
              <SegmentedTabs active={mealType} onChange={setMealType} options={mealTypes.map((m) => ({ value: m.key, label: m.label }))} />
            </div>

            <div className="mt-2.5 text-[10.5px] text-dash-muted sm:text-[11.5px]">درشت‌مغذی‌ها</div>
            <div className="mt-1.5 flex gap-2">
              <NumberInput className="wsearch-newform-name calorie-glass-field flex-1" placeholder="پروتئین (گرم)" value={proteinG} onChange={(v) => setProteinG(v)} />
              <NumberInput className="wsearch-newform-name calorie-glass-field flex-1" placeholder="کربوهیدرات (گرم)" value={carbsG} onChange={(v) => setCarbsG(v)} />
              <NumberInput className="wsearch-newform-name calorie-glass-field flex-1" placeholder="چربی (گرم)" value={fatG} onChange={(v) => setFatG(v)} />
            </div>

            <button
              type="button"
              onClick={addEntry}
              disabled={!canAdd || saving}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-[13px] font-bold disabled:opacity-40 sm:text-[15px]"
              style={{ background: "var(--accent)", color: "var(--bg)", boxShadow: "0 8px 22px rgba(var(--accent-rgb),.3)" }}
            >
              {saving ? "در حال ثبت…" : "افزودن"}
            </button>

            <div className="my-3.5 flex items-center gap-2.5 text-[10.5px] text-dash-muted">
              <span className="h-px flex-1" style={{ background: "var(--line)" }} />
              یا
              <span className="h-px flex-1" style={{ background: "var(--line)" }} />
            </div>

            {/* فعلاً غیرفعال — طبقِ همون الگوی ردیف‌های «به‌زودی» توی جدولِ
                مقایسه‌ی پلن‌ها (PlanShowcase): خودِ محتوا با بلور پیش‌نمایش
                می‌شه (نه یه متنِ جایگزینِ کم‌کنتراست)، یه نشانِ صریح روش می‌شینه. */}
            <div className="relative">
              <button
                type="button"
                disabled
                aria-hidden="true"
                tabIndex={-1}
                className="pointer-events-none flex w-full select-none items-center justify-center gap-1.5 rounded-2xl border py-2.5 text-[12px] font-bold blur-[3px] sm:text-[13.5px]"
                style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
              >
                <Sparkles size={15} />
                اسکن غذا با هوش مصنوعی
              </button>
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className="rounded-full px-3.5 py-1 text-[11px] font-extrabold text-white"
                  style={{ background: "var(--accent)", boxShadow: "0 8px 22px rgba(var(--accent-rgb),.3)" }}
                >
                  به‌زودی
                </span>
              </div>
            </div>
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
                <div className="text-[12.5px] font-bold text-dash-text sm:text-[13.5px]">با موفقیت اضافه شد</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
