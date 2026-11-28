"use client";

import "./sleep-log.css";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { SleepNightDetail } from "./SleepNightDetail";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { useSheetFocus } from "@/lib/useSheetFocus";
import { isEn, tr } from "@/lib/i18n";
import type { SleepRecord } from "@/lib/sleep";

// جزئیات یک شب در پنجره‌ی جمع‌وجور (به‌جای باز شدن داخل کارت هفت شب، تا صفحه‌ی
// خواب توی یک صفحه جا بشه). همون SleepNightDetail با دکمه‌ی ویرایش.

export function SleepNightSheet(props: {
  rec: SleepRecord;
  goalMin: number;
  targetBed: string | null;
  title: string;
  badge: string | null;
  onClose: () => void;
  onEdit: () => void;
}) {
  if (typeof document === "undefined") return null;
  return createPortal(<Body {...props} />, document.body);
}

function Body({ rec, goalMin, targetBed, title, badge, onClose, onEdit }: Parameters<typeof SleepNightSheet>[0]) {
  useLockBodyScroll();
  const panelRef = useRef<HTMLDivElement>(null);
  useSheetFocus(panelRef);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <>
      <div className="modal-overlay open" onClick={onClose} />
      <div ref={panelRef} tabIndex={-1} className="modal-panel liquid-glass-panel open sleep-scope slg-panel" role="dialog" aria-modal="true" aria-label={title} dir={isEn() ? "ltr" : "rtl"}>
        <div className="modal-head">
          <div className="modal-title">{tr("جزئیات شب", "Night details")}</div>
          <button className="nav-close" onClick={onClose} aria-label={tr("بستن", "Close")}>×</button>
        </div>
        <div className="slg-body">
          <SleepNightDetail rec={rec} goalMin={goalMin} targetBed={targetBed} title={title} badge={badge} onEdit={onEdit} />
        </div>
      </div>
    </>
  );
}
