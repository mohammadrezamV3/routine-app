import { useEffect, useRef, useState } from "react";
import BottomSheet from "@/components/BottomSheet";
import { tapHaptic } from "@/lib/haptics";
import { useNetworkStatus } from "@/lib/useNetworkStatus";
import { useSync } from "@/sync/SyncProvider";
import { describeAiError, scanFoodImage } from "@/sync/ai";
import type { FoodScanResult } from "@/lib/api-contract";
import { addCalorieEntry } from "../lib/repo";
import type { MealType } from "../lib/exerciseTypes";

const MEAL_OPTIONS: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "صبحانه" },
  { value: "lunch", label: "ناهار" },
  { value: "dinner", label: "شام" },
  { value: "snack", label: "میان‌وعده" },
];

type Recognized = Extract<FoodScanResult, { recognized: true }>;

/**
 * اسکنِ عکسِ غذا با AI (POST /api/mobile/ai/food-scan — ماژولِ CALORIE).
 * عکس از دوربین/گالری (input[type=file] با capture) سمتِ گوشی به ≤۱۲۸۰px
 * JPEG کوچک می‌شه؛ نتیجه قبل از ثبت قابلِ ویرایشه (مقدار/وعده).
 * `pickToken`: هر بار عوض بشه، انتخاب‌گرِ عکس باز می‌شه.
 */
export default function FoodScanSheet({ pickToken, date }: { pickToken: number; date: string }) {
  const online = useNetworkStatus();
  const { api, loggedIn } = useSync();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Recognized | null>(null);
  const [notRecognized, setNotRecognized] = useState<string | null>(null);
  const [grams, setGrams] = useState("");
  const [mealType, setMealType] = useState<MealType>("lunch");

  useEffect(() => {
    if (!pickToken) return;
    setError(null);
    setResult(null);
    setNotRecognized(null);
    if (!api || !loggedIn) {
      setOpen(true);
      setError("برای اسکنِ عکسِ غذا وارد حسابت شو");
      return;
    }
    inputRef.current?.click();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickToken]);

  async function onFile(file: File | undefined) {
    if (!file || !api) return;
    setOpen(true);
    setBusy(true);
    setError(null);
    try {
      const r = await scanFoodImage(api, file);
      if (r.recognized) {
        setResult(r);
        setGrams(String(Math.round(r.estimatedGrams)));
      } else {
        setNotRecognized(r.message);
      }
    } catch (err) {
      setError(describeAiError(err, online));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function save() {
    if (!result) return;
    const g = Math.max(1, Number(grams) || result.estimatedGrams);
    const base = Math.max(1, result.estimatedGrams);
    const per100 = (v: number) => Math.round(((v * 100) / base) * 10) / 10;
    await addCalorieEntry({
      name: result.name,
      caloriesPer100g: per100(result.calories),
      proteinPer100g: per100(result.proteinG),
      carbsPer100g: per100(result.carbsG),
      fatPer100g: per100(result.fatG),
      grams: g,
      date,
      mealType,
      aiScanned: true,
    });
    void tapHaptic();
    setOpen(false);
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <BottomSheet open={open} onClose={() => !busy && setOpen(false)} title="اسکنِ غذا">
        <div className="flex flex-col gap-3 pb-2">
          {busy && (
            <p className="py-6 text-center font-vazir text-[13.5px]" style={{ color: "var(--muted)" }}>
              در حالِ تحلیلِ عکس…
            </p>
          )}
          {error && (
            <p role="alert" className="py-4 text-center font-vazir text-[13px] leading-6" style={{ color: "var(--pnl-loss)" }}>
              {error}
            </p>
          )}
          {notRecognized && (
            <p className="py-4 text-center font-vazir text-[13px] leading-6" style={{ color: "var(--muted)" }}>
              {notRecognized}
            </p>
          )}
          {result && !busy && (
            <>
              <p className="font-vazir text-[15px] font-semibold" style={{ color: "var(--text)" }}>
                {result.name}
              </p>
              <p className="font-vazir text-[12.5px]" style={{ color: "var(--muted)" }}>
                تخمین برای {Math.round(result.estimatedGrams)} گرم: {Math.round(result.calories)} kcal · پروتئین {Math.round(result.proteinG)} ·
                کربوهیدرات {Math.round(result.carbsG)} · چربی {Math.round(result.fatG)}
              </p>
              <label className="flex flex-col gap-1">
                <span className="font-vazir text-[12px]" style={{ color: "var(--muted)" }}>
                  مقدار (گرم)
                </span>
                <input
                  inputMode="numeric"
                  value={grams}
                  onChange={(e) => setGrams(e.target.value.replace(/[^0-9]/g, ""))}
                  className="rounded-xl px-3 font-vazir text-[14px]"
                  style={{ height: 46, border: "1px solid var(--surface-line)", background: "var(--input-bg)", color: "var(--text)" }}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {MEAL_OPTIONS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMealType(m.value)}
                    className="rounded-full border px-3 font-vazir text-[12.5px]"
                    style={{
                      minHeight: 38,
                      borderColor: mealType === m.value ? "var(--accent)" : "var(--surface-line)",
                      color: mealType === m.value ? "var(--accent)" : "var(--text)",
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => void save()}
                className="mt-1 rounded-xl font-vazir text-[14px] font-semibold"
                style={{ minHeight: 48, background: "var(--accent)", color: "#fff" }}
              >
                ثبت در وعده‌ها
              </button>
            </>
          )}
        </div>
      </BottomSheet>
    </>
  );
}
