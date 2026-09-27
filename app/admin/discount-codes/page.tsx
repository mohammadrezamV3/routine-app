"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { ConfirmModal } from "@/components/admin/AdminModal";
import { adminFetch, useAdminToast } from "@/components/admin/useAdminToast";
import { formatDateTime, formatNumber } from "@/lib/adminFormat";
import { NumberInput } from "@/components/NumberInput";

type DiscountCodeRow = {
  id: string; code: string; percentOff: number; planKey: string | null;
  expiresAt: string | null; active: boolean; createdAt: string; maxUsesPerUser: number | null;
};
type PlanOption = { key: string; nameFa: string };
type Resp = { codes: DiscountCodeRow[]; plans: PlanOption[] };

const CODE_RE = /^[A-Z0-9_-]{3,32}$/;

// اعتبارسنجی سمت کلاینت فقط برای پیام سریع‌تره — تصمیم نهایی همیشه
// POST /api/admin/discount-codes می‌گیره.
function validate(code: string, percentOff: string, expiresAt: string, maxUses: string): string | null {
  const c = code.trim().toUpperCase();
  if (!CODE_RE.test(c)) return "کد باید ۳ تا ۳۲ کاراکتر و فقط حروف انگلیسی، عدد، - و _ باشد";
  const p = Number(percentOff);
  if (!percentOff || !Number.isInteger(p) || p < 1 || p > 100) return "درصد تخفیف باید عددی بین ۱ تا ۱۰۰ باشد";
  if (expiresAt) {
    const t = new Date(expiresAt).getTime();
    if (isNaN(t)) return "تاریخ انقضا معتبر نیست";
    if (t <= Date.now()) return "تاریخ انقضا باید در آینده باشد";
  }
  if (maxUses && (!Number.isInteger(Number(maxUses)) || Number(maxUses) < 1)) return "حداکثر مصرف باید عدد صحیح حداقل ۱ باشد";
  return null;
}

export default function AdminDiscountCodesPage() {
  const toast = useAdminToast();
  const [data, setData] = useState<Resp | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [percentOff, setPercentOff] = useState("10");
  const [planKey, setPlanKey] = useState(""); // "" = همه‌ی پکیج‌ها
  const [expiresAt, setExpiresAt] = useState("");
  const [maxUsesPerUser, setMaxUsesPerUser] = useState(""); // "" = بدون محدودیت
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DiscountCodeRow | null>(null);

  const load = useCallback(() => {
    adminFetch<Resp>("/api/admin/discount-codes")
      .then((d) => { setData(d); setLoadError(null); })
      .catch((e) => setLoadError(e.message));
  }, []);
  useEffect(load, [load]);

  async function create() {
    if (creating) return;
    const invalid = validate(code, percentOff, expiresAt, maxUsesPerUser);
    if (invalid) { setError(invalid); return; }
    setCreating(true);
    setError(null);
    try {
      await adminFetch("/api/admin/discount-codes", {
        method: "POST",
        json: {
          code: code.trim().toUpperCase(),
          percentOff: Number(percentOff),
          planKey: planKey || null,
          // مقدار datetime-local وقتِ محلیِ مرورگره؛ اگه خام فرستاده بشه سرور
          // (UTC) اون رو به‌وقتِ خودش می‌خونه و انقضا ۳:۳۰ جابه‌جا می‌شه.
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          maxUsesPerUser: maxUsesPerUser ? Number(maxUsesPerUser) : null,
        },
      });
      toast(`کد ${code.trim().toUpperCase()} ساخته شد`);
      setCode("");
      setPercentOff("10");
      setPlanKey("");
      setExpiresAt("");
      setMaxUsesPerUser("");
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function remove(row: DiscountCodeRow) {
    try {
      await adminFetch(`/api/admin/discount-codes/${row.id}`, { method: "DELETE" });
      toast(`کد ${row.code} حذف شد`);
      setPendingDelete(null);
      load();
    } catch (e: any) {
      toast(e.message, "err");
    }
  }

  const plans = data?.plans || [];

  return (
    <section>
      <div className="admin-chart-card">
        <div className="admin-chart-head"><span className="admin-chart-title">ساخت کد تخفیف جدید</span></div>
        <form onSubmit={(e) => { e.preventDefault(); create(); }} noValidate>
          <div className="admin-form-grid">
            <label className="admin-field">
              <span>کد</span>
              <input
                className="admin-input mono admin-ltr" dir="ltr" maxLength={32}
                value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="SUMMER40"
                autoComplete="off" spellCheck={false}
              />
            </label>
            <label className="admin-field">
              <span>درصد تخفیف</span>
              <NumberInput className="admin-input admin-ltr" dir="ltr" maxLength={3} value={percentOff} onChange={setPercentOff} placeholder="1–100" />
            </label>
            <label className="admin-field">
              <span>پکیج</span>
              <select className="admin-input" value={planKey} onChange={(e) => setPlanKey(e.target.value)}>
                <option value="">همه‌ی پکیج‌ها</option>
                {plans.map((p) => <option key={p.key} value={p.key}>{p.nameFa}</option>)}
              </select>
            </label>
            <label className="admin-field">
              <span>انقضا (اختیاری)</span>
              <input className="admin-input" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </label>
            <label className="admin-field">
              <span>حداکثر مصرف برای هر کاربر (اختیاری)</span>
              <NumberInput className="admin-input" maxLength={6} value={maxUsesPerUser} onChange={setMaxUsesPerUser} placeholder="بدون محدودیت" />
            </label>
          </div>
          {error && <div className="admin-form-error" role="alert">{error}</div>}
          <div className="admin-modal-actions">
            <button type="submit" className="admin-btn primary" disabled={creating || !code.trim()}>
              {creating ? "در حال ساخت…" : "ساخت کد"}
            </button>
          </div>
        </form>
      </div>

      <div className="admin-chart-card">
        <div className="admin-chart-head"><span className="admin-chart-title">کدهای تخفیف</span></div>
        {loadError && !data ? (
          <EmptyState message={loadError} />
        ) : !data ? (
          <div className="admin-empty is-loading">در حال بارگذاری…</div>
        ) : data.codes.length === 0 ? (
          <EmptyState message="هنوز کد تخفیفی ساخته نشده" />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>کد</th><th>درصد</th><th>پکیج</th><th>انقضا</th><th>حداکثر/کاربر</th><th>وضعیت</th><th>ساخته‌شده</th><th aria-label="عملیات" /></tr></thead>
              <tbody>
                {data.codes.map((c) => {
                  const expired = c.expiresAt ? new Date(c.expiresAt).getTime() < Date.now() : false;
                  return (
                    <tr key={c.id}>
                      <td className="mono admin-ltr">{c.code}</td>
                      <td className="admin-ltr">{c.percentOff}%</td>
                      <td>{c.planKey ? (plans.find((p) => p.key === c.planKey)?.nameFa || c.planKey) : "همه‌ی پکیج‌ها"}</td>
                      <td className={c.expiresAt ? "admin-ltr" : "admin-muted"}>{c.expiresAt ? formatDateTime(c.expiresAt) : "بدون انقضا"}</td>
                      <td className={c.maxUsesPerUser == null ? "admin-muted" : undefined}>{c.maxUsesPerUser == null ? "بدون محدودیت" : formatNumber(c.maxUsesPerUser)}</td>
                      <td>
                        {!c.active ? <span className="admin-badge gray">غیرفعال</span>
                          : expired ? <span className="admin-badge amber">منقضی‌شده</span>
                          : <span className="admin-badge green">فعال</span>}
                      </td>
                      <td className="admin-ltr">{formatDateTime(c.createdAt)}</td>
                      <td className="admin-cell-actions">
                        <button type="button" className="admin-btn danger sm" onClick={() => setPendingDelete(c)} aria-label={`حذف ${c.code}`} title="حذف">
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

      {pendingDelete && (
        <ConfirmModal
          title="حذف کد تخفیف"
          message={<>کد <b className="mono">{pendingDelete.code}</b> برای همیشه حذف می‌شه و دیگه در چک‌اوت قبول نمی‌شه. تخفیف‌هایی که قبلا با این کد اعمال شدن دست نمی‌خورن.</>}
          confirmLabel="حذف کد"
          onConfirm={() => remove(pendingDelete)}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </section>
  );
}
