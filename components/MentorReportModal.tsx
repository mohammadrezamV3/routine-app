"use client";

import "./mentor.css";
import { TickButton } from "./TickButton";
import { useEffect, useMemo, useState } from "react";
import type { ReportTargetType } from "@/lib/mentorTypes";
import { networkError, fmtDateTime, readApiError } from "@/lib/mentorFormat";
import { tr } from "@/lib/i18n";
import { faNum } from "@/lib/jalali";
import { Spinner } from "./Spinner";
import { MentorField } from "./MentorUI";
import { MentorSheet } from "./MentorMotion";

const OTHER = "سایر";

const REASONS: Record<ReportTargetType | "CONVERSATION", string[]> = {
  USER: ["اطلاعات یا مدرک جعلی", "رفتار نامناسب یا توهین‌آمیز", "درخواست پرداخت یا ارتباط خارج از آریون", "اسپم یا تبلیغ", OTHER],
  REVIEW: ["محتوای توهین‌آمیز", "نظر جعلی یا غیرواقعی", "اسپم یا تبلیغ", "افشای اطلاعات شخصی", OTHER],
  MESSAGE: ["توهین یا آزار", "اسپم یا تبلیغ", "درخواست پرداخت یا ارتباط خارج از آریون", "محتوای نامناسب", OTHER],
  CONVERSATION: ["توهین یا آزار", "اسپم یا تبلیغ", "درخواست پرداخت یا ارتباط خارج از آریون", "محتوای نامناسب", OTHER],
  PROGRAM: ["برنامه‌ی خطرناک یا آسیب‌زا", "محتوای نامناسب", "اسپم یا تبلیغ", OTHER],
};

// متن فارسی دلیل‌ها همون چیزیه که ذخیره و برای ادمین فرستاده می‌شه (value)؛ فقط برچسب نمایشی ترجمه می‌شه
const REASON_EN: Record<string, string> = {
  "سایر": "Other",
  "اطلاعات یا مدرک جعلی": "Fake information or certificate",
  "رفتار نامناسب یا توهین‌آمیز": "Inappropriate or offensive behavior",
  "درخواست پرداخت یا ارتباط خارج از آریون": "Asking for payment or contact outside Arion",
  "اسپم یا تبلیغ": "Spam or advertising",
  "محتوای توهین‌آمیز": "Offensive content",
  "نظر جعلی یا غیرواقعی": "Fake or untrue review",
  "افشای اطلاعات شخصی": "Sharing personal information",
  "توهین یا آزار": "Insults or harassment",
  "محتوای نامناسب": "Inappropriate content",
  "برنامه‌ی خطرناک یا آسیب‌زا": "Dangerous or harmful program",
};
const reasonLabel = (r: string) => tr(r, REASON_EN[r] ?? r);

const titleOf = (t: ReportTargetType): string =>
  t === "USER" ? tr("گزارش مربی", "Report mentor")
  : t === "REVIEW" ? tr("گزارش نظر", "Report review")
  : t === "MESSAGE" ? tr("گزارش پیام", "Report message")
  : tr("گزارش برنامه", "Report program");

/** دلیل + توضیح — مشترک گزارش تکی و گزارش گفت‌وگو */
function ReasonFields({
  kind, reason, details, reasonError, detailsError, onReason, onDetails,
}: {
  kind: keyof typeof REASONS;
  reason: string; details: string; reasonError: string | null; detailsError: string | null;
  onReason: (v: string) => void; onDetails: (v: string) => void;
}) {
  return (
    <>
      <MentorField label={tr("دلیل", "Reason")} htmlFor={`mentor-report-reason-${kind}`} error={reasonError}>
        <select
          id={`mentor-report-reason-${kind}`}
          className="wsearch-newform-name trade-glass-field"
          value={reason}
          onChange={(e) => onReason(e.target.value)}
          aria-invalid={!!reasonError}
        >
          <option value="">{tr("یک دلیل انتخاب کن", "Choose a reason")}</option>
          {REASONS[kind].map((r) => <option key={r} value={r}>{reasonLabel(r)}</option>)}
        </select>
      </MentorField>
      <MentorField label={tr("توضیح", "Details")} htmlFor={`mentor-report-details-${kind}`} optional={reason !== OTHER} error={detailsError}>
        <textarea
          id={`mentor-report-details-${kind}`}
          className="wsearch-newform-name trade-glass-field"
          rows={3}
          maxLength={1000}
          value={details}
          onChange={(e) => onDetails(e.target.value)}
          placeholder={tr("مثلا «شماره‌ی تماس شخصی خواست»", "For example: \"Asked for my personal phone number\"")}
          aria-invalid={!!detailsError}
        />
      </MentorField>
    </>
  );
}

function DoneBody({ onClose, text }: { onClose: () => void; text: string }) {
  return (
    <>
      <p className="mentor-dialog-msg" role="status">{text}</p>
      <p className="mentor-dialog-hint">{tr("ادمین‌های آریون بررسیش می‌کنن", "The Arion team will review it")}</p>
      <div className="trade-modal-actions">
        <button type="button" className="account-outline-btn mentor-btn" onClick={onClose}>{tr("بستن", "Close")}</button>
      </div>
    </>
  );
}

/**
 * گزارش تخلف (POST /api/mentor-reports). دلیل اجباری است، توضیح اختیاری
 * (برای «سایر» اجباری)؛ گزارش تکراری (۴۰۹) پیام مخصوص خودش را می‌گیرد.
 */
export function MentorReportModal({
  targetType,
  targetId,
  franking,
  onClose,
}: {
  targetType: ReportTargetType;
  targetId: string;
  /**
   * فقط برای پیام رمزگذاری‌شده: متن و کلید فرانکینگ همان پیام (از رمزگشایی
   * روی همین دستگاه). سرور با تعهد ثبت‌شده‌ی فرستنده تطبیقش می‌دهد و فقط همین
   * یک پیام را برای ادمین نگه می‌دارد (docs/mentor-e2ee.md).
   */
  franking?: { text: string; frankingKey: string };
  onClose: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // بستن با انیمیشن؛ والد پس از پایان آن باخبر می‌شود
  const close = () => { if (!busy) setOpen(false); };
  useEffect(() => {
    if (open) return;
    const t = setTimeout(onClose, 180);
    return () => clearTimeout(t);
  }, [open, onClose]);

  async function submit() {
    if (!reason) { setReasonError(tr("یک دلیل انتخاب کن", "Choose a reason")); return; }
    if (reason === OTHER && !details.trim()) { setDetailsError(tr("برای «سایر» یه توضیح بنویس", "Add a few details for \"Other\"")); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/mentor-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, reason, details: details.trim() || undefined, ...(franking ? { franking } : {}) }),
      });
      if (res.status === 409) { setError(tr("این مورد رو قبلا گزارش دادی و ادمین‌ها دارن بررسیش می‌کنن", "You already reported this and the team is reviewing it")); return; }
      if (!res.ok) { setError(await readApiError(res, tr("گزارش ثبت نشد؛ دوباره امتحان کن", "Couldn't send the report. Try again"))); return; }
      setDone(true);
    } catch {
      setError(networkError());
    } finally {
      setBusy(false);
    }
  }

  return (
    <MentorSheet open={open} onClose={close} title={titleOf(targetType)} size="sm" dismissible={!busy}>
      {done ? (
        <DoneBody onClose={close} text={tr("گزارش ثبت شد", "Report sent")} />
      ) : (
        <>
          <div className="mentor-form">
            {targetType === "MESSAGE" && (
              <p className="mentor-muted">{tr("با ثبت گزارش، فقط متن همین یک پیام برای ادمین‌های آریون دیده می‌شه. بقیه‌ی پیام‌های گفت‌وگو خصوصی می‌مونن.", "When you send the report, only the text of this one message is shown to the Arion team. The rest of the chat stays private.")}</p>
            )}
            <ReasonFields
              kind={targetType}
              reason={reason}
              details={details}
              reasonError={reasonError}
              detailsError={detailsError}
              onReason={(v) => { setReason(v); setReasonError(null); setDetailsError(null); }}
              onDetails={(v) => { setDetails(v); setDetailsError(null); }}
            />
          </div>
          {error && <div className="form-inline-error" role="alert">{error}</div>}
          <div className="trade-modal-actions">
            <button type="button" className="account-outline-btn mentor-btn" onClick={close} disabled={busy}>{tr("انصراف", "Cancel")}</button>
            <button type="button" className="trade-danger-btn mentor-btn" onClick={submit} disabled={busy}>
              {busy ? <Spinner size={14} /> : tr("ثبت گزارش", "Send report")}
            </button>
          </div>
        </>
      )}
    </MentorSheet>
  );
}

export type ConversationReportCandidate = {
  id: string;
  mine: boolean;
  createdAt: string;
  text: string;
  /** نبودنش = پیام قدیمی پیش از رمزگذاری (متن از سرور برداشته می‌شود) */
  frankingKey?: string;
};

/** پیش‌فرض پیوست: این تعداد پیام آخر؛ سقف ۵۰ (همان سقف سرور) */
const DEFAULT_PICK = 20;
const MAX_PICK = 50;

/**
 * «گزارش گفت‌وگو»: کاربر پیام‌هایی را که برای ادمین پیوست می‌شوند خودش
 * انتخاب می‌کند (پیش‌فرض ۲۰ پیام آخر، حداکثر ۵۰). هر پیام با کلید فرانکینگ
 * خودش فرستاده و سمت سرور جداگانه تایید می‌شود؛ پیام‌های انتخاب‌نشده
 * رمزگذاری‌شده می‌مانند. POST /api/mentorships/:id/report
 */
export function MentorConversationReportSheet({
  open, mentorshipId, peerName, candidates, onClose,
}: {
  open: boolean;
  mentorshipId: string;
  peerName: string;
  candidates: ConversationReportCandidate[];
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const list = useMemo(() => candidates.slice(-MAX_PICK), [candidates]);

  // هر بار باز شدن: فرم تازه با ۲۰ پیام آخر
  useEffect(() => {
    if (!open) return;
    setPicked(new Set(list.slice(-DEFAULT_PICK).map((c) => c.id)));
    setReason(""); setDetails(""); setError(null); setReasonError(null); setDetailsError(null); setPickError(null); setDone(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function toggle(id: string) {
    setPickError(null);
    setPicked((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else if (n.size < MAX_PICK) n.add(id);
      return n;
    });
  }

  async function submit() {
    if (!reason) { setReasonError(tr("یک دلیل انتخاب کن", "Choose a reason")); return; }
    if (reason === OTHER && !details.trim()) { setDetailsError(tr("برای «سایر» یه توضیح بنویس", "Add a few details for \"Other\"")); return; }
    const chosen = list.filter((c) => picked.has(c.id));
    if (!chosen.some((c) => !c.mine)) { setPickError(tr(`حداقل یک پیام از ${peerName} انتخاب کن`, `Select at least one message from ${peerName}`)); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/mentorships/${mentorshipId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason,
          details: details.trim() || undefined,
          messages: chosen.map((c) => (c.frankingKey ? { id: c.id, text: c.text, frankingKey: c.frankingKey } : { id: c.id })),
        }),
      });
      if (res.status === 409) { setError(tr("این گفت‌وگو رو قبلا گزارش دادی و ادمین‌ها دارن بررسیش می‌کنن", "You already reported this chat and the team is reviewing it")); return; }
      if (!res.ok) { setError(await readApiError(res, tr("گزارش ثبت نشد؛ دوباره امتحان کن", "Couldn't send the report. Try again"))); return; }
      setDone(true);
    } catch {
      setError(networkError());
    } finally {
      setBusy(false);
    }
  }

  const close = () => { if (!busy) onClose(); };

  return (
    <MentorSheet open={open} onClose={close} title={tr("گزارش گفت‌وگو", "Report chat")} size="md" dismissible={!busy}>
      {done ? (
        <DoneBody onClose={close} text={tr(`گزارش با ${faNum(picked.size)} پیام پیوست ثبت شد`, `Report sent with ${faNum(picked.size)} ${picked.size === 1 ? "message" : "messages"} attached`)} />
      ) : list.length === 0 ? (
        <>
          <p className="mentor-dialog-msg">{tr("پیامی برای پیوست کردن نیست", "There are no messages to attach")}</p>
          <div className="trade-modal-actions">
            <button type="button" className="account-outline-btn mentor-btn" onClick={close}>{tr("بستن", "Close")}</button>
          </div>
        </>
      ) : (
        <>
          <div className="mentor-form">
            <ReasonFields
              kind="CONVERSATION"
              reason={reason}
              details={details}
              reasonError={reasonError}
              detailsError={detailsError}
              onReason={(v) => { setReason(v); setReasonError(null); setDetailsError(null); }}
              onDetails={(v) => { setDetails(v); setDetailsError(null); }}
            />
            <div className="mentor-field">
              <div className="mc-pick-head">
                <span className="mentor-field-label">{tr("پیام‌های پیوست", "Attached messages")}</span>
                <span className="mentor-muted">{faNum(picked.size)} {tr("از", "of")} {faNum(list.length)}</span>
                <button
                  type="button"
                  className="mentor-text-btn"
                  onClick={() => setPicked(picked.size === list.length ? new Set() : new Set(list.map((c) => c.id)))}
                >
                  {picked.size === list.length ? tr("برداشتن همه", "Deselect all") : tr("انتخاب همه", "Select all")}
                </button>
              </div>
              <p className="mentor-field-hint">{tr("فقط متن پیام‌هایی که انتخاب کردی برای ادمین‌های آریون دیده می‌شه. بقیه خصوصی می‌مونن.", "Only the messages you select are shown to the Arion team. The rest stay private.")}</p>
              <div className="mc-pick-list thin-scroll" role="group" aria-label={tr("پیام‌های پیوست", "Attached messages")}>
                {list.map((c) => (
                  <label key={c.id} className={`mentor-check mc-pick${c.mine ? " is-mine" : ""}`}>
                    <TickButton shape="square" size={22} checked={picked.has(c.id)} onToggle={() => toggle(c.id)} />
                    <span className="mentor-check-label">
                      <span className="mc-pick-meta">{c.mine ? tr("تو", "You") : peerName}<span>{fmtDateTime(c.createdAt)}</span></span>
                      <span className="mc-pick-text" dir="auto">{c.text}</span>
                    </span>
                  </label>
                ))}
              </div>
              {pickError && <p className="mentor-field-error" role="alert">{pickError}</p>}
            </div>
          </div>
          {error && <div className="form-inline-error" role="alert">{error}</div>}
          <div className="trade-modal-actions">
            <button type="button" className="account-outline-btn mentor-btn" onClick={close} disabled={busy}>{tr("انصراف", "Cancel")}</button>
            <button type="button" className="trade-danger-btn mentor-btn" onClick={submit} disabled={busy || picked.size === 0}>
              {busy ? <Spinner size={14} /> : tr("ثبت گزارش", "Send report")}
            </button>
          </div>
        </>
      )}
    </MentorSheet>
  );
}
