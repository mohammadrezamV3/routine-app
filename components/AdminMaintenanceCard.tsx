"use client";

import { useEffect, useState } from "react";
import { adminFetch, useAdminToast } from "@/components/admin/useAdminToast";
import { TickOption } from "@/components/TickOption";
import { toLocalInputValue } from "@/lib/adminFormat";
import { tr } from "@/lib/i18n";
import { MAINTENANCE_MESSAGE_MAX, type MaintenanceState } from "@/lib/maintenance";

// کارت «اطلاع‌رسانی تعمیر» در /admin/settings — فقط نوار بالای اپ؛ اپ بسته نمی‌شود.
export function AdminMaintenanceCard() {
  const toast = useAdminToast();
  const [saved, setSaved] = useState<MaintenanceState | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [until, setUntil] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminFetch<{ maintenance: MaintenanceState }>("/api/admin/maintenance")
      .then(({ maintenance: m }) => {
        setSaved(m); setEnabled(m.enabled); setMessage(m.message); setUntil(m.until ? toLocalInputValue(m.until) : "");
      })
      .catch((e) => setError(e.message));
  }, []);

  async function save() {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const res = await adminFetch<{ maintenance: MaintenanceState }>("/api/admin/maintenance", {
        method: "PUT",
        json: { enabled, message, until: until ? new Date(until).toISOString() : null },
      });
      setSaved(res.maintenance);
      toast(tr("ذخیره شد", "Saved"));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const dirty = !!saved && (enabled !== saved.enabled || message.trim() !== saved.message || (until ? new Date(until).toISOString() : null) !== saved.until);

  return (
    <div className="admin-chart-card">
      <div className="admin-chart-head"><span className="admin-chart-title">{tr("اطلاع‌رسانی تعمیر", "Maintenance notice")}</span></div>
      <div className="admin-section-hint admin-settings-hint">
        {tr("وقتی روشن باشد، یک نوار نازک بالای اپ برای همه‌ی کاربران نشان داده می‌شود؛ اپ بسته نمی‌شود. با رسیدن به زمان پایان خودکار خاموش می‌شود.", "When on, a thin bar is shown at the top of the app for all users; the app isn't closed. It turns off automatically at the end time.")}
      </div>
      {!saved && !error ? (
        <div className="admin-empty is-loading">{tr("در حال بارگذاری…", "Loading…")}</div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); void save(); }} noValidate>
          <TickOption checked={enabled} onChange={setEnabled}>{tr("نوار تعمیر روشن باشد", "Maintenance bar on")}</TickOption>
          <div className="admin-form-grid">
            <label className="admin-field admin-field-full">
              <span>{tr("پیام", "Message")} ({message.length}/{MAINTENANCE_MESSAGE_MAX})</span>
              <input className="admin-input" maxLength={MAINTENANCE_MESSAGE_MAX} value={message} onChange={(e) => setMessage(e.target.value)} />
            </label>
            <label className="admin-field">
              <span>{tr("زمان پایان (اختیاری)", "End time (optional)")}</span>
              <input type="datetime-local" className="admin-input" value={until} onChange={(e) => setUntil(e.target.value)} />
            </label>
          </div>
          {error && <div className="admin-form-error" role="alert">{error}</div>}
          <div className="admin-modal-actions">
            <button type="submit" className="admin-btn primary" disabled={busy || !dirty}>{busy ? tr("در حال ذخیره…", "Saving…") : tr("ذخیره", "Save")}</button>
          </div>
        </form>
      )}
    </div>
  );
}
