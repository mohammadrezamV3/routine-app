import { useEffect, useState } from "react";
import BottomSheet from "@/components/BottomSheet";
import { tapHaptic } from "@/lib/haptics";
import { calcDailyTargetKcal, splitMeals, CALORIE_GOAL_LABELS, type CalorieGoal, type Sex } from "../lib/calorieCalc";
import { setCalorieTarget, getActivePlan } from "../lib/repo";
import type { CalorieTargetRow } from "../lib/exerciseTypes";

const GOALS = Object.keys(CALORIE_GOAL_LABELS) as CalorieGoal[];

/**
 * محاسبه‌ی هدفِ کالریِ روزانه (Mifflin-St Jeor، همون فرمولِ وب) — کاملا آفلاین.
 * روزهای باشگاه دیگه ورودیِ دستی نیست: دقیقا مثلِ سرور
 * (lib/calorieTargetService.ts → computeCalorieTarget) از برنامه‌ی ورزشیِ
 * فعالِ محلی مشتق می‌شه (gymDays.length، وگرنه پیش‌فرضِ محافظه‌کارانه‌ی ۱ روز)
 * تا عدد قبل از sync هم با سرور یکی باشه.
 */
export default function GoalSheet({
  open,
  onClose,
  current,
}: {
  open: boolean;
  onClose: () => void;
  current?: CalorieTargetRow;
}) {
  const [sex, setSex] = useState<Sex>(current?.sex ?? "male");
  const [age, setAge] = useState(current?.ageYears ? String(current.ageYears) : "");
  const [heightCm, setHeightCm] = useState(current?.heightCm ? String(current.heightCm) : "");
  const [weightKg, setWeightKg] = useState(current?.weightKg ? String(current.weightKg) : "");
  const [gymDaysPerWeek, setGymDaysPerWeek] = useState<number | null>(null);
  const [trainingPhase, setTrainingPhase] = useState<string | null>(null);
  const [goal, setGoal] = useState<CalorieGoal>((current?.goal as CalorieGoal) ?? "maintain");
  const [mealsPerDay, setMealsPerDay] = useState(current?.mealsPerDay ? String(current.mealsPerDay) : "3");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const activePlan = await getActivePlan();
      if (cancelled) return;
      // همون قاعده‌ی سرور: بدونِ برنامه‌ی فعال، «۳ روز» فرض نکن (ضریب فعالیتِ
      // متوسط رو به یه کاربرِ بدونِ تمرین می‌داد) — پیش‌فرضِ محافظه‌کارانه ۱ روزه.
      const activeGymDays = activePlan?.gymDays && Array.isArray(activePlan.gymDays) ? activePlan.gymDays : null;
      setGymDaysPerWeek(activeGymDays ? activeGymDays.length : 1);
      setTrainingPhase(activePlan?.trainingPhase ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const canCompute = age && heightCm && weightKg && gymDaysPerWeek !== null;

  async function submit() {
    setSaving(true);
    try {
      const meals = Math.min(6, Math.max(2, Number(mealsPerDay) || 3));
      let dailyTargetKcal = current?.dailyTargetKcal ?? 2000;
      if (canCompute) {
        dailyTargetKcal = calcDailyTargetKcal({
          sex,
          weightKg: Number(weightKg),
          heightCm: Number(heightCm),
          age: Number(age),
          gymDaysPerWeek: gymDaysPerWeek ?? 1,
          goal,
          trainingPhase,
        });
      }
      const mealBreakdown = splitMeals(dailyTargetKcal, meals);
      await setCalorieTarget({
        dailyTargetKcal,
        goal,
        mealsPerDay: meals,
        mealBreakdown,
        proteinTargetG: null,
        carbsTargetG: null,
        fatTargetG: null,
        sex,
        ageYears: age ? Number(age) : null,
        heightCm: heightCm ? Number(heightCm) : null,
        weightKg: weightKg ? Number(weightKg) : null,
      });
      void tapHaptic();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="هدفِ کالری">
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          {(["male", "female"] as Sex[]).map((s) => (
            <button
              key={s}
              onClick={() => setSex(s)}
              className="flex-1 rounded-lg font-vazir text-[13px]"
              style={{
                minHeight: 44,
                background: sex === s ? "var(--accent)" : "var(--surface-2)",
                color: sex === s ? "#fff" : "var(--text)",
              }}
            >
              {s === "male" ? "مرد" : "زن"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Num label="سن" value={age} onChange={setAge} />
          <Num label="قد (cm)" value={heightCm} onChange={setHeightCm} />
          <Num label="وزن (kg)" value={weightKg} onChange={setWeightKg} />
        </div>

        <div className="rounded-lg px-3 py-2" style={{ background: "var(--surface-2)" }}>
          <p className="font-vazir text-[11px]" style={{ color: "var(--muted)" }}>
            روزِ باشگاه در هفته (از برنامه‌ی ورزشیِ فعال)
          </p>
          <p className="font-vazir text-[13px] font-medium" style={{ color: "var(--text)" }}>
            {gymDaysPerWeek === null ? "در حال بارگذاری…" : `${gymDaysPerWeek} روز`}
          </p>
        </div>

        <div>
          <p className="mb-1.5 font-vazir text-[12px] font-medium" style={{ color: "var(--muted)" }}>
            هدف
          </p>
          <div className="flex gap-2">
            {GOALS.map((g) => (
              <button
                key={g}
                onClick={() => setGoal(g)}
                className="flex-1 rounded-lg font-vazir text-[12.5px]"
                style={{
                  minHeight: 44,
                  background: goal === g ? "var(--accent)" : "var(--surface-2)",
                  color: goal === g ? "#fff" : "var(--text)",
                }}
              >
                {CALORIE_GOAL_LABELS[g]}
              </button>
            ))}
          </div>
        </div>

        <Num label="تعداد وعده در روز" value={mealsPerDay} onChange={setMealsPerDay} />

        {!canCompute && (
          <p className="font-vazir text-[11.5px]" style={{ color: "var(--muted)" }}>
            بدونِ سن/قد/وزن، فقط تعدادِ وعده‌ها ذخیره می‌شه (هدفِ کالریِ فعلی دست‌نخورده می‌مونه).
          </p>
        )}

        <button
          onClick={submit}
          disabled={saving}
          className="rounded-xl font-vazir text-[14px] font-semibold"
          style={{ minHeight: 48, background: "var(--accent)", color: "#fff" }}
        >
          {saving ? "در حال محاسبه…" : "محاسبه و ذخیره"}
        </button>
      </div>
    </BottomSheet>
  );
}

function Num({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-vazir text-[11px]" style={{ color: "var(--muted)" }}>
        {label}
      </span>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
        className="rounded-lg px-2 font-vazir text-[13px]"
        style={{ height: 44, background: "var(--surface-2)", color: "var(--text)" }}
      />
    </div>
  );
}
