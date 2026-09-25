import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import { tapHaptic } from "@/lib/haptics";
import { useNetworkStatus } from "@/lib/useNetworkStatus";
import { toEnglishDigits } from "@/lib/digits";
import { useSync } from "@/sync/SyncProvider";
import { describeAiError, generateAiExercisePlan } from "@/sync/ai";
import { applyRemotePlan } from "@/sync/fitnessAdapter";
import type { MobileExercisePlanRequest } from "@/lib/api-contract";
import { fitnessDb } from "../db";
import { LEVEL_LABELS, type ExerciseLevel } from "../lib/exercisePlans";
import { fitnessRoutePaths } from "../routes";
import { Chip, Field, NumInput, RulesCheckbox } from "./PlanCreateScreen";

// ساختِ برنامه با AI — پورتِ فیلدهای components/AiExercisePlanWizard.tsx (وب):
// قد/وزن، هدف (متنِ آزاد)، ماهِ تمرین، محل (باشگاه/خانه)، روزها، سطح،
// توضیحات، محدودیتِ جسمی، پذیرشِ قوانین. POST /api/mobile/ai/exercise-plan.

const ALL_DAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
const EQUIPMENT_OPTIONS = ["باشگاه", "خانه"];
const LEVELS: ExerciseLevel[] = ["beginner", "intermediate", "advanced"];

const textareaStyle = {
  background: "var(--surface-1)",
  color: "var(--text)",
  border: "1px solid var(--surface-line)",
} as const;

export default function AiPlanWizardScreen() {
  const navigate = useNavigate();
  const online = useNetworkStatus();
  const { api, loggedIn, isModuleLocked } = useSync();

  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [goal, setGoal] = useState("");
  const [trainingMonth, setTrainingMonth] = useState("");
  const [equipment, setEquipment] = useState("باشگاه");
  const [gymDays, setGymDays] = useState<string[]>(["شنبه", "دوشنبه", "چهارشنبه"]);
  const [level, setLevel] = useState<ExerciseLevel>("beginner");
  const [description, setDescription] = useState("");
  const [hasLimitation, setHasLimitation] = useState(false);
  const [limitationDetails, setLimitationDetails] = useState("");
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);

  function validate(): string | null {
    const h = heightCm ? Number(heightCm) : undefined;
    const w = weightKg ? Number(weightKg) : undefined;
    const m = trainingMonth ? Number(trainingMonth) : undefined;
    if (h !== undefined && (h < 50 || h > 260)) return "قد باید بین ۵۰ تا ۲۶۰ سانتی‌متر باشه";
    if (w !== undefined && (w < 20 || w > 400)) return "وزن باید بین ۲۰ تا ۴۰۰ کیلوگرم باشه";
    if (m !== undefined && (m < 1 || m > 600)) return "ماهِ تمرین معتبر نیست";
    if (!goal.trim()) return "هدفِ تمرینت رو بنویس";
    if (gymDays.length === 0) return "حداقل یک روز انتخاب کن";
    if (!rulesAccepted) return "برای ساختِ برنامه باید قوانین رو بپذیری";
    return null;
  }

  async function submit() {
    setError(null);
    setRejection(null);
    if (!online) return setError(describeAiError(null, false));
    if (!api || !loggedIn) return setError("برای ساختِ برنامه با هوش مصنوعی وارد حسابت شو");
    const v = validate();
    if (v) return setError(v);
    const req: MobileExercisePlanRequest = {
      level,
      goal: goal.trim(),
      equipment,
      gymDays,
      rulesAccepted: true,
      ...(heightCm ? { heightCm: Number(heightCm) } : {}),
      ...(weightKg ? { weightKg: Number(weightKg) } : {}),
      ...(trainingMonth ? { trainingMonth: Number(trainingMonth) } : {}),
      hasPhysicalLimitation: hasLimitation,
      ...(hasLimitation && limitationDetails.trim() ? { limitationDetails: limitationDetails.trim() } : {}),
      ...(description.trim() ? { description: description.trim() } : {}),
    };
    setBusy(true);
    try {
      const res = await generateAiExercisePlan(api, req);
      if (!res.ok) {
        setRejection(res.message);
        return;
      }
      // سرور برنامه‌ی قبلیِ فعال رو غیرفعال کرده — محلی هم همین رو فورا نشون بده
      await fitnessDb.transaction("rw", fitnessDb.plans, async () => {
        await fitnessDb.plans.filter((p) => p.isActive && p.id !== res.plan.id && p.dirty !== 1).modify({ isActive: false });
      });
      await applyRemotePlan(res.plan, { force: true });
      void tapHaptic();
      navigate(fitnessRoutePaths.hub, { replace: true });
    } catch (err) {
      setError(describeAiError(err, online));
    } finally {
      setBusy(false);
    }
  }

  const locked = loggedIn && isModuleLocked("EXERCISE");

  return (
    <div>
      <AppHeader title="برنامه با هوش مصنوعی" showBack />
      <div className="flex flex-col gap-5 px-4 pb-8 pt-4">
        {locked && (
          <p className="font-vazir text-[13px]" style={{ color: "var(--pnl-loss)" }}>
            این قابلیت در پلنِ فعلیت فعال نیست
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="قد (سانتی‌متر)">
            <NumInput value={heightCm} onChange={(v) => setHeightCm(toEnglishDigits(v))} />
          </Field>
          <Field label="وزن (کیلوگرم)">
            <NumInput value={weightKg} onChange={(v) => setWeightKg(toEnglishDigits(v))} />
          </Field>
        </div>

        <Field label="هدفِ تمرینت چیه؟">
          <textarea
            rows={3}
            value={goal}
            maxLength={300}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="مثلا «می‌خوام حجمِ عضلاتِ بالاتنه‌م زیاد بشه» یا «می‌خوام چربی کم کنم»"
            className="w-full rounded-xl p-3 font-vazir text-[13.5px]"
            style={textareaStyle}
          />
        </Field>

        <Field label="چندمین ماهته که تمرین می‌کنی؟ (اختیاری)">
          <NumInput value={trainingMonth} onChange={(v) => setTrainingMonth(toEnglishDigits(v))} />
        </Field>

        <Field label="کجا تمرین می‌کنی؟">
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT_OPTIONS.map((eq) => (
              <Chip key={eq} label={eq} active={equipment === eq} onClick={() => setEquipment(eq)} />
            ))}
          </div>
        </Field>

        <Field label="روزهای تمرین">
          <div className="flex flex-wrap gap-2">
            {ALL_DAYS.map((d) => (
              <Chip
                key={d}
                label={d}
                active={gymDays.includes(d)}
                onClick={() => setGymDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))}
              />
            ))}
          </div>
        </Field>

        <Field label="سطح">
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((l) => (
              <Chip key={l} label={LEVEL_LABELS[l]} active={level === l} onClick={() => setLevel(l)} />
            ))}
          </div>
        </Field>

        <Field label="دوست داری برنامه‌ات چطوری باشه؟ (اختیاری)">
          <textarea
            rows={3}
            value={description}
            maxLength={500}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="مثلا بیشتر روی بالاتنه، فقط با وزنِ بدن، یا حرکاتِ کم‌صدا…"
            className="w-full rounded-xl p-3 font-vazir text-[13.5px]"
            style={textareaStyle}
          />
        </Field>

        <button
          type="button"
          onClick={() => setHasLimitation((v) => !v)}
          className="flex items-center justify-between rounded-xl p-3"
          style={{ minHeight: 48, background: "var(--surface-1)", border: "1px solid var(--surface-line)" }}
        >
          <span className="font-vazir text-[13px]" style={{ color: "var(--text)" }}>
            محدودیتِ جسمی دارم
          </span>
          <span
            className="rounded-md"
            style={{ width: 22, height: 22, background: hasLimitation ? "var(--accent)" : "transparent", border: "1px solid var(--surface-line)" }}
          />
        </button>
        {hasLimitation && (
          <textarea
            rows={3}
            value={limitationDetails}
            maxLength={500}
            onChange={(e) => setLimitationDetails(e.target.value)}
            placeholder="محدودیتت رو توضیح بده — مثلا کمردرد یا مشکلِ زانو"
            className="w-full rounded-xl p-3 font-vazir text-[13.5px]"
            style={textareaStyle}
          />
        )}

        <RulesCheckbox checked={rulesAccepted} onChange={setRulesAccepted} />

        {rejection && (
          <p className="rounded-xl border p-3 font-vazir text-[13px] leading-6" style={{ borderColor: "var(--surface-line)", color: "var(--text)" }}>
            {rejection}
          </p>
        )}
        {error && (
          <p role="alert" className="font-vazir text-[13px] leading-6" style={{ color: "var(--pnl-loss)" }}>
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy || locked}
          className="rounded-xl font-vazir text-[14.5px] font-semibold"
          style={{ minHeight: 50, background: "var(--accent)", color: "#fff", opacity: busy || locked ? 0.6 : 1 }}
        >
          {busy ? "در حالِ ساخت… (تا یک دقیقه)" : "ساختِ برنامه"}
        </button>
      </div>
    </div>
  );
}
