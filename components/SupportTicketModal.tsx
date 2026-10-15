"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { LockBodyScroll } from "./LockBodyScroll";
import { Spinner } from "./Spinner";
import { tr } from "@/lib/i18n";

// پاپ‌آپ «ایجاد تیکت» — موضوع + متن اولین پیام. همون الگوی مودال‌های
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
      if (!res.ok) { setError(data?.error || tr("خطا در ثبت تیکت", "Could not submit the ticket")); return; }
      onCreated(data.ticket.id);
    } catch {
      setError(tr("ارتباط با سرور برقرار نشد — دوباره تلاش کن", "Could not reach the server. Try again."));
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
          <div className="modal-title">{tr("تیکت جدید", "New ticket")}</div>
          <button type="button" className="trade-icon-btn" onClick={onClose} aria-label={tr("بستن", "Close")}><X size={16} /></button>
        </div>

        <label className="exercise-form-label">{tr("موضوع", "Subject")}</label>
        <input
          className="wsearch-newform-name trade-glass-field" autoFocus
          value={subject} onChange={(e) => setSubject(e.target.value)}
          maxLength={120} placeholder={tr("مثلا مشکل در پرداخت اشتراک", "e.g. problem paying for a subscription")}
        />

        <label className="exercise-form-label">{tr("پیام", "Message")}</label>
        <textarea
          className="wsearch-newform-name trade-glass-field"
          value={message} onChange={(e) => setMessage(e.target.value)}
          maxLength={4000} rows={5} placeholder={tr("مشکلت رو با جزئیات توضیح بده…", "Describe your problem in detail…")}
        />

        {error && <div className="trade-form-error">{error}</div>}

        <div className="trade-modal-actions">
          <button type="button" className="account-outline-btn" onClick={onClose}>{tr("لغو", "Cancel")}</button>
          <button type="button" className="trade-primary-btn" onClick={submit} disabled={!subject.trim() || !message.trim() || saving}>
            {saving ? <Spinner size={14} /> : tr("ارسال تیکت", "Send ticket")}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
