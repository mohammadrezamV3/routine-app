"use client";

import "./mentor.css";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { LockBodyScroll } from "./LockBodyScroll";
import { Spinner } from "./Spinner";

// پاپ‌آپِ تاییدِ اقدامِ مخرب (پایان/مسدودی/لغو/حذف) — همان مارک‌آپِ تاییدِ
// «بلاک» در FriendProfileModal، فقط عمومی‌شده. خطا داخلِ خودِ پاپ‌آپ دیده
// می‌شود تا کاربر بداند اقدام انجام نشده.
// متن: `message` یک سؤالِ مشخص است («رابطه با سارا پایان یابد؟»)، `hint`
// پیامدِ آن در یک جمله، و `confirmLabel` فعلِ همان اقدام («پایان رابطه»)، نه «بله».
export function MentorConfirmDialog({
  message,
  hint,
  confirmLabel,
  busy,
  error,
  danger = true,
  onConfirm,
  onCancel,
  children,
}: {
  message: string;
  /** پیامدِ اقدام در یک جمله، زیرِ سؤال */
  hint?: string;
  confirmLabel: string;
  busy?: boolean;
  error?: string | null;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}) {
  // Escape = انصراف (مگر وسطِ انجامِ اقدام)؛ فوکوس اول روی «انصراف» که Enterِ
  // اتفاقی اقدامِ مخرب رو انجام نده.
  const cancelRef = useRef<HTMLButtonElement>(null);
  const stateRef = useRef({ busy, onCancel });
  stateRef.current = { busy, onCancel };
  useEffect(() => {
    cancelRef.current?.focus({ preventScroll: true });
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape" || stateRef.current.busy) return;
      e.stopPropagation();
      stateRef.current.onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  if (typeof document === "undefined") return null;
  return createPortal(
    <>
      <LockBodyScroll />
      <div className="modal-overlay open" onClick={() => !busy && onCancel()} style={{ zIndex: 90 }} />
      <div className="modal-panel open mentor-modal" role="alertdialog" aria-modal="true" aria-label={message} style={{ zIndex: 91, maxWidth: 380 }}>
        <div className="modal-body" style={{ paddingTop: 4 }}>
          <p className="mentor-dialog-msg">{message}</p>
          {hint && <p className="mentor-dialog-hint">{hint}</p>}
          {children}
          {error && <div className="trade-form-error">{error}</div>}
          <div className="trade-modal-actions">
            <button type="button" className="mentor-btn account-outline-btn" onClick={onCancel} disabled={busy}>
              انصراف
            </button>
            <button type="button" className={`mentor-btn ${danger ? "trade-danger-btn" : "trade-primary-btn"}`} onClick={onConfirm} disabled={busy}>
              {busy ? <Spinner size={14} /> : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
