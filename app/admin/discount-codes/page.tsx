"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { ConfirmModal } from "@/components/admin/AdminModal";
import { adminFetch, useAdminToast } from "@/components/admin/useAdminToast";
import { formatDateTime, formatNumber } from "@/lib/adminFormat";
import { NumberInput } from "@/components/NumberInput";
import { planDisplayName } from "@/lib/subscriptionI18n";
import { tr } from "@/lib/i18n";

type DiscountCodeRow = {
  id: string; code: string; percentOff: number; planKey: string | null;
  expiresAt: string | null; active: boolean; createdAt: string; maxUsesPerUser: number | null;
};
type PlanOption = { key: string; nameFa: string; nameEn?: string | null };

// نام پکیج به زبان جاری؛ اگه API نام انگلیسی نفرسته، همون فارسی می‌مونه.
const planName = (p: PlanOption) => planDisplayName(p);
type Resp = { codes: DiscountCodeRow[]; plans: PlanOption[]; eventCodes?: string[] };

const CODE_RE = /^[A-Z0-9_-]{3,32}$/;

// اعتبارسنجی سمت کلاینت فقط برای پیام سریع‌تره — تصمیم نهایی همیشه
// POST /api/admin/discount-codes می‌گیره.
function validate(code: string, percentOff: string, expiresAt: string, maxUses: string): string | null {
  const c = code.trim().toUpperCase();
  if (!CODE_RE.test(c)) return tr("کد باید 3 تا 32 کاراکتر و فقط حروف انگلیسی، عدد، - و _ باشد", "The code must be 3 to 32 characters: English letters, numbers, - and _ only");
  const p = Number(percentOff);
  if (!percentOff || !Number.isInteger(p) || p < 1 || p > 100) return tr("درصد تخفیف باید عددی بین 1 تا 100 باشد", "The discount percentage must be a number from 1 to 100");
  if (expiresAt) {
    const t = new Date(expiresAt).getTime();
    if (isNaN(t)) return tr("تاریخ انقضا معتبر نیست", "The expiry date isn't valid");
    if (t <= Date.now()) return tr("تاریخ انقضا باید در آینده باشد", "The expiry date must be in the future");
  }
  if (maxUses && (!Number.isInteger(Number(maxUses)) || Number(maxUses) < 1)) return tr("حداکثر مصرف باید عدد صحیح حداقل 1 باشد", "The maximum uses must be a whole number, at least 1");
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
          // مقدار datetime-local وقت محلی مرورگره؛ اگه خام فرستاده بشه سرور
          // (UTC) اون رو به‌وقت خودش می‌خونه و انقضا ۳:۳۰ جابه‌جا می‌شه.
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          maxUsesPerUser: maxUsesPerUser ? Number(maxUsesPerUser) : null,
        },
      });
      toast(tr(`کد ${code.trim().toUpperCase()} ساخته شد`, `Code ${code.trim().toUpperCase()} created`));
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

  async function toggle(row: DiscountCodeRow) {
    try {
      await adminFetch(`/api/admin/discount-codes/${row.id}`, { method: "PATCH", json: { active: !row.active } });
      toast(row.active ? tr(`کد ${row.code} قطع شد`, `Code ${row.code} stopped`) : tr(`کد ${row.code} وصل شد`, `Code ${row.code} turned on`));
      load();
    } catch (e: any) {
      toast(e.message, "err");
    }
  }

  async function remove(row: DiscountCodeRow) {
    try {
      await adminFetch(`/api/admin/discount-codes/${row.id}`, { method: "DELETE" });
      toast(tr(`کد ${row.code} حذف شد`, `Code ${row.code} deleted`));
      setPendingDelete(null);
      load();
    } catch (e: any) {
      toast(e.message, "err");
    }
  }

  const plans = data?.plans || [];
  const eventCodes = new Set(data?.eventCodes || []);

  return (
    <section>
      <div className="admin-chart-card">
        <div className="admin-chart-head"><span className="admin-chart-title">{tr("ساخت کد تخفیف جدید", "Create a new discount code")}</span></div>
        <form onSubmit={(e) => { e.preventDefault(); create(); }} noValidate>
          <div className="admin-form-grid">
            <label className="admin-field">
              <span>{tr("کد", "Code")}</span>
              <input
                className="admin-input mono admin-ltr" dir="ltr" maxLength={32}
                value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="SUMMER40"
                autoComplete="off" spellCheck={false}
              />
            </label>
            <label className="admin-field">
              <span>{tr("درصد تخفیف", "Discount %")}</span>
              <NumberInput className="admin-input admin-ltr" dir="ltr" maxLength={3} value={percentOff} onChange={setPercentOff} placeholder="1–100" />
            </label>
            <label className="admin-field">
              <span>{tr("پکیج", "Plan")}</span>
              <select className="admin-input" value={planKey} onChange={(e) => setPlanKey(e.target.value)}>
                <option value="">{tr("همه‌ی پکیج‌ها", "All plans")}</option>
                {plans.map((p) => <option key={p.key} value={p.key}>{planName(p)}</option>)}
              </select>
            </label>
            <label className="admin-field">
              <span>{tr("انقضا (اختیاری)", "Expiry (optional)")}</span>
              <input className="admin-input" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </label>
            <label className="admin-field">
              <span>{tr("حداکثر مصرف برای هر کاربر (اختیاری)", "Max uses per user (optional)")}</span>
              <NumberInput className="admin-input" maxLength={6} value={maxUsesPerUser} onChange={setMaxUsesPerUser} placeholder={tr("بدون محدودیت", "No limit")} />
            </label>
          </div>
          {error && <div className="admin-form-error" role="alert">{error}</div>}
          <div className="admin-modal-actions">
            <button type="submit" className="admin-btn primary" disabled={creating || !code.trim()}>
              {creating ? tr("در حال ساخت…", "Creating…") : tr("ساخت کد", "Create code")}
            </button>
          </div>
        </form>
      </div>

      <div className="admin-chart-card">
        <div className="admin-chart-head"><span className="admin-chart-title">{tr("کدهای تخفیف", "Discount codes")}</span></div>
        {loadError && !data ? (
          <EmptyState message={loadError} />
        ) : !data ? (
          <div className="admin-empty is-loading">{tr("در حال بارگذاری…", "Loading…")}</div>
        ) : data.codes.length === 0 ? (
          <EmptyState message={tr("هنوز کد تخفیفی ساخته نشده", "No discount codes created yet")} />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>{tr("کد", "Code")}</th><th>{tr("درصد", "%")}</th><th>{tr("پکیج", "Plan")}</th><th>{tr("انقضا", "Expiry")}</th><th>{tr("حداکثر/کاربر", "Max/user")}</th><th>{tr("وضعیت", "Status")}</th><th>{tr("ساخته‌شده", "Created")}</th><th aria-label={tr("عملیات", "Actions")} /></tr></thead>
              <tbody>
                {data.codes.map((c) => {
                  const expired = c.expiresAt ? new Date(c.expiresAt).getTime() < Date.now() : false;
                  return (
                    <tr key={c.id}>
                      <td className="mono admin-ltr">
                        {c.code}
                        {eventCodes.has(c.code) && <span className="admin-badge gray" style={{ marginInlineStart: 8 }}>{tr("مناسبت", "Event")}</span>}
                      </td>
                      <td className="admin-ltr">{c.percentOff}%</td>
                      <td>{c.planKey ? (plans.find((p) => p.key === c.planKey) ? planName(plans.find((p) => p.key === c.planKey)!) : c.planKey) : tr("همه‌ی پکیج‌ها", "All plans")}</td>
                      <td className={c.expiresAt ? "admin-ltr" : "admin-muted"}>{c.expiresAt ? formatDateTime(c.expiresAt) : tr("بدون انقضا", "No expiry")}</td>
                      <td className={c.maxUsesPerUser == null ? "admin-muted" : undefined}>{c.maxUsesPerUser == null ? tr("بدون محدودیت", "No limit") : formatNumber(c.maxUsesPerUser)}</td>
                      <td>
                        {!c.active ? <span className="admin-badge gray">{tr("غیرفعال", "Inactive")}</span>
                          : expired ? <span className="admin-badge amber">{tr("منقضی‌شده", "Expired")}</span>
                          : <span className="admin-badge green">{tr("فعال", "Active")}</span>}
                      </td>
                      <td className="admin-ltr">{formatDateTime(c.createdAt)}</td>
                      <td className="admin-cell-actions">
                        <button type="button" className="admin-btn sm" onClick={() => toggle(c)}>{c.active ? tr("قطع", "Stop") : tr("وصل", "On")}</button>
                        <button type="button" className="admin-btn danger sm" onClick={() => setPendingDelete(c)} aria-label={tr(`حذف ${c.code}`, `Delete ${c.code}`)} title={tr("حذف", "Delete")}>
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
          title={tr("حذف کد تخفیف", "Delete discount code")}
          message={<>{tr("کد", "Code")} <b className="mono">{pendingDelete.code}</b> {tr("برای همیشه حذف می‌شه و دیگه در چک‌اوت قبول نمی‌شه. تخفیف‌هایی که قبلا با این کد اعمال شدن دست نمی‌خورن.", "will be deleted permanently and will no longer be accepted at checkout. Discounts already applied with this code are not changed.")}</>}
          confirmLabel={tr("حذف کد", "Delete code")}
          onConfirm={() => remove(pendingDelete)}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </section>
  );
}
