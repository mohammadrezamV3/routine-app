"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { useAdminToast } from "./useAdminToast";

// پاپ‌آپ مشترک پنل — همون .modal-overlay/.modal-panel خود اپ (نه یه استایل
// جدا) تا با بقیه‌ی مودال‌های اپ یکی باشه. پورتال به body چون .admin-topbar
// stacking context خودش رو داره.
export function AdminModal({
  title, eyebrow, onClose, children, wide = false,
}: { title: string; eyebrow?: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useLockBodyScroll();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (!mounted) return null;
  return createPortal(
    <>
      <div className="modal-overlay open" onClick={onClose} />
      <div className={`modal-panel open admin-modal${wide ? " is-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title} dir="rtl">
        <div className="modal-head">
          <div>
            {eyebrow && <div className="modal-eyebrow">{eyebrow}</div>}
            <div className="modal-title">{title}</div>
          </div>
          <button type="button" className="admin-icon-btn" onClick={onClose} aria-label="بستن"><X size={16} /></button>
        </div>
        {children}
      </div>
    </>,
    document.body,
  );
}

// تایید اقدام خطرناک — برای حذف دائمی باید عبارت تایید تایپ بشه
export function ConfirmModal({
  title, message, confirmLabel, danger = true, typeToConfirm, onConfirm, onClose,
}: {
  title: string; message: React.ReactNode; confirmLabel: string; danger?: boolean; typeToConfirm?: string;
  onConfirm: () => Promise<void> | void; onClose: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useAdminToast();
  const blocked = !!typeToConfirm && typed.trim() !== typeToConfirm;
  return (
    <AdminModal title={title} eyebrow="تایید اقدام" onClose={onClose}>
      <div className="admin-modal-text">{message}</div>
      {typeToConfirm && (
        <label className="admin-field">
          <span>برای تایید، «{typeToConfirm}» رو تایپ کن</span>
          <input className="admin-input" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
        </label>
      )}
      <div className="admin-modal-actions">
        <button type="button" className="admin-btn" onClick={onClose} disabled={busy}>انصراف</button>
        <button
          type="button" className={`admin-btn ${danger ? "danger" : "primary"}`} disabled={blocked || busy}
          onClick={async () => {
            setBusy(true);
            // خطای onConfirm قبلا یه unhandled rejection بی‌صدا بود — حالا پیام می‌گیره
            try { await onConfirm(); }
            catch (e) { toast(e instanceof Error && e.message ? e.message : "خطا در انجام درخواست", "err"); }
            finally { setBusy(false); }
          }}
        >
          {busy ? "در حال انجام…" : confirmLabel}
        </button>
      </div>
    </AdminModal>
  );
}
