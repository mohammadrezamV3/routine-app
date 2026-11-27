"use client";

// آیکون بی‌بک‌گراند «خروجی CSV» معاملات یک حساب (کنار اشتراک کارنامه در
// سرتیتر صفحه‌ی حساب). گیت واقعی سمت سرور: /api/export (TRADE + فلگ trade).
import { useState } from "react";
import { Download } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { downloadExport } from "@/lib/export/download";
import { tr } from "@/lib/i18n";

export function TradeExportButton({ accountId, size = 14 }: { accountId: string; size?: number }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  async function run() {
    if (busy) return;
    setBusy(true); setFailed(null);
    const err = await downloadExport({ module: "trade", format: "csv", accountId });
    setBusy(false);
    if (err) { setFailed(err); window.setTimeout(() => setFailed(null), 4000); }
  }
  const label = failed ?? tr("خروجی CSV معاملات این حساب", "Export this account's trades as CSV");
  return (
    <button type="button" className="trade-icon-btn" onClick={run} disabled={busy} aria-busy={busy || undefined} aria-label={label} title={label}>
      {busy ? <Spinner size={size} label={null} /> : <Download size={size} />}
    </button>
  );
}
