"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminFetch, useAdminToast } from "@/components/admin/useAdminToast";
import { ConfirmModal } from "@/components/admin/AdminModal";
import { NumberInput } from "@/components/NumberInput";
import { TickOption } from "@/components/TickOption";
import {
  DURATIONS, Duration, PAID_PLAN_KEYS, PRICING_LIMITS, PaidPlanKey, PricingConfig,
  discountPercentOf, planNameLabel, priceFromDiscount, validatePricingConfig,
} from "@/lib/planPricing";
import { invalidatePlanPricing } from "@/lib/usePlanPricing";
import { tr } from "@/lib/i18n";

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
      toast(tr("قیمت‌ها ذخیره شد", "Prices saved"));
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
    toast(tr("قیمت‌ها به پیش‌فرض برگشت", "Prices reverted to defaults"));
  }

  return (
    <section>
      <div className="admin-page-head">
        <div>
          <div className="admin-page-kicker">{tr("قیمت پلن‌ها", "Plan pricing")}</div>
          <div className="admin-section-hint admin-page-sub">
            {tr("همه‌ی مبلغ‌ها به تومان. پرداخت‌های جدید همون لحظه با قیمت ذخیره‌شده حساب می‌شن و صفحه‌های قیمت حداکثر تا یک دقیقه به‌روز می‌شن.", "All amounts are in toman. New payments are calculated with the saved price right away, and pricing pages update within a minute.")}
            {data && (data.saved ? tr(" الان قیمت‌های ذخیره‌شده‌ی پنل فعالن.", " The prices saved in the panel are active now.") : tr(" الان قیمت‌های پیش‌فرض فعالن.", " The default prices are active now."))}
          </div>
        </div>
      </div>

      {!draft || !data ? (
        failed ? (
          <div className="admin-empty">
            <span>{tr("خطا در دریافت اطلاعات", "Couldn't load the data")}</span>
            <button type="button" className="admin-btn sm" onClick={load}>{tr("تلاش دوباره", "Try again")}</button>
          </div>
        ) : <div className="admin-empty is-loading">{tr("در حال بارگذاری…", "Loading…")}</div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
          <div className="admin-chart-card">
            <div className="admin-chart-head"><span className="admin-chart-title">{tr("مدت‌های اشتراک", "Subscription durations")}</span></div>
            <div className="admin-section-hint admin-settings-hint">
              {tr(`تعداد ماه هر مدت (${PRICING_LIMITS.minMonths} تا ${PRICING_LIMITS.maxMonths}) و این‌که برای خرید نمایش داده بشه یا نه. حداقل یک مدت باید فعال بمونه.`, `Number of months for each duration (${PRICING_LIMITS.minMonths} to ${PRICING_LIMITS.maxMonths}), and whether it's shown for purchase. At least one duration must stay active.`)}
            </div>
            <div className="admin-form-grid">
              {DURATIONS.map((d, i) => (
                <div key={d} className="admin-field">
                  <span>{tr(`مدت ${i + 1} (پیش‌فرض ${data.defaults.durations[d].months} ماهه)`, `Duration ${i + 1} (default ${data.defaults.durations[d].months} months)`)}</span>
                  <NumberInput
                    className="admin-input admin-ltr" dir="ltr" maxLength={2} aria-label={tr(`تعداد ماه مدت ${i + 1}`, `Months for duration ${i + 1}`)}
                    value={draft.durations[d].months ? String(draft.durations[d].months) : ""}
                    onChange={(v) => setDuration(d, { months: toInt(v) })}
                  />
                  <TickOption checked={draft.durations[d].enabled} onChange={(on) => setDuration(d, { enabled: on })}>
                    {tr("فعال برای خرید", "Active for purchase")}
                  </TickOption>
                </div>
              ))}
            </div>
          </div>

          {PAID_PLAN_KEYS.map((plan) => (
            <div key={plan} className="admin-chart-card">
              <div className="admin-chart-head"><span className="admin-chart-title">{planNameLabel(plan)}</span></div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{tr("مدت", "Duration")}</th>
                      <th>{tr("قیمت قبل از تخفیف (خط‌خورده)", "Price before discount (struck through)")}</th>
                      <th>{tr("تخفیف ٪", "Discount %")}</th>
                      <th>{tr("قیمت نهایی (پرداختی)", "Final price (paid)")}</th>
                      <th>{tr("پیش‌فرض (تومان)", "Default (toman)")}</th>
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
                          <td>{tr(`${dur.months || "?"} ماهه${dur.enabled ? "" : " (غیرفعال)"}`, `${dur.months || "?"} months${dur.enabled ? "" : " (inactive)"}`)}</td>
                          <td>
                            <NumberInput
                              className="admin-input admin-ltr" dir="ltr" maxLength={13} style={{ width: 150 }}
                              aria-label={tr(`قیمت قبل از تخفیف ${planNameLabel(plan)} ${dur.months} ماهه`, `Pre-discount price, ${planNameLabel(plan)} ${dur.months} months`)}
                              placeholder={tr("بدون تخفیف", "No discount")}
                              value={fmt(cell.original)}
                              onChange={(v) => { setCell(plan, d, { original: toInt(v) }); setPctDraft((m) => { const n = { ...m }; delete n[key]; return n; }); }}
                            />
                          </td>
                          <td>
                            <NumberInput
                              decimal className="admin-input admin-ltr" dir="ltr" maxLength={5} style={{ width: 80 }}
                              aria-label={tr(`درصد تخفیف ${planNameLabel(plan)} ${dur.months} ماهه`, `Discount %, ${planNameLabel(plan)} ${dur.months} months`)}
                              disabled={!cell.original}
                              value={pctDraft[key] ?? (pct ? String(pct) : "")}
                              onChange={(v) => setPercent(plan, d, v)}
                              onBlur={() => setPctDraft((m) => { const n = { ...m }; delete n[key]; return n; })}
                            />
                          </td>
                          <td>
                            <NumberInput
                              className="admin-input admin-ltr" dir="ltr" maxLength={13} style={{ width: 150 }}
                              aria-label={tr(`قیمت نهایی ${planNameLabel(plan)} ${dur.months} ماهه`, `Final price, ${planNameLabel(plan)} ${dur.months} months`)}
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
              {tr("بازگشت به پیش‌فرض", "Revert to defaults")}
            </button>
            <button type="button" className="admin-btn" onClick={() => { setDraft(data.pricing); setPctDraft({}); }} disabled={saving || !dirty}>
              {tr("لغو تغییرات", "Discard changes")}
            </button>
            <button type="submit" className="admin-btn primary" disabled={saving || !dirty || !validation?.ok}>
              {saving ? tr("در حال ذخیره…", "Saving…") : tr("ذخیره", "Save")}
            </button>
          </div>
        </form>
      )}

      {confirmReset && (
        <ConfirmModal
          title={tr("بازگشت به قیمت‌های پیش‌فرض", "Revert to default prices")}
          message={tr("قیمت‌ها، مدت‌ها و تخفیف‌های ذخیره‌شده پاک می‌شن و قیمت‌های پیش‌فرض کد دوباره فعال می‌شن.", "Saved prices, durations and discounts will be cleared, and the code's default prices will be active again.")}
          confirmLabel={tr("بازگشت به پیش‌فرض", "Revert to defaults")}
          onConfirm={reset}
          onClose={() => setConfirmReset(false)}
        />
      )}
    </section>
  );
}
