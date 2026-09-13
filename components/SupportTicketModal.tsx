"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import { LockBodyScroll } from "./LockBodyScroll";

// پاپ‌آپِ «ایجاد تیکت» — موضوع + متنِ اولین پیام. همون الگوی مودال‌های
// دیگه‌ی همین اپ (TradeAccountModal): modal-overlay/modal-panel + فیلدهای
// wsearch-newform-name/trade-glass-field.
export function SupportTicketModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (ticketId: string) => void;
}) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!subject.trim() || !message.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError(data?.error || "خطا در ثبت تیکت"); return; }
      onCreated(data.ticket.id);
    } catch {
      setError("ارتباط با سرور برقرار نشد — دوباره تلاش کن");
    } finally {
      setSaving(false);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <LockBodyScroll />
      <div className="modal-overlay open" onClick={onClose} />
      <div className="modal-panel open" role="dialog" aria-modal="true">
        <div className="modal-head">
          <div className="modal-title">تیکت جدید</div>
          <button type="button" className="trade-icon-btn" onClick={onClose} aria-label="بستن"><X size={16} /></button>
        </div>

        <label className="exercise-form-label">موضوع</label>
        <input
          className="wsearch-newform-name trade-glass-field" autoFocus
          value={subject} onChange={(e) => setSubject(e.target.value)}
          maxLength={120} placeholder="مثلا مشکل در پرداخت اشتراک"
        />

        <label className="exercise-form-label">پیام</label>
        <textarea
          className="wsearch-newform-name trade-glass-field"
          value={message} onChange={(e) => setMessage(e.target.value)}
          maxLength={4000} rows={5} placeholder="مشکلت رو با جزئیات توضیح بده…"
        />

        {error && <div className="trade-form-error">{error}</div>}

        <div className="trade-modal-actions">
          <button type="button" className="account-outline-btn" onClick={onClose}>لغو</button>
          <button type="button" className="trade-primary-btn" onClick={submit} disabled={!subject.trim() || !message.trim() || saving}>
            {saving ? <Loader2 size={15} className="trade-spin" /> : "ارسال تیکت"}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
