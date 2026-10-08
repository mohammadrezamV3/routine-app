"use client";

import "./mentor.css";
import { TickButton } from "./TickButton";
import { useEffect, useMemo, useState } from "react";
import type { ReportTargetType } from "@/lib/mentorTypes";
import { NETWORK_ERROR, fmtDateTime, readApiError } from "@/lib/mentorFormat";
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

const TITLES: Record<ReportTargetType, string> = {
  USER: "گزارش مربی",
  REVIEW: "گزارش نظر",
  MESSAGE: "گزارش پیام",
  PROGRAM: "گزارش برنامه",
};

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
      <MentorField label="دلیل" htmlFor={`mentor-report-reason-${kind}`} error={reasonError}>
        <select
          id={`mentor-report-reason-${kind}`}
          className="wsearch-newform-name trade-glass-field"
          value={reason}
          onChange={(e) => onReason(e.target.value)}
          aria-invalid={!!reasonError}
        >
          <option value="">یک دلیل انتخاب کن</option>
          {REASONS[kind].map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </MentorField>
      <MentorField label="توضیح" htmlFor={`mentor-report-details-${kind}`} optional={reason !== OTHER} error={detailsError}>
        <textarea
          id={`mentor-report-details-${kind}`}
          className="wsearch-newform-name trade-glass-field"
          rows={3}
          maxLength={1000}
          value={details}
          onChange={(e) => onDetails(e.target.value)}
          placeholder="مثلا «شماره‌ی تماس شخصی خواست»"
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
      <p className="mentor-dialog-hint">ادمین‌های آریون بررسیش می‌کنن</p>
      <div className="trade-modal-actions">
        <button type="button" className="account-outline-btn mentor-btn" onClick={onClose}>بستن</button>
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
    if (!reason) { setReasonError("یک دلیل انتخاب کن"); return; }
    if (reason === OTHER && !details.trim()) { setDetailsError("برای «سایر» یه توضیح بنویس"); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/mentor-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, reason, details: details.trim() || undefined, ...(franking ? { franking } : {}) }),
      });
      if (res.status === 409) { setError("این مورد رو قبلا گزارش دادی و ادمین‌ها دارن بررسیش می‌کنن"); return; }
      if (!res.ok) { setError(await readApiError(res, "گزارش ثبت نشد؛ دوباره امتحان کن")); return; }
      setDone(true);
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  }

  return (
    <MentorSheet open={open} onClose={close} title={TITLES[targetType]} size="sm" dismissible={!busy}>
      {done ? (
        <DoneBody onClose={close} text="گزارش ثبت شد" />
      ) : (
        <>
          <div className="mentor-form">
            {targetType === "MESSAGE" && (
              <p className="mentor-muted">با ثبت گزارش، فقط متن همین یک پیام برای ادمین‌های آریون دیده می‌شه. بقیه‌ی پیام‌های گفت‌وگو خصوصی می‌مونن.</p>
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
            <button type="button" className="account-outline-btn mentor-btn" onClick={close} disabled={busy}>انصراف</button>
            <button type="button" className="trade-danger-btn mentor-btn" onClick={submit} disabled={busy}>
              {busy ? <Spinner size={14} /> : "ثبت گزارش"}
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
    if (!reason) { setReasonError("یک دلیل انتخاب کن"); return; }
    if (reason === OTHER && !details.trim()) { setDetailsError("برای «سایر» یه توضیح بنویس"); return; }
    const chosen = list.filter((c) => picked.has(c.id));
    if (!chosen.some((c) => !c.mine)) { setPickError(`حداقل یک پیام از ${peerName} انتخاب کن`); return; }
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
      if (res.status === 409) { setError("این گفت‌وگو رو قبلا گزارش دادی و ادمین‌ها دارن بررسیش می‌کنن"); return; }
      if (!res.ok) { setError(await readApiError(res, "گزارش ثبت نشد؛ دوباره امتحان کن")); return; }
      setDone(true);
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  }

  const close = () => { if (!busy) onClose(); };

  return (
    <MentorSheet open={open} onClose={close} title="گزارش گفت‌وگو" size="md" dismissible={!busy}>
      {done ? (
        <DoneBody onClose={close} text={`گزارش با ${faNum(picked.size)} پیام پیوست ثبت شد`} />
      ) : list.length === 0 ? (
        <>
          <p className="mentor-dialog-msg">پیامی برای پیوست کردن نیست</p>
          <div className="trade-modal-actions">
            <button type="button" className="account-outline-btn mentor-btn" onClick={close}>بستن</button>
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
                <span className="mentor-field-label">پیام‌های پیوست</span>
                <span className="mentor-muted">{faNum(picked.size)} از {faNum(list.length)}</span>
                <button
                  type="button"
                  className="mentor-text-btn"
                  onClick={() => setPicked(picked.size === list.length ? new Set() : new Set(list.map((c) => c.id)))}
                >
                  {picked.size === list.length ? "برداشتن همه" : "انتخاب همه"}
                </button>
              </div>
              <p className="mentor-field-hint">فقط متن پیام‌هایی که انتخاب کردی برای ادمین‌های آریون دیده می‌شه. بقیه خصوصی می‌مونن.</p>
              <div className="mc-pick-list thin-scroll" role="group" aria-label="پیام‌های پیوست">
                {list.map((c) => (
                  <label key={c.id} className={`mentor-check mc-pick${c.mine ? " is-mine" : ""}`}>
                    <TickButton shape="square" size={22} checked={picked.has(c.id)} onToggle={() => toggle(c.id)} />
                    <span className="mentor-check-label">
                      <span className="mc-pick-meta">{c.mine ? "تو" : peerName}<span>{fmtDateTime(c.createdAt)}</span></span>
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
            <button type="button" className="account-outline-btn mentor-btn" onClick={close} disabled={busy}>انصراف</button>
            <button type="button" className="trade-danger-btn mentor-btn" onClick={submit} disabled={busy || picked.size === 0}>
              {busy ? <Spinner size={14} /> : "ثبت گزارش"}
            </button>
          </div>
        </>
      )}
    </MentorSheet>
  );
}
