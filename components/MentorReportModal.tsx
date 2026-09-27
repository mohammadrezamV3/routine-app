"use client";

import "./mentor.css";
import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { ReportTargetType } from "@/lib/mentorTypes";
import { NETWORK_ERROR, readApiError } from "@/lib/mentorFormat";
import { LockBodyScroll } from "./LockBodyScroll";
import { Spinner } from "./Spinner";
import { MentorField } from "./MentorUI";

const OTHER = "سایر";

const REASONS: Record<ReportTargetType, string[]> = {
  USER: ["اطلاعات یا مدرک جعلی", "رفتار نامناسب یا توهین‌آمیز", "درخواست پرداخت یا ارتباط خارج از آریون", "اسپم یا تبلیغ", OTHER],
  REVIEW: ["محتوای توهین‌آمیز", "نظر جعلی یا غیرواقعی", "اسپم یا تبلیغ", "افشای اطلاعات شخصی", OTHER],
  MESSAGE: ["توهین یا آزار", "اسپم یا تبلیغ", "درخواست پرداخت یا ارتباط خارج از آریون", "محتوای نامناسب", OTHER],
  PROGRAM: ["برنامه‌ی خطرناک یا آسیب‌زا", "محتوای نامناسب", "اسپم یا تبلیغ", OTHER],
};

const TITLES: Record<ReportTargetType, string> = {
  USER: "گزارش منتور",
  REVIEW: "گزارش نظر",
  MESSAGE: "گزارش پیام",
  PROGRAM: "گزارش برنامه",
};

/**
 * گزارشِ تخلف (POST /api/mentor-reports). دلیل اجباری است، توضیح اختیاری
 * (برای «سایر» اجباری)؛ گزارشِ تکراری (۴۰۹) پیامِ مخصوصِ خودش را می‌گیرد.
 */
export function MentorReportModal({
  targetType,
  targetId,
  onClose,
}: {
  targetType: ReportTargetType;
  targetId: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!reason) { setReasonError("یک دلیل انتخاب کن"); return; }
    if (reason === OTHER && !details.trim()) { setDetailsError("برای «سایر» توضیح لازم است"); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/mentor-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, reason, details: details.trim() || undefined }),
      });
      if (res.status === 409) { setError("این مورد را قبلاً گزارش داده‌ای و در صف بررسی ادمین‌های آریون است"); return; }
      if (!res.ok) { setError(await readApiError(res, "گزارش ثبت نشد؛ دوباره تلاش کن")); return; }
      setDone(true);
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  }

  if (typeof document === "undefined") return null;
  return createPortal(
    <>
      <LockBodyScroll />
      <div className="modal-overlay open" onClick={() => !busy && onClose()} style={{ zIndex: 90 }} />
      <div className="modal-panel open mentor-modal" role="dialog" aria-modal="true" aria-label={TITLES[targetType]} style={{ zIndex: 91, maxWidth: 420 }}>
        <div className="modal-head">
          <div className="modal-title">{TITLES[targetType]}</div>
          <button type="button" className="trade-icon-btn" onClick={onClose} aria-label="بستن" disabled={busy}>
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>
        {done ? (
          <>
            <p className="mentor-dialog-msg" role="status">گزارش ثبت شد</p>
            <p className="mentor-dialog-hint">در صف بررسی ادمین‌های آریون قرار گرفت</p>
            <div className="trade-modal-actions">
              <button type="button" className="account-outline-btn mentor-btn" onClick={onClose}>بستن</button>
            </div>
          </>
        ) : (
          <>
            <div className="mentor-form">
              <MentorField label="دلیل" htmlFor="mentor-report-reason" error={reasonError}>
                <select
                  id="mentor-report-reason"
                  className="wsearch-newform-name trade-glass-field"
                  value={reason}
                  onChange={(e) => { setReason(e.target.value); setReasonError(null); setDetailsError(null); }}
                  aria-invalid={!!reasonError}
                >
                  <option value="">یک دلیل انتخاب کن</option>
                  {REASONS[targetType].map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </MentorField>
              <MentorField label="توضیح" htmlFor="mentor-report-details" optional={reason !== OTHER} error={detailsError}>
                <textarea
                  id="mentor-report-details"
                  className="wsearch-newform-name trade-glass-field"
                  rows={3}
                  maxLength={1000}
                  value={details}
                  onChange={(e) => { setDetails(e.target.value); setDetailsError(null); }}
                  placeholder="مثلاً «شماره‌ی تماس شخصی خواست»"
                  aria-invalid={!!detailsError}
                />
              </MentorField>
            </div>
            {error && <div className="form-inline-error" role="alert">{error}</div>}
            <div className="trade-modal-actions">
              <button type="button" className="account-outline-btn mentor-btn" onClick={onClose} disabled={busy}>انصراف</button>
              <button type="button" className="trade-danger-btn mentor-btn" onClick={submit} disabled={busy}>
                {busy ? <Spinner size={14} /> : "ثبت گزارش"}
              </button>
            </div>
          </>
        )}
      </div>
    </>,
    document.body
  );
}
