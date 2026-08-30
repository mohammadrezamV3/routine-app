"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/admin/EmptyState";
import { formatDateTime } from "@/lib/adminFormat";

type SettingsResp = { aiCostRate: { inputPer1kUsdMicros: number; outputPer1kUsdMicros: number }; defaultAiCostRate: { inputPer1kUsdMicros: number; outputPer1kUsdMicros: number } };
type AuditRow = { id: string; action: string; targetType: string | null; targetId: string | null; createdAt: string; actor: { name: string | null; lastName: string | null; username: string | null } | null };

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsResp | null>(null);
  const [inputRate, setInputRate] = useState("");
  const [outputRate, setOutputRate] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [audit, setAudit] = useState<AuditRow[] | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings").then((r) => r.json()).then((d: SettingsResp) => {
      setSettings(d);
      setInputRate(String(d.aiCostRate.inputPer1kUsdMicros));
      setOutputRate(String(d.aiCostRate.outputPer1kUsdMicros));
    });
    fetch("/api/admin/audit-log?pageSize=15").then((r) => r.json()).then((d) => setAudit(d.entries));
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputPer1kUsdMicros: Number(inputRate), outputPer1kUsdMicros: Number(outputRate) }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      fetch("/api/admin/audit-log?pageSize=15").then((r) => r.json()).then((d) => setAudit(d.entries));
    }
  }

  async function seedWeeklyReportTestData() {
    if (seeding) return;
    setSeeding(true);
    setSeedResult(null);
    setSeedError(null);
    try {
      const res = await fetch("/api/admin/weekly-report/seed-test-data", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setSeedError(data.error || "خطایی پیش اومد"); return; }
      setSeedResult(`${data.weeksSeeded} هفته داده‌ی نمونه برای هر ۵ بخش ساخته شد.`);
    } catch {
      setSeedError("مشکلی در اتصال به سرور پیش اومد");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <section>
      <div className="admin-chart-card">
        <div className="admin-chart-head"><span className="admin-chart-title">تستِ گزارشِ هفتگی</span></div>
        <div className="admin-section-hint" style={{ marginTop: 0 }}>
          داده‌ی مصنوعیِ ۱۰هفته‌ای (روتین/بدنسازی/ترید/یادگیری/تغذیه) روی همین حسابِ سوپریوزر می‌سازه تا Trend/Streak/Correlation واقعاً چیزی برای نمایش داشته باشن.
          ⚠️ داده‌های واقعیِ همین حساب در همین بازه‌ی ۱۰هفته‌ای پاک و با داده‌ی نمونه جایگزین می‌شن.
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" className="admin-btn primary" onClick={seedWeeklyReportTestData} disabled={seeding}>
            {seeding ? "در حال ساختِ داده…" : "ساختِ داده‌ی تست"}
          </button>
          <Link href="/report/weekly" className="admin-btn" style={{ textDecoration: "none", display: "inline-flex" }}>دیدنِ گزارشِ هفتگی</Link>
        </div>
        {seedResult && <div className="admin-section-hint" style={{ color: "#3FAE6B", marginTop: 10 }}>{seedResult}</div>}
        {seedError && <div className="admin-section-hint" style={{ color: "#E05252", marginTop: 10 }}>{seedError}</div>}
      </div>

      <div className="admin-chart-card">
        <div className="admin-chart-head"><span className="admin-chart-title">نرخ تخمین هزینه AI</span></div>
        <div className="admin-section-hint" style={{ marginTop: 0 }}>
          به میکرو-دلار به‌ازای هر ۱۰۰۰ توکن — پیش‌فرض بر اساس نرخِ عمومیِ gpt-4o-mini ({settings ? settings.defaultAiCostRate.inputPer1kUsdMicros : "…"}/{settings ? settings.defaultAiCostRate.outputPer1kUsdMicros : "…"}).
        </div>
        {!settings ? (
          <div className="admin-empty">در حال بارگذاری…</div>
        ) : (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div>
              <label style={{ fontSize: 11.5, color: "var(--adm-muted)", display: "block", marginBottom: 5 }}>نرخ ورودی (میکرو-دلار/۱۰۰۰ توکن)</label>
              <input className="admin-input" type="number" min={0} value={inputRate} onChange={(e) => setInputRate(e.target.value)} style={{ width: 180 }} />
            </div>
            <div>
              <label style={{ fontSize: 11.5, color: "var(--adm-muted)", display: "block", marginBottom: 5 }}>نرخ خروجی (میکرو-دلار/۱۰۰۰ توکن)</label>
              <input className="admin-input" type="number" min={0} value={outputRate} onChange={(e) => setOutputRate(e.target.value)} style={{ width: 180 }} />
            </div>
            <button type="button" className="admin-btn primary" onClick={save} disabled={saving}>
              {saving ? "در حال ذخیره…" : saved ? "ذخیره شد ✓" : "ذخیره"}
            </button>
          </div>
        )}
      </div>

      <div className="admin-chart-card">
        <div className="admin-chart-head"><span className="admin-chart-title">فعالیت اخیر Owner</span></div>
        {!audit ? (
          <div className="admin-empty">در حال بارگذاری…</div>
        ) : audit.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>اقدام</th><th>هدف</th><th>توسط</th><th>زمان</th></tr></thead>
              <tbody>
                {audit.map((a) => (
                  <tr key={a.id}>
                    <td className="mono" style={{ direction: "ltr", textAlign: "right" }}>{a.action}</td>
                    <td>{a.targetType ? `${a.targetType}${a.targetId ? ` #${a.targetId.slice(0, 8)}` : ""}` : "—"}</td>
                    <td>{a.actor ? [a.actor.name, a.actor.lastName].filter(Boolean).join(" ") || a.actor.username : "—"}</td>
                    <td style={{ direction: "ltr", textAlign: "right" }}>{formatDateTime(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
