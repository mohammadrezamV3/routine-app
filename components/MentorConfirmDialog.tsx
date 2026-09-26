"use client";

import { Loader2 } from "lucide-react";
import { createPortal } from "react-dom";
import { LockBodyScroll } from "./LockBodyScroll";

// پاپ‌آپِ تأییدِ اقدامِ مخرب (پایان/مسدودی/لغو/حذف) — همان مارک‌آپِ تأییدِ
// «بلاک» در FriendProfileModal، فقط عمومی‌شده. خطا داخلِ خودِ پاپ‌آپ دیده
// می‌شود تا کاربر بداند اقدام انجام نشده.
export function MentorConfirmDialog({
  message,
  confirmLabel,
  busy,
  error,
  danger = true,
  onConfirm,
  onCancel,
  children,
}: {
  message: string;
  confirmLabel: string;
  busy?: boolean;
  error?: string | null;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <>
      <LockBodyScroll />
      <div className="modal-overlay open" onClick={() => !busy && onCancel()} style={{ zIndex: 90 }} />
      <div className="modal-panel open" role="alertdialog" aria-modal="true" style={{ zIndex: 91, maxWidth: 380 }}>
        <div className="modal-body" style={{ paddingTop: 4 }}>
          <div className="text-[13px] font-bold" style={{ color: "var(--text)", lineHeight: 1.9, textAlign: "center" }}>
            {message}
          </div>
          {children}
          {error && <div className="trade-form-error">{error}</div>}
          <div className="trade-modal-actions">
            <button type="button" className="account-outline-btn" onClick={onCancel} disabled={busy}>
              انصراف
            </button>
            <button type="button" className={danger ? "trade-danger-btn" : "trade-primary-btn"} onClick={onConfirm} disabled={busy}>
              {busy ? <Loader2 size={14} className="trade-spin" /> : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
