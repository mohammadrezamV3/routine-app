"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminFetch, useAdminToast } from "@/components/admin/useAdminToast";
import { ConfirmModal } from "@/components/admin/AdminModal";
import { NumberInput } from "@/components/NumberInput";
import { TickOption } from "@/components/TickOption";
import {
  DURATIONS, Duration, PAID_PLAN_KEYS, PLAN_NAMES_FA, PRICING_LIMITS, PaidPlanKey, PricingConfig,
  discountPercentOf, priceFromDiscount, validatePricingConfig,
} from "@/lib/planPricing";
import { invalidatePlanPricing } from "@/lib/usePlanPricing";

type Payload = { pricing: PricingConfig; defaults: PricingConfig; saved: boolean };

const fmt = (n: number) => (n ? n.toLocaleString("en-US") : "");
const toInt = (v: string) => (v ? parseInt(v, 10) : 0);
const pctKey = (plan: PaidPlanKey, d: Duration) => `${plan}:${d}`;

// قیمت پلن‌ها، مدت‌ها و تخفیف‌ها — همون پیکربندی‌ای که چک‌اوت سمت سرور
// مبلغ واقعی پرداخت رو ازش حساب می‌کنه و همه‌ی صفحه‌های قیمت ازش می‌خونن.
export default function AdminPricingPage() {
  const toast = useAdminToast();
  const [data, setData] = useState<Payload | null>(null);
  const [draft, setDraft] = useState<PricingConfig | null>(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  // متن در حال تایپ درصد تخفیف (مثلا «12.») — تا عدد مشتق‌شده وسط تایپ جاش رو نگیره
  const [pctDraft, setPctDraft] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    setFailed(false);
    adminFetch<Payload>("/api/admin/pricing")
      .then((d) => { setData(d); setDraft(d.pricing); })
      .catch((e) => { setFailed(true); toast(e.message, "err"); });
  }, [toast]);
  useEffect(load, [load]);

  const dirty = useMemo(() => !!data && !!draft && JSON.stringify(data.pricing) !== JSON.stringify(draft), [data, draft]);
  const validation = useMemo(() => (draft ? validatePricingConfig(draft) : null), [draft]);

  function setDuration(d: Duration, patch: Partial<PricingConfig["durations"][Duration]>) {
    setDraft((c) => (c ? { ...c, durations: { ...c.durations, [d]: { ...c.durations[d], ...patch } } } : c));
  }

  function setCell(plan: PaidPlanKey, d: Duration, patch: Partial<PricingConfig["plans"][PaidPlanKey][Duration]>) {
    setDraft((c) => (c ? { ...c, plans: { ...c.plans, [plan]: { ...c.plans[plan], [d]: { ...c.plans[plan][d], ...patch } } } } : c));
  }

  function setPercent(plan: PaidPlanKey, d: Duration, raw: string) {
    setPctDraft((m) => ({ ...m, [pctKey(plan, d)]: raw }));
    const original = draft?.plans[plan][d].original ?? 0;
    const pct = parseFloat(raw);
    if (original > 0 && Number.isFinite(pct) && pct >= 0 && pct < 100) setCell(plan, d, { price: priceFromDiscount(original, pct) });
  }

  async function save() {
    if (!draft || saving) return;
    const v = validatePricingConfig(draft);
    if (!v.ok) { toast(v.error, "err"); return; }
    setSaving(true);
    try {
      const d = await adminFetch<{ pricing: PricingConfig; saved: boolean }>("/api/admin/pricing", { method: "PUT", json: { pricing: v.config } });
      setData((p) => (p ? { ...p, pricing: d.pricing, saved: d.saved } : p));
      setDraft(d.pricing);
      setPctDraft({});
      invalidatePlanPricing();
      toast("قیمت‌ها ذخیره شد");
    } catch (e: any) {
      toast(e.message, "err");
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    const d = await adminFetch<{ pricing: PricingConfig; saved: boolean }>("/api/admin/pricing", { method: "DELETE" });
    setData((p) => (p ? { ...p, pricing: d.pricing, saved: d.saved } : p));
    setDraft(d.pricing);
    setPctDraft({});
    invalidatePlanPricing();
    setConfirmReset(false);
    toast("قیمت‌ها به پیش‌فرض برگشت");
  }

  return (
    <section>
      <div className="admin-page-head">
        <div>
          <div className="admin-page-kicker">قیمت پلن‌ها</div>
          <div className="admin-section-hint admin-page-sub">
            همه‌ی مبلغ‌ها به تومان. پرداخت‌های جدید همون لحظه با قیمت ذخیره‌شده حساب می‌شن و صفحه‌های قیمت حداکثر تا یک دقیقه به‌روز می‌شن.
            {data && (data.saved ? " الان قیمت‌های ذخیره‌شده‌ی پنل فعالن." : " الان قیمت‌های پیش‌فرض فعالن.")}
          </div>
        </div>
      </div>

      {!draft || !data ? (
        failed ? (
          <div className="admin-empty">
            <span>خطا در دریافت اطلاعات</span>
            <button type="button" className="admin-btn sm" onClick={load}>تلاش دوباره</button>
          </div>
        ) : <div className="admin-empty is-loading">در حال بارگذاری…</div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
          <div className="admin-chart-card">
            <div className="admin-chart-head"><span className="admin-chart-title">مدت‌های اشتراک</span></div>
            <div className="admin-section-hint admin-settings-hint">
              تعداد ماه هر مدت ({PRICING_LIMITS.minMonths} تا {PRICING_LIMITS.maxMonths}) و این‌که برای خرید نمایش داده بشه یا نه. حداقل یک مدت باید فعال بمونه.
            </div>
            <div className="admin-form-grid">
              {DURATIONS.map((d, i) => (
                <div key={d} className="admin-field">
                  <span>مدت {i + 1} (پیش‌فرض {data.defaults.durations[d].months} ماهه)</span>
                  <NumberInput
                    className="admin-input admin-ltr" dir="ltr" maxLength={2} aria-label={`تعداد ماه مدت ${i + 1}`}
                    value={draft.durations[d].months ? String(draft.durations[d].months) : ""}
                    onChange={(v) => setDuration(d, { months: toInt(v) })}
                  />
                  <TickOption checked={draft.durations[d].enabled} onChange={(on) => setDuration(d, { enabled: on })}>
                    فعال برای خرید
                  </TickOption>
                </div>
              ))}
            </div>
          </div>

          {PAID_PLAN_KEYS.map((plan) => (
            <div key={plan} className="admin-chart-card">
              <div className="admin-chart-head"><span className="admin-chart-title">{PLAN_NAMES_FA[plan]}</span></div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>مدت</th>
                      <th>قیمت قبل از تخفیف (خط‌خورده)</th>
                      <th>تخفیف ٪</th>
                      <th>قیمت نهایی (پرداختی)</th>
                      <th>پیش‌فرض (تومان)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DURATIONS.map((d) => {
                      const cell = draft.plans[plan][d];
                      const def = data.defaults.plans[plan][d];
                      const key = pctKey(plan, d);
                      const pct = discountPercentOf(cell);
                      const dur = draft.durations[d];
                      return (
                        <tr key={d} style={dur.enabled ? undefined : { opacity: 0.5 }}>
                          <td>{dur.months || "?"} ماهه{dur.enabled ? "" : " (غیرفعال)"}</td>
                          <td>
                            <NumberInput
                              className="admin-input admin-ltr" dir="ltr" maxLength={13} style={{ width: 150 }}
                              aria-label={`قیمت قبل از تخفیف ${PLAN_NAMES_FA[plan]} ${dur.months} ماهه`}
                              placeholder="بدون تخفیف"
                              value={fmt(cell.original)}
                              onChange={(v) => { setCell(plan, d, { original: toInt(v) }); setPctDraft((m) => { const n = { ...m }; delete n[key]; return n; }); }}
                            />
                          </td>
                          <td>
                            <NumberInput
                              decimal className="admin-input admin-ltr" dir="ltr" maxLength={5} style={{ width: 80 }}
                              aria-label={`درصد تخفیف ${PLAN_NAMES_FA[plan]} ${dur.months} ماهه`}
                              disabled={!cell.original}
                              value={pctDraft[key] ?? (pct ? String(pct) : "")}
                              onChange={(v) => setPercent(plan, d, v)}
                              onBlur={() => setPctDraft((m) => { const n = { ...m }; delete n[key]; return n; })}
                            />
                          </td>
                          <td>
                            <NumberInput
                              className="admin-input admin-ltr" dir="ltr" maxLength={13} style={{ width: 150 }}
                              aria-label={`قیمت نهایی ${PLAN_NAMES_FA[plan]} ${dur.months} ماهه`}
                              value={fmt(cell.price)}
                              onChange={(v) => { setCell(plan, d, { price: toInt(v) }); setPctDraft((m) => { const n = { ...m }; delete n[key]; return n; }); }}
                            />
                          </td>
                          <td className="admin-ltr">
                            {fmt(def.price)}
                            {def.original ? <span style={{ textDecoration: "line-through", opacity: 0.6, marginInlineStart: 6 }}>{fmt(def.original)}</span> : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {validation && !validation.ok && dirty && <div className="admin-form-error" role="alert">{validation.error}</div>}
          <div className="admin-modal-actions">
            <button type="button" className="admin-btn danger" onClick={() => setConfirmReset(true)} disabled={saving || !data.saved}>
              بازگشت به پیش‌فرض
            </button>
            <button type="button" className="admin-btn" onClick={() => { setDraft(data.pricing); setPctDraft({}); }} disabled={saving || !dirty}>
              لغو تغییرات
            </button>
            <button type="submit" className="admin-btn primary" disabled={saving || !dirty || !validation?.ok}>
              {saving ? "در حال ذخیره…" : "ذخیره"}
            </button>
          </div>
        </form>
      )}

      {confirmReset && (
        <ConfirmModal
          title="بازگشت به قیمت‌های پیش‌فرض"
          message="قیمت‌ها، مدت‌ها و تخفیف‌های ذخیره‌شده پاک می‌شن و قیمت‌های پیش‌فرض کد دوباره فعال می‌شن."
          confirmLabel="بازگشت به پیش‌فرض"
          onConfirm={reset}
          onClose={() => setConfirmReset(false)}
        />
      )}
    </section>
  );
}
