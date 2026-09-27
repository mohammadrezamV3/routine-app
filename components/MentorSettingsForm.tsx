"use client";

import { useState } from "react";
import { CalendarDays, Check, Inbox, MessageCircle, Plus, Trash2, UserPlus } from "lucide-react";
import { ToggleSwitch } from "./ToggleSwitch";
import { SegmentedTabs } from "./SegmentedTabs";
import { JalaliDatePicker } from "./JalaliDatePicker";
import { Spinner } from "./Spinner";
import { fa, mentorApi } from "./MentorDashKit";
import { MI, MI_STROKE, MentorField, MentorSection } from "./MentorUI";
import { formatJalali, jalaliToIso, toJalali, type JalaliDate } from "@/lib/jalali";
import {
  AWAY_MESSAGE_MAX,
  CAPACITY_MAX,
  INTAKE_ANSWER_MAX,
  INTAKE_MAX_QUESTIONS,
  INTAKE_QUESTION_MAX,
  RESPONSE_TIME_OPTIONS,
  WELCOME_MAX,
} from "@/lib/mentorAvailability";
import type { MentorSettingsResponse } from "@/lib/mentorTypes";

const ic = (Icon: typeof Inbox, size: number) => <Icon size={size} strokeWidth={MI_STROKE} aria-hidden />;

type RT = "0" | `${(typeof RESPONSE_TIME_OPTIONS)[number]}`;
const RT_OPTIONS: { value: RT; label: string }[] = [
  { value: "0", label: "اعلام نشده" },
  ...RESPONSE_TIME_OPTIONS.map((h) => ({ value: String(h) as RT, label: `${fa(h)} ساعت` })),
];

function isoToJalali(iso: string | null | undefined): JalaliDate | null {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  return m ? toJalali(+m[1], +m[2], +m[3]) : null;
}

function toEnDigits(v: string): string {
  return v.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

/**
 * تنظیماتِ پذیرش و دسترس‌پذیریِ منتور — PUT /api/mentor/settings.
 * همه‌ی بخش‌ها با یک «ذخیره» ثبت می‌شوند؛ سرور همان سقف‌ها را دوباره می‌سنجد.
 */
export function MentorSettingsForm({ initial, onSaved }: { initial: MentorSettingsResponse; onSaved: (d: MentorSettingsResponse) => void }) {
  const s0 = initial.settings;
  const [accepting, setAccepting] = useState(s0.acceptingStudents);
  const [capacity, setCapacity] = useState(s0.maxActiveStudents != null ? fa(s0.maxActiveStudents) : "");
  const [away, setAway] = useState(!!s0.awayUntil);
  const [awayDate, setAwayDate] = useState<JalaliDate | null>(isoToJalali(s0.awayUntil));
  const [awayMessage, setAwayMessage] = useState(s0.awayMessage ?? "");
  const [pauseRequests, setPauseRequests] = useState(s0.awayPausesRequests);
  const [responseTime, setResponseTime] = useState<RT>((s0.responseTimeHours ? String(s0.responseTimeHours) : "0") as RT);
  const [welcome, setWelcome] = useState(s0.welcomeMessage ?? "");
  const [questions, setQuestions] = useState<string[]>(s0.intakeQuestions.length ? s0.intakeQuestions : []);
  const [picker, setPicker] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<{ capacity?: string; awayDate?: string; awayMessage?: string; welcome?: string; questions?: string }>({});

  function touched() { setSaved(false); setError(null); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const errs: typeof fieldErr = {};
    const capText = toEnDigits(capacity).trim();
    const cap = capText ? Number(capText) : null;
    if (cap !== null && (!Number.isInteger(cap) || cap < 1 || cap > CAPACITY_MAX)) errs.capacity = `عددی بین ۱ تا ${fa(CAPACITY_MAX)} بنویس`;
    const awayIso = away && awayDate ? jalaliToIso(...awayDate) : null;
    if (away && !awayIso) errs.awayDate = "تاریخ بازگشت را انتخاب کن";
    if (awayMessage.trim().length > AWAY_MESSAGE_MAX) errs.awayMessage = `حداکثر ${fa(AWAY_MESSAGE_MAX)} نویسه`;
    if (welcome.trim().length > WELCOME_MAX) errs.welcome = `حداکثر ${fa(WELCOME_MAX)} نویسه`;
    const qs = questions.map((q) => q.replace(/\s+/g, " ").trim()).filter(Boolean);
    if (qs.some((q) => q.length > INTAKE_QUESTION_MAX)) errs.questions = `هر سؤال حداکثر ${fa(INTAKE_QUESTION_MAX)} نویسه است`;
    setFieldErr(errs);
    if (Object.keys(errs).length) { setError("چند مورد نیاز به اصلاح دارد"); return; }

    setSaving(true);
    setError(null);
    const r = await mentorApi<MentorSettingsResponse>("/api/mentor/settings", {
      method: "PUT",
      body: {
        acceptingStudents: accepting,
        maxActiveStudents: cap,
        awayUntil: awayIso,
        ...(awayIso ? { awayMessage: awayMessage.trim() || null } : {}),
        awayPausesRequests: pauseRequests,
        responseTimeHours: responseTime === "0" ? null : Number(responseTime),
        welcomeMessage: welcome.trim() || null,
        intakeQuestions: qs,
      },
    });
    setSaving(false);
    if (!r.ok) { setError(r.error); return; }
    setQuestions(r.data.settings.intakeQuestions);
    setSaved(true);
    setTimeout(() => setSaved(false), 2400);
    onSaved(r.data);
  }

  const full = initial.settings.maxActiveStudents != null && initial.activeStudents >= initial.settings.maxActiveStudents;

  return (
    <form onSubmit={save} noValidate>
      <MentorSection title="پذیرش شاگرد" icon={ic(UserPlus, MI.section)}>
        <div className="mentor-toggle-row">
          <div className="mentor-toggle-text">
            <div className="mentor-toggle-title">پذیرش شاگرد جدید</div>
            <div className="mentor-toggle-desc">با خاموش کردن، شاگرد جدید درخواست نمی‌دهد؛ شاگردهای فعلی و دعوت‌های تو می‌مانند</div>
          </div>
          <ToggleSwitch checked={accepting} label="پذیرش شاگرد جدید" onChange={(v) => { setAccepting(v); touched(); }} />
        </div>
        <div className="mentor-form" style={{ paddingTop: "var(--m-3)" }}>
          <MentorField
            label="سقف شاگرد فعال" htmlFor="ms-capacity" optional error={fieldErr.capacity}
            hint={`خالی یعنی بدون سقف؛ الان ${fa(initial.activeStudents)} شاگرد فعال داری${full ? " و ظرفیت تکمیل است" : ""}. دعوت‌های خودت از این سقف مستثناست`}
          >
            <input
              id="ms-capacity" type="text" inputMode="numeric" className="wsearch-newform-name trade-glass-field" maxLength={4}
              value={capacity} placeholder="مثلاً ۱۰"
              onChange={(e) => { setCapacity(e.target.value); setFieldErr((x) => ({ ...x, capacity: undefined })); touched(); }}
            />
          </MentorField>
        </div>
      </MentorSection>

      <MentorSection title="عدم حضور" icon={ic(CalendarDays, MI.section)}>
        <div className="mentor-toggle-row">
          <div className="mentor-toggle-text">
            <div className="mentor-toggle-title">در دسترس نیستم</div>
            <div className="mentor-toggle-desc">تاریخ بازگشت و پیامت روی پروفایل و صفحه‌ی رابطه به شاگردها نمایش داده می‌شود</div>
          </div>
          <ToggleSwitch
            checked={away} label="در دسترس نیستم"
            onChange={(v) => { setAway(v); setFieldErr((x) => ({ ...x, awayDate: undefined })); touched(); if (v && !awayDate) setPicker(true); }}
          />
        </div>
        {away && (
          <div className="mentor-form" style={{ paddingTop: "var(--m-3)" }}>
            <MentorField label="تاریخ بازگشت" error={fieldErr.awayDate} hint="از این روز دوباره در دسترس نمایش داده می‌شوی">
              <div className={`wsearch-date-row${fieldErr.awayDate ? " field-error" : ""}`} style={{ marginTop: 0 }}>
                <div className="time-field">
                  <button type="button" className={`jdate-btn${awayDate ? "" : " placeholder"}`} onClick={() => setPicker(true)}>
                    {awayDate ? formatJalali(awayDate) : "روز / ماه / سال"}
                  </button>
                </div>
              </div>
            </MentorField>
            <MentorField
              label="پیام برای شاگردها" htmlFor="ms-away-msg" optional error={fieldErr.awayMessage}
              hint={`${fa(awayMessage.trim().length)} از ${fa(AWAY_MESSAGE_MAX)} نویسه`}
            >
              <textarea
                id="ms-away-msg" className="wsearch-newform-name trade-glass-field" rows={2} maxLength={AWAY_MESSAGE_MAX + 20}
                value={awayMessage} placeholder="مثلاً «در سفرم؛ پیام‌ها را پس از بازگشت جواب می‌دهم»"
                onChange={(e) => { setAwayMessage(e.target.value); setFieldErr((x) => ({ ...x, awayMessage: undefined })); touched(); }}
              />
            </MentorField>
            <div className="mentor-toggle-row" style={{ paddingTop: 0 }}>
              <div className="mentor-toggle-text">
                <div className="mentor-toggle-title">توقف درخواست‌های تازه</div>
                <div className="mentor-toggle-desc">تا روز بازگشت، شاگرد جدید درخواست نمی‌دهد</div>
              </div>
              <ToggleSwitch checked={pauseRequests} label="توقف درخواست‌های تازه" onChange={(v) => { setPauseRequests(v); touched(); }} />
            </div>
          </div>
        )}
      </MentorSection>

      <MentorSection title="پاسخ‌گویی" icon={ic(MessageCircle, MI.section)}>
        <div className="mentor-form">
          <MentorField label="زمان معمول پاسخ" hint="روی پروفایلت به‌صورت «معمولاً تا … ساعت پاسخ می‌دهد» نمایش داده می‌شود">
            <SegmentedTabs options={RT_OPTIONS} active={responseTime} onChange={(v) => { setResponseTime(v); touched(); }} />
          </MentorField>
          <MentorField
            label="پیام خوش‌آمد" htmlFor="ms-welcome" optional error={fieldErr.welcome}
            hint="با شروع هر رابطه در اعلان پذیرش به شاگرد می‌رسد و دو هفته بالای صفحه‌ی رابطه می‌ماند"
          >
            <textarea
              id="ms-welcome" className="wsearch-newform-name trade-glass-field" rows={3} maxLength={WELCOME_MAX + 50}
              value={welcome} placeholder="مثلاً «خوش آمدی؛ اول برنامه‌ی هفتگی فعلی‌ات را در بخش دسترسی‌ها با من به اشتراک بگذار»"
              onChange={(e) => { setWelcome(e.target.value); setFieldErr((x) => ({ ...x, welcome: undefined })); touched(); }}
            />
          </MentorField>
        </div>
      </MentorSection>

      <MentorSection
        title="سؤال‌های پذیرش" icon={ic(Inbox, MI.section)} count={questions.length ? fa(questions.length) : undefined}
        desc={`شاگرد هنگام درخواست به این سؤال‌ها جواب می‌دهد؛ هر جواب حداکثر ${fa(INTAKE_ANSWER_MAX)} نویسه`}
      >
        <div className="mentor-form" style={{ gap: "var(--m-2)" }}>
          {questions.map((q, i) => (
            <div key={i} className="mentor-intake-edit">
              <input
                type="text" className="wsearch-newform-name trade-glass-field" maxLength={INTAKE_QUESTION_MAX + 20}
                aria-label={`سؤال ${fa(i + 1)}`} value={q}
                placeholder={i === 0 ? "مثلاً هدفت از این همکاری چیست؟" : "مثلاً چند ساعت در هفته وقت داری؟"}
                onChange={(e) => { const v = e.target.value; setQuestions((xs) => xs.map((x, j) => (j === i ? v : x))); setFieldErr((x) => ({ ...x, questions: undefined })); touched(); }}
              />
              <button
                type="button" className="trade-icon-btn" aria-label={`حذف سؤال ${fa(i + 1)}`}
                onClick={() => { setQuestions((xs) => xs.filter((_, j) => j !== i)); touched(); }}
              >
                {ic(Trash2, MI.btnSm)}
              </button>
            </div>
          ))}
          {fieldErr.questions && <p className="mentor-field-error" role="alert">{fieldErr.questions}</p>}
          {questions.length < INTAKE_MAX_QUESTIONS && (
            <div>
              <button type="button" className="mentor-text-btn" onClick={() => { setQuestions((xs) => [...xs, ""]); touched(); }}>
                {ic(Plus, MI.btnSm)} افزودن سؤال
              </button>
            </div>
          )}
        </div>
      </MentorSection>

      {error && <div className="form-inline-error" role="alert">{error}</div>}
      <div className="mentor-form-actions" style={{ marginTop: error ? undefined : 0, marginBottom: "var(--m-4)" }}>
        <button type="submit" className="trade-primary-btn mentor-btn" disabled={saving}>
          {saving ? <Spinner size={14} /> : saved ? <>{ic(Check, MI.btn)} ذخیره شد</> : "ذخیره تغییرات"}
        </button>
      </div>

      {picker && (
        <JalaliDatePicker
          initial={awayDate}
          title="تاریخ بازگشت"
          disablePast
          onClose={() => { setPicker(false); if (!awayDate) setAway(false); }}
          onPick={(v) => { setAwayDate(v); setPicker(false); setFieldErr((x) => ({ ...x, awayDate: undefined })); touched(); }}
        />
      )}
    </form>
  );
}
