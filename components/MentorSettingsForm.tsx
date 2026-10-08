"use client";

import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { SegmentedTabs } from "./SegmentedTabs";
import { Spinner } from "./Spinner";
import { fa, mentorApi } from "./MentorDashKit";
import { MI, MI_STROKE, MentorField } from "./MentorUI";
import {
  CAPACITY_MAX,
  INTAKE_ANSWER_MAX,
  INTAKE_MAX_QUESTIONS,
  INTAKE_QUESTION_MAX,
  RESPONSE_TIME_OPTIONS,
  WELCOME_MAX,
} from "@/lib/mentorAvailability";
import type { MentorSettingsResponse } from "@/lib/mentorTypes";

type RT = "0" | `${(typeof RESPONSE_TIME_OPTIONS)[number]}`;
const RT_OPTIONS: { value: RT; label: string }[] = [
  { value: "0", label: "اعلام نشده" },
  ...RESPONSE_TIME_OPTIONS.map((h) => ({ value: String(h) as RT, label: `${fa(h)} ساعت` })),
];

function toEnDigits(v: string): string {
  return v.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

export type MentorSettingsSection = "capacity" | "response" | "intake";

/**
 * بدنه‌ی برگه‌های تنظیمات پذیرش: هر برگه فقط فیلدهای همون موضوع رو داره و دکمه‌ی ذخیره‌ی خودش.
 * PUT /api/mentor/settings جزئیه (فقط فیلدهای فرستاده‌شده عوض می‌شن)، پس بقیه‌ی تنظیمات دست نمی‌خورن.
 * پذیرش باز/بسته و عدم حضور در MentorAvailabilityQuick هستن.
 */
export function MentorSettingsForm({
  initial, section, onSaved, onDone,
}: {
  initial: MentorSettingsResponse;
  section: MentorSettingsSection;
  onSaved: (d: MentorSettingsResponse) => void;
  onDone?: () => void;
}) {
  const s0 = initial.settings;
  const [capacity, setCapacity] = useState(s0.maxActiveStudents != null ? String(s0.maxActiveStudents) : "");
  const [responseTime, setResponseTime] = useState<RT>((s0.responseTimeHours ? String(s0.responseTimeHours) : "0") as RT);
  const [welcome, setWelcome] = useState(s0.welcomeMessage ?? "");
  const [questions, setQuestions] = useState<string[]>(s0.intakeQuestions.length ? s0.intakeQuestions : []);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<{ capacity?: string; welcome?: string; questions?: string }>({});

  function touched() { setSaved(false); setError(null); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const errs: typeof fieldErr = {};
    let body: Record<string, unknown> = {};
    if (section === "capacity") {
      const capText = toEnDigits(capacity).trim();
      const cap = capText ? Number(capText) : null;
      if (cap !== null && (!Number.isInteger(cap) || cap < 1 || cap > CAPACITY_MAX)) errs.capacity = `عددی بین 1 تا ${fa(CAPACITY_MAX)} بنویس`;
      body = { maxActiveStudents: cap };
    } else if (section === "response") {
      if (welcome.trim().length > WELCOME_MAX) errs.welcome = `حداکثر ${fa(WELCOME_MAX)} حرف`;
      body = { responseTimeHours: responseTime === "0" ? null : Number(responseTime), welcomeMessage: welcome.trim() || null };
    } else {
      const qs = questions.map((q) => q.replace(/\s+/g, " ").trim()).filter(Boolean);
      if (qs.some((q) => q.length > INTAKE_QUESTION_MAX)) errs.questions = `هر سوال حداکثر ${fa(INTAKE_QUESTION_MAX)} حرف است`;
      body = { intakeQuestions: qs };
    }
    setFieldErr(errs);
    if (Object.keys(errs).length) { setError("چند مورد نیاز به اصلاح داره"); return; }

    setSaving(true);
    setError(null);
    const r = await mentorApi<MentorSettingsResponse>("/api/mentor/settings", { method: "PUT", body });
    setSaving(false);
    if (!r.ok) { setError(r.error); return; }
    if (section === "intake") setQuestions(r.data.settings.intakeQuestions);
    setSaved(true);
    onSaved(r.data);
    onDone?.();
  }

  const full = s0.maxActiveStudents != null && initial.activeStudents >= s0.maxActiveStudents;

  return (
    <form onSubmit={save} noValidate className="mentor-form mv2-set-form">
      {section === "capacity" && (
        <MentorField
          label="سقف شاگرد فعال" htmlFor="ms-capacity" optional error={fieldErr.capacity}
          hint={`خالی یعنی بدون سقف. الان ${fa(initial.activeStudents)} شاگرد فعال داری${full ? " و ظرفیت پره" : ""}. دعوت‌های خودت شمرده نمی‌شن`}
        >
          <input
            id="ms-capacity" type="text" inputMode="numeric" className="wsearch-newform-name trade-glass-field" maxLength={4}
            value={capacity} placeholder="مثلا 10"
            onChange={(e) => { setCapacity(e.target.value); setFieldErr((x) => ({ ...x, capacity: undefined })); touched(); }}
          />
        </MentorField>
      )}

      {section === "response" && (
        <>
          <MentorField label="زمان معمول جواب" hint={responseTime === "0" ? "روی پروفایلت زمان جواب نشون داده نمی‌شه" : `روی پروفایلت می‌نویسه «معمولا تا ${fa(Number(responseTime))} ساعت جواب می‌ده»`}>
            <SegmentedTabs options={RT_OPTIONS} active={responseTime} onChange={(v) => { setResponseTime(v); touched(); }} />
          </MentorField>
          <MentorField
            label="پیام خوش‌آمد" htmlFor="ms-welcome" optional error={fieldErr.welcome}
            hint={`${fa(welcome.length)} از ${fa(WELCOME_MAX)} حرف`}
          >
            <textarea
              id="ms-welcome" className="wsearch-newform-name trade-glass-field" rows={4} maxLength={WELCOME_MAX + 50}
              value={welcome} placeholder="مثلا «خوش اومدی، اول برنامه‌ی هفتگی فعلی‌ت رو با من به اشتراک بذار»"
              onChange={(e) => { setWelcome(e.target.value); setFieldErr((x) => ({ ...x, welcome: undefined })); touched(); }}
            />
          </MentorField>
        </>
      )}

      {section === "intake" && (
        <MentorField
          label="سوال‌هایی که شاگرد هنگام درخواست جواب می‌ده"
          hint={`تا ${fa(INTAKE_MAX_QUESTIONS)} سوال؛ هر جواب حداکثر ${fa(INTAKE_ANSWER_MAX)} حرف`}
          error={fieldErr.questions}
        >
          <div className="mv2-set-questions">
            {questions.map((q, i) => (
              <div key={i} className="mentor-intake-edit">
                <input
                  type="text" className="wsearch-newform-name trade-glass-field" maxLength={INTAKE_QUESTION_MAX + 20}
                  aria-label={`سوال ${fa(i + 1)}`} value={q}
                  placeholder={i === 0 ? "مثلا هدفت از این همکاری چیه؟" : "مثلا چند ساعت در هفته وقت داری؟"}
                  onChange={(e) => { const v = e.target.value; setQuestions((xs) => xs.map((x, j) => (j === i ? v : x))); setFieldErr((x) => ({ ...x, questions: undefined })); touched(); }}
                />
                <button
                  type="button" className="trade-icon-btn mv2-set-iconbtn" aria-label={`حذف سوال ${fa(i + 1)}`}
                  onClick={() => { setQuestions((xs) => xs.filter((_, j) => j !== i)); touched(); }}
                >
                  <Trash2 size={MI.btnSm} strokeWidth={MI_STROKE} aria-hidden />
                </button>
              </div>
            ))}
            {questions.length === 0 && <p className="mentor-field-hint">هنوز سوالی نذاشتی</p>}
            {questions.length < INTAKE_MAX_QUESTIONS && (
              <div>
                <button type="button" className="mentor-text-btn mv2-set-textbtn" onClick={() => { setQuestions((xs) => [...xs, ""]); touched(); }}>
                  <Plus size={MI.btnSm} strokeWidth={MI_STROKE} aria-hidden /> افزودن سوال
                </button>
              </div>
            )}
          </div>
        </MentorField>
      )}

      {error && <div className="form-inline-error" role="alert" style={{ margin: 0 }}>{error}</div>}
      <div className="mentor-form-actions" style={{ marginTop: 0 }}>
        <button type="submit" className="trade-primary-btn mentor-btn" disabled={saving}>
          {saving ? <Spinner size={14} /> : saved ? <><Check size={MI.btn} strokeWidth={MI_STROKE} aria-hidden /> ذخیره شد</> : "ذخیره"}
        </button>
      </div>
    </form>
  );
}
