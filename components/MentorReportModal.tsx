"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Check, Loader2, X } from "lucide-react";
import type { ReportTargetType } from "@/lib/mentorTypes";
import { NETWORK_ERROR, readApiError } from "@/lib/mentorFormat";
import { LockBodyScroll } from "./LockBodyScroll";

const REASONS: Record<ReportTargetType, string[]> = {
  USER: ["اطلاعات یا مدرکِ جعلی", "رفتارِ نامناسب یا توهین‌آمیز", "درخواستِ پرداخت/ارتباط خارج از آریون", "اسپم یا تبلیغ", "سایر"],
  REVIEW: ["محتوای توهین‌آمیز", "نظرِ جعلی یا غیرواقعی", "اسپم یا تبلیغ", "افشای اطلاعات شخصی", "سایر"],
  MESSAGE: ["توهین یا آزار", "اسپم یا تبلیغ", "درخواستِ پرداخت/ارتباط خارج از آریون", "محتوای نامناسب", "سایر"],
  PROGRAM: ["برنامه‌ی خطرناک یا آسیب‌زا", "محتوای نامناسب", "اسپم یا تبلیغ", "سایر"],
};

const TITLES: Record<ReportTargetType, string> = {
  USER: "گزارشِ منتور",
  REVIEW: "گزارشِ نظر",
  MESSAGE: "گزارشِ پیام",
  PROGRAM: "گزارشِ برنامه",
};

/**
 * گزارشِ تخلف (POST /api/mentor-reports). دلیل اجباری است، توضیح اختیاری؛
 * گزارشِ تکراری (۴۰۹) پیامِ مخصوصِ خودش را می‌گیرد، نه یک خطای کلی.
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
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!reason) { setError("یک دلیل انتخاب کن"); return; }
    if (reason === "سایر" && !details.trim()) { setError("برای «سایر» چند کلمه توضیح بنویس"); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/mentor-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, reason, details: details.trim() || undefined }),
      });
      if (res.status === 409) { setError("این مورد را قبلا گزارش داده‌ای و در حال بررسی است"); return; }
      if (!res.ok) { setError(await readApiError(res, "ثبتِ گزارش انجام نشد")); return; }
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
      <div className="modal-panel open" role="dialog" aria-modal="true" style={{ zIndex: 91, maxWidth: 420 }}>
        <div className="modal-head">
          <div className="modal-title">{TITLES[targetType]}</div>
          <button type="button" className="trade-icon-btn" onClick={onClose} aria-label="بستن" disabled={busy}><X size={16} /></button>
        </div>
        {done ? (
          <div className="modal-body" style={{ textAlign: "center" }}>
            <div className="trade-empty-state" style={{ padding: "18px 8px" }}>
              <Check size={28} />
              <p>گزارشت ثبت شد و تیمِ آریون بررسی‌اش می‌کند. ممنون که کمک می‌کنی فضا امن بماند.</p>
            </div>
            <div className="trade-modal-actions">
              <button type="button" className="account-outline-btn" onClick={onClose}>بستن</button>
            </div>
          </div>
        ) : (
          <>
            <label className="exercise-form-label" htmlFor="mentor-report-reason">دلیل</label>
            <select
              id="mentor-report-reason"
              className="wsearch-newform-name trade-glass-field"
              value={reason}
              onChange={(e) => { setReason(e.target.value); setError(null); }}
            >
              <option value="">انتخاب کن…</option>
              {REASONS[targetType].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <label className="exercise-form-label" htmlFor="mentor-report-details">توضیح {reason === "سایر" ? "" : "(اختیاری)"}</label>
            <textarea
              id="mentor-report-details"
              className="wsearch-newform-name trade-glass-field"
              rows={3}
              maxLength={1000}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="هر چیزی که به بررسی کمک می‌کند"
            />
            {error && <div className="trade-form-error">{error}</div>}
            <div className="trade-modal-actions">
              <button type="button" className="account-outline-btn" onClick={onClose} disabled={busy}>انصراف</button>
              <button type="button" className="trade-danger-btn" onClick={submit} disabled={busy}>
                {busy ? <Loader2 size={14} className="trade-spin" /> : "ثبتِ گزارش"}
              </button>
            </div>
          </>
        )}
      </div>
    </>,
    document.body
  );
}
