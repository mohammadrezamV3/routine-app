"use client";

import { useEffect, useState } from "react";
import { maintenanceDismissKey, type MaintenanceState } from "@/lib/maintenance";
import { formatDateTime } from "@/lib/adminFormat";

// نوار نازک اطلاع‌رسانی تعمیر (تنظیم از /admin/settings). اپ هیچ‌وقت بسته نمی‌شه.
// بعد از mount می‌خونه (SSR چیزی رندر نمی‌کنه) پس وقتی خاموشه هیچ جابه‌جایی چیدمان نیست.
// بستن فقط برای همین نشست (sessionStorage) و با عوض‌شدن پیام دوباره نشون داده می‌شه.
const REFRESH_MS = 5 * 60 * 1000;

function wasDismissed(s: MaintenanceState): boolean {
  try { return sessionStorage.getItem(maintenanceDismissKey(s)) === "1"; } catch { return false; }
}

export function MaintenanceBanner() {
  const [state, setState] = useState<MaintenanceState | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/maintenance");
        if (!r.ok) return;
        const d = (await r.json()) as MaintenanceState;
        if (cancelled) return;
        if (d.enabled && d.message) { setState(d); setHidden(wasDismissed(d)); } else setState(null);
      } catch {
        // شبکه قطع: بنر همون وضعیت قبلی رو نگه می‌داره
      }
    }
    void load();
    const t = setInterval(load, REFRESH_MS);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  if (!state || hidden) return null;

  function dismiss() {
    setHidden(true);
    try { if (state) sessionStorage.setItem(maintenanceDismissKey(state), "1"); } catch { /* حالت خصوصی */ }
  }

  return (
    <div
      role="status"
      style={{
        position: "relative", zIndex: 60, display: "flex", alignItems: "center", gap: 10,
        padding: "6px 16px", fontSize: 13, lineHeight: 1.6, color: "var(--text)",
        background: "var(--box-bg)", borderBottom: "1px solid color-mix(in srgb, var(--sun, #FFB547) 55%, var(--surface-line))",
      }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        {state.message}
        {state.until ? <span style={{ color: "var(--muted)" }}> · تا {formatDateTime(state.until)}</span> : null}
      </span>
      <button type="button" onClick={dismiss} aria-label="بستن"
        style={{ background: "transparent", border: 0, boxShadow: "none", backdropFilter: "none", WebkitBackdropFilter: "none", padding: "2px 6px", color: "var(--muted)", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>
        ×
      </button>
    </div>
  );
}
