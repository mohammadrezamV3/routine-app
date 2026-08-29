"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { formatDateTime } from "@/lib/adminFormat";

type DiscountCodeRow = {
  id: string; code: string; percentOff: number; planKey: string | null;
  expiresAt: string | null; active: boolean; createdAt: string;
};
type PlanOption = { key: string; nameFa: string };
type Resp = { codes: DiscountCodeRow[]; plans: PlanOption[] };

export default function AdminDiscountCodesPage() {
  const [data, setData] = useState<Resp | null>(null);
  const [code, setCode] = useState("");
  const [percentOff, setPercentOff] = useState("10");
  const [planKey, setPlanKey] = useState(""); // "" = همه‌ی پکیج‌ها
  const [expiresAt, setExpiresAt] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/discount-codes").then((r) => r.json()).then(setData);
  }
  useEffect(load, []);

  async function create() {
    setCreating(true);
    setError(null);
    const res = await fetch("/api/admin/discount-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        percentOff: Number(percentOff),
        planKey: planKey || null,
        expiresAt: expiresAt || null,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok) {
      setError(body.error || "خطایی پیش آمد");
      return;
    }
    setCode("");
    setPercentOff("10");
    setPlanKey("");
    setExpiresAt("");
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/admin/discount-codes/${id}`, { method: "DELETE" });
    load();
  }

  const plans = data?.plans || [];

  return (
    <section>
      <div className="admin-chart-card">
        <div className="admin-chart-head"><span className="admin-chart-title">ساخت کد تخفیف جدید</span></div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <label style={{ fontSize: 11.5, color: "var(--adm-muted)", display: "block", marginBottom: 5 }}>کد</label>
            <input
              className="admin-input mono" dir="ltr" style={{ width: 150, textTransform: "uppercase" }}
              value={code} onChange={(e) => setCode(e.target.value)} placeholder="SUMMER40"
            />
          </div>
          <div>
            <label style={{ fontSize: 11.5, color: "var(--adm-muted)", display: "block", marginBottom: 5 }}>درصد تخفیف</label>
            <input
              className="admin-input" type="number" min={1} max={100} style={{ width: 100 }}
              value={percentOff} onChange={(e) => setPercentOff(e.target.value)}
            />
          </div>
          <div>
            <label style={{ fontSize: 11.5, color: "var(--adm-muted)", display: "block", marginBottom: 5 }}>پکیج</label>
            <select className="admin-input" style={{ width: 170 }} value={planKey} onChange={(e) => setPlanKey(e.target.value)}>
              <option value="">همه‌ی پکیج‌ها</option>
              {plans.map((p) => <option key={p.key} value={p.key}>{p.nameFa}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11.5, color: "var(--adm-muted)", display: "block", marginBottom: 5 }}>انقضا (اختیاری)</label>
            <input
              className="admin-input" type="datetime-local" style={{ width: 190 }}
              value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
          <button type="button" className="admin-btn primary" onClick={create} disabled={creating || !code.trim()}>
            {creating ? "در حال ساخت…" : "ساخت کد"}
          </button>
        </div>
        {error && <div className="admin-section-hint" style={{ color: "#E05252", marginTop: 10 }}>{error}</div>}
      </div>

      <div className="admin-chart-card">
        <div className="admin-chart-head"><span className="admin-chart-title">کدهای تخفیف</span></div>
        {!data ? (
          <div className="admin-empty">در حال بارگذاری…</div>
        ) : data.codes.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>کد</th><th>درصد</th><th>پکیج</th><th>انقضا</th><th>وضعیت</th><th>ساخته‌شده</th><th></th></tr></thead>
              <tbody>
                {data.codes.map((c) => {
                  const expired = c.expiresAt ? new Date(c.expiresAt).getTime() < Date.now() : false;
                  return (
                    <tr key={c.id}>
                      <td className="mono" style={{ direction: "ltr", textAlign: "right" }}>{c.code}</td>
                      <td>{c.percentOff}٪</td>
                      <td>{c.planKey ? (plans.find((p) => p.key === c.planKey)?.nameFa || c.planKey) : "همه‌ی پکیج‌ها"}</td>
                      <td style={{ direction: "ltr", textAlign: "right" }}>{c.expiresAt ? formatDateTime(c.expiresAt) : "بدون انقضا"}</td>
                      <td>{!c.active ? "غیرفعال" : expired ? "منقضی‌شده" : "فعال"}</td>
                      <td style={{ direction: "ltr", textAlign: "right" }}>{formatDateTime(c.createdAt)}</td>
                      <td>
                        <button type="button" className="admin-btn danger" style={{ padding: "6px 8px" }} onClick={() => remove(c.id)} aria-label="حذف">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
