"use client";

import "./coach.css";
import "./coach-discover.css";
import { useState } from "react";
import { CoachSheet, CoachSheetActions, CoachSheetBody } from "./CoachSheet";
import { TickOption } from "./TickOption";
import { Spinner } from "./Spinner";
import { useSection } from "./SectionProvider";
import { MentorTermsAcceptance, isMentorTermsError, mentorTermsPayload, useMentorTermsStatus } from "./MentorTermsAcceptance";
import { categoryLabel } from "./MentorBadges";
import { SECTION_META } from "@/lib/sections";
import { INTAKE_ANSWER_MAX } from "@/lib/mentorAvailability";
import { networkError, readApiError } from "@/lib/mentorFormat";
import { faNum } from "@/lib/jalali";
import type { MyMentorship } from "@/lib/mentorTypes";
import { tr, iso } from "@/lib/i18n";

const MESSAGE_MAX = 500;

/**
 * شیت درخواست همکاری با مربی (POST /api/mentorships): انتخاب حوزه (فقط اگه مربی
 * بیش از یک حوزه در همین بخش داره)، جواب سوال‌های اول کار، پیام اختیاری و پذیرش
 * شرایط (فقط اگه هنوز نپذیرفته). دکمه‌ی اصلی آخر ردیف.
 */
export function CoachRequestSheet({
  open, mentorId, mentorName, mentorCategories, intakeQuestions, onClose, onDone, onStale,
}: {
  open: boolean;
  mentorId: string;
  mentorName: string;
  mentorCategories: string[];
  intakeQuestions: string[];
  onClose: () => void;
  onDone: (m: MyMentorship) => void;
  onStale: () => void;
}) {
  const section = useSection();
  // حوزه‌های قابل‌انتخاب = حوزه‌های مربی در همین بخش (وگرنه همه‌ی حوزه‌هاش)
  const choices = (() => {
    const inSection = section ? mentorCategories.filter((c) => SECTION_META[section].mentorCategories.includes(c)) : [];
    return inSection.length ? inSection : mentorCategories;
  })();
  const [cats, setCats] = useState<string[]>(choices);
  const [catsError, setCatsError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [answers, setAnswers] = useState<string[]>(() => intakeQuestions.map(() => ""));
  const [answerErrs, setAnswerErrs] = useState<(string | null)[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const terms = useMentorTermsStatus();
  const [forceTerms, setForceTerms] = useState(false);
  const needTerms = forceTerms || (!terms.loading && !terms.studentAccepted);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  const len = message.trim().length;
  const tooLong = len > MESSAGE_MAX;

  async function submit() {
    if (choices.length > 1 && cats.length === 0) { setCatsError(tr("حداقل یک حوزه انتخاب کن", "Choose at least one area")); return; }
    if (needTerms && !termsAccepted) { setTermsError(tr("برای ارسال درخواست، شرایط را بپذیر", "Accept the terms to send your request")); return; }
    if (tooLong) return;
    const aErrs = intakeQuestions.map((_, i) => {
      const a = (answers[i] ?? "").trim();
      if (!a) return tr("جواب این سوال را بنویس", "Answer this question");
      if (a.length > INTAKE_ANSWER_MAX) return tr(`حداکثر ${faNum(INTAKE_ANSWER_MAX)} حرف`, `Up to ${faNum(INTAKE_ANSWER_MAX)} characters`);
      return null;
    });
    setAnswerErrs(aErrs);
    if (aErrs.some(Boolean)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/mentorships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mentorId,
          message: message.trim() || undefined,
          ...(mentorCategories.length ? { categories: choices.length > 1 ? cats : choices } : {}),
          ...(intakeQuestions.length ? { intakeAnswers: answers.map((a) => a.trim()) } : {}),
          ...mentorTermsPayload(needTerms && termsAccepted),
        }),
      });
      if (res.status === 400) {
        const j = await res.json().catch(() => null);
        if (isMentorTermsError(j)) { setForceTerms(true); setTermsAccepted(false); setTermsError(j.error); terms.refresh(); return; }
        setError(typeof j?.error === "string" ? j.error : tr("درخواست ارسال نشد؛ دوباره تلاش کن", "Couldn't send the request. Try again"));
        return;
      }
      if (res.status === 409) {
        setError(await readApiError(res, tr("با این مربی درخواست باز یا همکاری فعال داری", "You already have an open request or an active mentorship with this mentor")));
        onStale();
        return;
      }
      if (!res.ok) { setError(await readApiError(res, tr("درخواست ارسال نشد؛ دوباره تلاش کن", "Couldn't send the request. Try again"))); return; }
      const d = await res.json().catch(() => null);
      const m = d?.mentorship;
      if (m?.id) onDone({ id: m.id, status: m.status ?? "PENDING", initiatedBy: m.initiatedBy ?? "STUDENT" });
      else { onClose(); onStale(); }
    } catch {
      setError(networkError());
    } finally {
      setBusy(false);
    }
  }

  return (
    <CoachSheet open={open} onClose={onClose} title={tr(`شروع با ${mentorName}`, `Start with ${iso(mentorName)}`)} dismissible={!busy}>
      <CoachSheetBody>
        {choices.length > 1 && (
          <div className="chpf-field" role="group" aria-label={tr("حوزه‌ی همکاری", "Area of work")}>
            <span className="chpf-label">{tr("می‌خوای در چه زمینه‌ای کمکت کنه؟", "What should they help you with?")}</span>
            {choices.map((c) => (
              <TickOption
                key={c}
                checked={cats.includes(c)}
                onChange={() => { setCats((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c])); setCatsError(null); }}
              >
                {categoryLabel(c)}
              </TickOption>
            ))}
            {catsError && <span className="chpf-field-error" role="alert">{catsError}</span>}
          </div>
        )}
        {intakeQuestions.map((q, i) => (
          <div key={i} className="chpf-field">
            <label htmlFor={`chpf-q${i}`}>{q}</label>
            <textarea
              id={`chpf-q${i}`} className="trade-glass-field" rows={2} value={answers[i] ?? ""} maxLength={INTAKE_ANSWER_MAX + 20}
              onChange={(e) => {
                const v = e.target.value;
                setAnswers((xs) => xs.map((x, j) => (j === i ? v : x)));
                setAnswerErrs((xs) => xs.map((x, j) => (j === i ? null : x)));
                setError(null);
              }}
            />
            {answerErrs[i] && <span className="chpf-field-error" role="alert">{answerErrs[i]}</span>}
          </div>
        ))}
        <div className="chpf-field">
          <label htmlFor="chpf-msg">{tr("پیام", "Message")} <span className="chpf-count">{tr("(اختیاری)", "(optional)")}</span></label>
          <textarea
            id="chpf-msg" className="trade-glass-field" rows={4} value={message} maxLength={MESSAGE_MAX + 50}
            onChange={(e) => { setMessage(e.target.value); setError(null); }}
            placeholder={tr("مثلا «می‌خوام هفته‌ای 4 جلسه تمرین کنم»", "For example: \"I want to train 4 times a week\"")}
            aria-invalid={tooLong}
          />
          <span className="chpf-count">{faNum(len)} / {faNum(MESSAGE_MAX)}</span>
          {tooLong && <span className="chpf-field-error" role="alert">{tr(`پیام حداکثر ${faNum(MESSAGE_MAX)} حرف است`, `Messages can be up to ${faNum(MESSAGE_MAX)} characters`)}</span>}
        </div>
        {needTerms && (
          <MentorTermsAcceptance
            role="student" checked={termsAccepted} error={termsError} disabled={busy}
            onChange={(v) => { setTermsAccepted(v); setTermsError(null); }}
          />
        )}
        {error && <p className="chpf-error" role="alert">{error}</p>}
      </CoachSheetBody>
      <CoachSheetActions>
        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>{tr("انصراف", "Cancel")}</button>
        <button type="button" className={`btn btn-primary${busy ? " is-loading" : ""}`} onClick={submit} disabled={busy || tooLong || terms.loading}>
          {busy ? <Spinner size={16} /> : tr("ارسال درخواست", "Send request")}
        </button>
      </CoachSheetActions>
    </CoachSheet>
  );
}
