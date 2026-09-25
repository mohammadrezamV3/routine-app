import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import { useNetworkStatus } from "@/lib/useNetworkStatus";
import { MOBILE_BILLING_DURATIONS, type MobileBillingDuration, type MobileBillingPlan } from "@/lib/account-contract";
import { describeAccountError, useAccountApi } from "../api";
import { openCheckoutUrl } from "../browser";
import { DURATION_LABELS, effectiveAmount, formatIsoJalali, formatToman, savePendingCheckout } from "../logic";
import { accountRoutePaths } from "../paths";
import { ErrorBox, Loading, PrimaryButton, SectionTitle } from "../components/Ui";

export default function PlanCheckoutScreen() {
  const { key = "" } = useParams();
  const api = useAccountApi();
  const navigate = useNavigate();
  const online = useNetworkStatus();
  const [plan, setPlan] = useState<MobileBillingPlan | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [duration, setDuration] = useState<MobileBillingDuration>("1");
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState<{ code: string; percent: number } | null>(null);
  const [codeMsg, setCodeMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<"code" | "pay" | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    if (!online) return;
    api.listPlans().then(
      (r) => {
        const p = r.plans.find((x) => x.key === key && !x.free);
        if (!p) setLoadError("این پلن قابل خرید نیست");
        else if (!r.checkoutAvailable) setLoadError("پرداخت هنوز روی سرور فعال نشده — به‌زودی");
        else setPlan(p);
      },
      (e) => setLoadError(describeAccountError(e))
    );
  }, [api, key, online]);

  const price = plan?.prices.find((p) => p.duration === duration) ?? null;
  const percent = discount?.percent ?? 0;

  async function applyCode() {
    const c = code.trim();
    if (!c || !plan) return;
    setBusy("code");
    setCodeMsg(null);
    try {
      const r = await api.previewDiscount(plan.key, c);
      setDiscount({ code: c.toUpperCase(), percent: r.percentOff });
      setCodeMsg(`${r.percentOff}٪ تخفیف اعمال شد`);
    } catch (e) {
      setDiscount(null);
      setCodeMsg(describeAccountError(e));
    } finally {
      setBusy(null);
    }
  }

  async function pay() {
    if (!plan) return;
    setBusy("pay");
    setPayError(null);
    try {
      const r = await api.createCheckout(plan.key, duration, discount?.code);
      savePendingCheckout(r.checkoutId);
      await openCheckoutUrl(r.checkoutUrl);
      navigate(accountRoutePaths.payment(r.checkoutId), { replace: true, state: { discountCode: r.discountCode } });
    } catch (e) {
      setPayError(describeAccountError(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <AppHeader title={plan?.name ?? "خرید پلن"} showBack />
      <main className="pb-8 pt-2">
        {loadError && <ErrorBox message={loadError} />}
        {!plan && !loadError && (online ? <Loading /> : <ErrorBox message="برای خرید به اینترنت وصل شو" />)}
        {plan && (
          <>
            <SectionTitle>مدتِ اشتراک</SectionTitle>
            <div role="radiogroup" className="flex flex-col gap-2 px-4">
              {MOBILE_BILLING_DURATIONS.map((d) => {
                const p = plan.prices.find((x) => x.duration === d);
                if (!p) return null;
                const selected = d === duration;
                return (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setDuration(d)}
                    className="flex items-center gap-3 rounded-card border px-4 font-vazir"
                    style={{ borderColor: selected ? "var(--accent)" : "var(--surface-line)", minHeight: 52 }}
                  >
                    <span className="flex-1 text-start text-[14px]" style={{ color: "var(--text)" }}>
                      {DURATION_LABELS[d]}
                    </span>
                    {p.upgradeAmount != null && p.upgradeAmount !== p.amount && (
                      <span className="text-[12px] line-through" style={{ color: "var(--muted)" }}>
                        {formatToman(p.amount)}
                      </span>
                    )}
                    <span className="text-[13.5px] font-semibold tabular-nums" style={{ color: "var(--text)" }}>
                      {formatToman(p.upgradeAmount ?? p.amount)}
                    </span>
                  </button>
                );
              })}
            </div>
            {price?.upgradeCapEnd && (
              <p className="px-4 pt-2 font-vazir text-[12px] leading-6" style={{ color: "var(--muted)" }}>
                ارتقا: اعتبارِ پلنِ فعلیت کم شده و این پلن تا {formatIsoJalali(price.upgradeCapEnd)} (پایانِ پلنِ فعلی) فعال می‌ماند.
              </p>
            )}

            <SectionTitle>کدِ تخفیف یا معرف</SectionTitle>
            <div className="flex gap-2 px-4">
              <input
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setDiscount(null);
                  setCodeMsg(null);
                }}
                maxLength={40}
                dir="ltr"
                autoCapitalize="characters"
                autoCorrect="off"
                placeholder="اختیاری"
                aria-label="کدِ تخفیف"
                className="flex-1 rounded-card border px-3 font-latin text-[14px] outline-none"
                style={{ borderColor: "var(--surface-line)", background: "var(--input-bg)", color: "var(--text)", height: 44 }}
              />
              <button
                type="button"
                onClick={applyCode}
                disabled={!code.trim() || busy !== null}
                className="rounded-card border px-4 font-vazir text-[13.5px]"
                style={{ borderColor: "var(--surface-line)", color: "var(--accent)", height: 44, opacity: !code.trim() || busy ? 0.5 : 1 }}
              >
                {busy === "code" ? "…" : "اعمال"}
              </button>
            </div>
            {codeMsg && (
              <p className="px-4 pt-2 font-vazir text-[12.5px]" style={{ color: discount ? "var(--pnl-win)" : "var(--pnl-loss)" }}>
                {codeMsg}
              </p>
            )}

            {price && (
              <div className="mx-4 mt-5 flex items-center border-t pt-4 font-vazir" style={{ borderColor: "var(--surface-line)" }}>
                <span className="flex-1 text-[14px]" style={{ color: "var(--muted)" }}>
                  مبلغِ قابلِ پرداخت
                </span>
                <span className="text-[16px] font-bold tabular-nums" style={{ color: "var(--text)" }}>
                  {formatToman(effectiveAmount(price, percent))}
                </span>
              </div>
            )}

            {payError && <div className="pt-3"><ErrorBox message={payError} /></div>}
            <div className="px-4 pt-5">
              <PrimaryButton onClick={pay} disabled={busy !== null || !online}>
                {busy === "pay" ? "در حال آماده‌سازی…" : "ادامه و پرداخت در سایت"}
              </PrimaryButton>
              <p className="pt-3 text-center font-vazir text-[11.5px] leading-6" style={{ color: "var(--muted)" }}>
                صفحه‌ی پرداختِ امنِ آریون در مرورگر باز می‌شود. مبلغِ نهایی همان‌جا نمایش داده می‌شود
                {discount ? " — کدِ تخفیف را آن‌جا هم وارد کن" : ""}. بعد از پرداخت به اپ برگرد.
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
