"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { AdminUserProfile } from "@/components/AdminUserProfile";

// کشوی پرونده‌ی کاربر: دسکتاپ از سمت شروع (راست در RTL)، موبایل تمام‌صفحه
export function AdminUserDrawer({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  useLockBodyScroll();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !document.querySelector(".modal-panel.open")) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <>
      <div className="au-backdrop" onClick={onClose} />
      <aside className="au-drawer-panel" role="dialog" aria-modal="true" aria-label="پرونده‌ی کاربر" dir="rtl">
        <AdminUserProfile id={id} variant="drawer" onClose={onClose} onChanged={onChanged} />
      </aside>
    </>,
    document.body,
  );
}
