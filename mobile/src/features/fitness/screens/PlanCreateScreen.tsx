import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { tapHaptic } from "@/lib/haptics";
import { SegmentedTabs, Card } from "../components/ui";
import { GOAL_LABELS, LEVEL_LABELS, type ExerciseGoal, type ExerciseLevel, type ExerciseDay } from "../lib/exercisePlans";
import { createTemplatePlan, createManualPlan } from "../lib/repo";
import { fitnessRoutePaths } from "../routes";

const ALL_DAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
const GOALS = Object.keys(GOAL_LABELS) as ExerciseGoal[];
const LEVELS = Object.keys(LEVEL_LABELS) as ExerciseLevel[];

type Mode = "template" | "manual";

export default function PlanCreateScreen() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("template");

  return (
    <div>
      <AppHeader title="برنامه‌ی جدید" showBack />
      <div className="px-4 pt-3">
        <SegmentedTabs
          value={mode}
          onChange={setMode}
          options={[
            { value: "template", label: "قالبِ آماده" },
            { value: "manual", label: "دستی" },
          ]}
        />
      </div>
      {mode === "template" ? (
        <TemplateForm onDone={() => navigate(fitnessRoutePaths.hub)} />
      ) : (
        <ManualForm onDone={() => navigate(fitnessRoutePaths.hub)} />
      )}
    </div>
  );
}

function TemplateForm({ onDone }: { onDone: () => void }) {
  const [goal, setGoal] = useState<ExerciseGoal>("hypertrophy");
  const [level, setLevel] = useState<ExerciseLevel>("beginner");
  const [gymDays, setGymDays] = useState<string[]>(["شنبه", "دوشنبه", "چهارشنبه"]);
  const [hasLimitation, setHasLimitation] = useState(false);
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [equipment, setEquipment] = useState("");
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

  function toggleDay(d: string) {
    setGymDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  async function submit() {
    setSaving(true);
    try {
      await createTemplatePlan({
        goal,
        level,
        gymDays,
        hasPhysicalLimitation: hasLimitation,
        trainingMonth: null,
        trainingPhase: null,
        equipment: equipment || null,
        heightCm: heightCm ? Number(heightCm) : null,
        weightKg: weightKg ? Number(weightKg) : null,
        rulesAccepted,
      });
      void tapHaptic();
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-24 pt-4">
      <Field label="هدف">
        <div className="flex flex-wrap gap-2">
          {GOALS.map((g) => (
            <Chip key={g} active={goal === g} label={GOAL_LABELS[g]} onClick={() => setGoal(g)} />
          ))}
        </div>
      </Field>

      <Field label="سطح">
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((l) => (
            <Chip key={l} active={level === l} label={LEVEL_LABELS[l]} onClick={() => setLevel(l)} />
          ))}
        </div>
      </Field>

      <Field label="روزهای باشگاه">
        <div className="flex flex-wrap gap-2">
          {ALL_DAYS.map((d) => (
            <Chip key={d} active={gymDays.includes(d)} label={d} onClick={() => toggleDay(d)} />
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="قد (cm)">
          <NumInput value={heightCm} onChange={setHeightCm} />
        </Field>
        <Field label="وزن (kg)">
          <NumInput value={weightKg} onChange={setWeightKg} />
        </Field>
      </div>

      <Field label="تجهیزات (اختیاری)">
        <input
          value={equipment}
          onChange={(e) => setEquipment(e.target.value)}
          placeholder="مثلا: فقط دمبل خونگی"
          className="w-full rounded-xl px-3 font-vazir text-[13.5px]"
          style={{ height: 46, background: "var(--surface-1)", color: "var(--text)", border: "1px solid var(--surface-line)" }}
        />
      </Field>

      <button
        onClick={() => setHasLimitation((v) => !v)}
        className="flex items-center justify-between rounded-xl p-3"
        style={{ minHeight: 48, background: "var(--surface-1)", border: "1px solid var(--surface-line)" }}
      >
        <span className="font-vazir text-[13px]" style={{ color: "var(--text)" }}>
          محدودیتِ جسمی دارم (حرکاتِ پرفشار ملایم‌تر می‌شن)
        </span>
        <span
          className="flex items-center justify-center rounded-md"
          style={{
            width: 22,
            height: 22,
            background: hasLimitation ? "var(--accent)" : "transparent",
            border: "1px solid var(--surface-line)",
          }}
        />
      </button>

      <RulesCheckbox checked={rulesAccepted} onChange={setRulesAccepted} />

      <button
        onClick={submit}
        disabled={saving || gymDays.length === 0 || !rulesAccepted}
        className="rounded-xl font-vazir text-[14.5px] font-semibold"
        style={{
          minHeight: 50,
          background: "var(--accent)",
          color: "#fff",
          opacity: gymDays.length === 0 || !rulesAccepted ? 0.5 : 1,
          // باگِ حل‌شده: این فرم گاهی دقیقا به‌اندازه‌ی ارتفاعِ صفحه‌ست، یعنی
          // موقعِ لودِ اولیه (بدونِ اسکرول) این دکمه زیرِ نوارِ پایینِ ثابت
          // (BottomTabBar, z-40) می‌افته — چون تب‌های اون نوار کلِ ارتفاعش رو
          // کلیک‌پذیر می‌کنن، لمسِ اون بخشِ همپوشان واقعا می‌ره به ناوبریِ تب،
          // نه ثبتِ فرم. sticky با فاصله از نوارِ پایین این رو قطعی حل می‌کنه.
          position: "sticky",
          bottom: "calc(64px + env(safe-area-inset-bottom))",
        }}
      >
        {saving ? "در حال ساخت…" : "ساخت برنامه"}
      </button>
    </div>
  );
}

function ManualForm({ onDone }: { onDone: () => void }) {
  const [goal, setGoal] = useState("");
  const [days, setDays] = useState<ExerciseDay[]>([{ day: "شنبه", focus: "", items: [""] }]);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

  function updateDay(i: number, patch: Partial<ExerciseDay>) {
    setDays((prev) => prev.map((d, di) => (di === i ? { ...d, ...patch } : d)));
  }
  function updateItem(di: number, ii: number, value: string) {
    setDays((prev) =>
      prev.map((d, x) => (x === di ? { ...d, items: d.items.map((it, y) => (y === ii ? value : it)) } : d))
    );
  }
  function addItem(di: number) {
    setDays((prev) => prev.map((d, x) => (x === di ? { ...d, items: [...d.items, ""] } : d)));
  }
  function removeItem(di: number, ii: number) {
    setDays((prev) => prev.map((d, x) => (x === di ? { ...d, items: d.items.filter((_, y) => y !== ii) } : d)));
  }
  function addDay() {
    setDays((prev) => [...prev, { day: "شنبه", focus: "", items: [""] }]);
  }
  function removeDay(i: number) {
    setDays((prev) => prev.filter((_, x) => x !== i));
  }

  async function submit() {
    setSaving(true);
    try {
      const cleaned = days
        .map((d) => ({ ...d, items: d.items.map((it) => it.trim()).filter(Boolean) }))
        .filter((d) => d.items.length > 0);
      if (cleaned.length === 0) return;
      if (!rulesAccepted) return;
      await createManualPlan({ goal: goal || null, gymDays: cleaned.map((d) => d.day), days: cleaned, rulesAccepted });
      void tapHaptic();
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-24 pt-4">
      <Field label="هدف (اختیاری، متنِ آزاد)">
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="مثلا: حجم بگیرم و استقامت هم بالا بره"
          className="w-full rounded-xl px-3 font-vazir text-[13.5px]"
          style={{ height: 46, background: "var(--surface-1)", color: "var(--text)", border: "1px solid var(--surface-line)" }}
        />
      </Field>

      {days.map((d, di) => (
        <Card key={di} className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <select
              value={d.day}
              onChange={(e) => updateDay(di, { day: e.target.value })}
              className="rounded-lg px-2 font-vazir text-[13px]"
              style={{ height: 40, background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--surface-line)" }}
            >
              {ALL_DAYS.map((dn) => (
                <option key={dn} value={dn}>
                  {dn}
                </option>
              ))}
            </select>
            <input
              value={d.focus}
              onChange={(e) => updateDay(di, { focus: e.target.value })}
              placeholder="تمرکز روز (مثلا بالاتنه)"
              className="min-w-0 flex-1 rounded-lg px-2 font-vazir text-[13px]"
              style={{ height: 40, background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--surface-line)" }}
            />
            {days.length > 1 && (
              <button onClick={() => removeDay(di)} aria-label="حذفِ روز" className="flex items-center justify-center" style={{ width: 40, height: 40 }}>
                <Trash2 size={16} color="var(--pnl-loss)" />
              </button>
            )}
          </div>

          {d.items.map((it, ii) => (
            <div key={ii} className="flex items-center gap-2">
              <input
                value={it}
                onChange={(e) => updateItem(di, ii, e.target.value)}
                placeholder="مثلا: اسکوات هالتر ۴×۸"
                className="min-w-0 flex-1 rounded-lg px-2 font-vazir text-[13px]"
                style={{ height: 40, background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--surface-line)" }}
              />
              {d.items.length > 1 && (
                <button onClick={() => removeItem(di, ii)} aria-label="حذفِ حرکت" className="flex items-center justify-center" style={{ width: 36, height: 36 }}>
                  <Trash2 size={14} color="var(--muted)" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => addItem(di)}
            className="flex items-center justify-center gap-1 rounded-lg font-vazir text-[12.5px]"
            style={{ minHeight: 40, background: "var(--surface-2)", color: "var(--accent)" }}
          >
            <Plus size={14} /> حرکت
          </button>
        </Card>
      ))}

      <button
        onClick={addDay}
        className="flex items-center justify-center gap-1 rounded-xl font-vazir text-[13px] font-medium"
        style={{ minHeight: 46, background: "var(--surface-2)", color: "var(--text)" }}
      >
        <Plus size={15} /> افزودنِ روز
      </button>

      <RulesCheckbox checked={rulesAccepted} onChange={setRulesAccepted} />

      <button
        onClick={submit}
        disabled={saving || !rulesAccepted}
        className="rounded-xl font-vazir text-[14.5px] font-semibold"
        style={{
          minHeight: 50,
          background: "var(--accent)",
          color: "#fff",
          opacity: rulesAccepted ? 1 : 0.5,
          // همون باگِ TemplateForm (بالاتر) — نگاه کن به توضیحش.
          position: "sticky",
          bottom: "calc(64px + env(safe-area-inset-bottom))",
        }}
      >
        {saving ? "در حال ساخت…" : "ذخیره‌ی برنامه"}
      </button>
    </div>
  );
}

/**
 * پذیرشِ قوانین/سلبِ مسئولیت — همون شرطِ وب (rulesAccepted) برای ساختِ برنامه.
 * سرور برنامه‌ی دستیِ جدید رو بدونِ این قبول نمی‌کنه، پس سینک هم بهش نیاز داره.
 */
export function RulesCheckbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-3 rounded-xl p-3 text-start"
      style={{ minHeight: 48, background: "var(--surface-1)", border: "1px solid var(--surface-line)" }}
    >
      <span className="font-vazir text-[12.5px] leading-6" style={{ color: "var(--text)" }}>
        قوانین و سلبِ مسئولیتِ برنامه‌ی ورزشی رو خوندم و می‌پذیرم — در صورتِ بیماری یا آسیب، قبل از شروع با پزشک/مربی مشورت می‌کنم.
      </span>
      <span
        className="flex shrink-0 items-center justify-center rounded-md"
        style={{
          width: 22,
          height: 22,
          background: checked ? "var(--accent)" : "transparent",
          border: "1px solid var(--surface-line)",
        }}
      />
    </button>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-vazir text-[12.5px] font-medium" style={{ color: "var(--muted)" }}>
        {label}
      </span>
      {children}
    </div>
  );
}

export function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-3 font-vazir text-[12.5px] font-medium"
      style={{
        minHeight: 40,
        background: active ? "var(--accent)" : "var(--surface-1)",
        color: active ? "#fff" : "var(--text)",
        border: `1px solid ${active ? "var(--accent)" : "var(--surface-line)"}`,
      }}
    >
      {label}
    </button>
  );
}

export function NumInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
      className="w-full rounded-xl px-3 font-vazir text-[13.5px]"
      style={{ height: 46, background: "var(--surface-1)", color: "var(--text)", border: "1px solid var(--surface-line)" }}
    />
  );
}
