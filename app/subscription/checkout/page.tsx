"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { getSiteMarket } from "@/lib/market";
import { findPlanCard, DURATION_LABELS, DURATION_LABELS_INTL, Duration } from "@/components/PlanShowcase";

type Gateway = "zarinpal" | "zibal";

// چک‌اوتِ واقعیِ خریدِ پلن — از صفحه‌ی /subscription با ?plan=key&duration=1|3|6|12
// باز می‌شه. کدِ تخفیف (رفرالِ یک نفرِ دیگه)، پذیرشِ قوانین، انتخابِ درگاه
// (زرین‌پال یا زیبال) و دکمه‌ی پرداخت.
export default function CheckoutPage() {
  const { status } = useSession();
  const router = useRouter();
  const isIntl = getSiteMarket() === "INTERNATIONAL";

  // از window.location مستقیم می‌خونیم تا نیازی به useSearchParams/Suspense
  // نباشه (قاعده‌ی معمولِ پروژه — نگاه کن به app/auth/login/page.tsx).
  const [query, setQuery] = useState<{ planKey: string; duration: Duration } | null>(null);
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setQuery({ planKey: sp.get("plan") || "", duration: (sp.get("duration") || "1") as Duration });
  }, []);

  const planKey = query?.planKey || "";
  const duration = query?.duration || "1";
  const plan = query ? findPlanCard(planKey, isIntl) : undefined;

  const [discountCode, setDiscountCode] = useState("");
  const [discountResult, setDiscountResult] = useState<{ ok: true; percentOff: number } | { ok: false; error: string } | null>(null);
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [gateway, setGateway] = useState<Gateway>("zarinpal");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!query) return null;

  if (status !== "authenticated") {
    return (
      <section className="checkout-page">
        <h1>پرداخت</h1>
        <AuthGate message="برای خرید اشتراک وارد شوید" />
      </section>
    );
  }

  if (!plan || plan.free || !plan.prices) {
    return (
      <section className="checkout-page">
        <h1>پرداخت</h1>
        <div className="section-note">پلنِ انتخاب‌شده معتبر نیست.</div>
        <Link href="/subscription" className="checkout-back-link">بازگشت به صفحه‌ی اشتراک</Link>
      </section>
    );
  }

  const labels = isIntl ? DURATION_LABELS_INTL : DURATION_LABELS;
  const price = plan.prices[duration];

  async function applyDiscount() {
    if (discountResult?.ok) {
      // فیلد قفل بود («تغییر») — دوباره باز می‌شه برای وارد‌کردنِ کدِ جدید.
      setDiscountResult(null);
      return;
    }
    if (!discountCode.trim() || applyingDiscount) return;
    setApplyingDiscount(true);
    try {
      const res = await fetch("/api/subscription/discount-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: discountCode.trim(), planKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDiscountResult({ ok: false, error: data.error || "خطایی پیش آمد — دوباره امتحان کن" });
      } else {
        setDiscountResult({ ok: true, percentOff: data.percentOff });
      }
    } catch {
      setDiscountResult({ ok: false, error: "مشکلی در اتصال به سرور پیش اومد — دوباره امتحان کن" });
    } finally {
      setApplyingDiscount(false);
    }
  }

  async function pay() {
    if (loading) return;
    if (!agreed) {
      setError("برای ادامه‌ی پرداخت، لطفاً قوانین و مقررات سایت را بپذیر");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey, duration, discountCode: discountCode.trim() || undefined, gateway }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "خطایی پیش آمد — دوباره امتحان کن");
        setLoading(false);
        return;
      }
      window.location.href = data.paymentUrl;
    } catch {
      setError("مشکلی در اتصال به سرور پیش اومد — دوباره امتحان کن");
      setLoading(false);
    }
  }

  return (
    <section className="checkout-page">
      <button type="button" className="checkout-back-btn" aria-label="بازگشت" onClick={() => router.push("/subscription")}>
        <svg viewBox="0 0 24 24" fill="none"><path d="M3 12h18M21 12l-7-6M21 12l-7 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>

      <h1>تکمیل خرید</h1>

      <div className="checkout-summary">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full checkout-summary-icon">{plan.icon}</span>
        <div className="checkout-summary-body">
          <div className="checkout-summary-name">{plan.nameFa}</div>
          <div className="checkout-summary-duration">{labels[duration]}</div>
        </div>
        <div className="checkout-summary-price">{price}</div>
      </div>

      <div className="checkout-box">
        <div className="checkout-discount-row">
          <label className="checkout-field-label" htmlFor="discountCode">کد تخفیف</label>
          <div className={`checkout-discount-field-wrap${discountResult?.ok ? " applied" : ""}`}>
            <input
              id="discountCode"
              type="text"
              dir="ltr"
              className="wsearch-newform-name checkout-discount-input"
              placeholder="کد تخفیف (اختیاری)"
              value={discountCode}
              readOnly={discountResult?.ok}
              onChange={(e) => { setDiscountCode(e.target.value); setDiscountResult(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyDiscount(); } }}
            />
            <button
              type="button"
              className={`checkout-discount-apply-btn${discountResult?.ok ? " remove" : ""}`}
              disabled={applyingDiscount || (!discountResult?.ok && !discountCode.trim())}
              onClick={applyDiscount}
            >
              {applyingDiscount ? "..." : discountResult?.ok ? "تغییر" : "اعمال"}
            </button>
          </div>
        </div>
        {discountResult?.ok && <div className="checkout-discount-success">{discountResult.percentOff}٪ تخفیف اعمال شد</div>}
        {discountResult && !discountResult.ok && <div className="field-error-msg" style={{ display: "block", marginTop: 7 }}>{discountResult.error}</div>}
      </div>

      <div className="checkout-box">
        <div className="checkout-field-label">درگاه پرداخت</div>
        <div className="checkout-gateway-row">
          <button
            type="button"
            className={`checkout-gateway-pill${gateway === "zarinpal" ? " on" : ""}`}
            onClick={() => setGateway("zarinpal")}
          >
            <ShieldCheck size={16} />
            زرین‌پال
          </button>
          <button
            type="button"
            className={`checkout-gateway-pill${gateway === "zibal" ? " on" : ""}`}
            onClick={() => setGateway("zibal")}
          >
            <ShieldCheck size={16} />
            زیبال
          </button>
        </div>
      </div>

      <div className="task checkout-terms-row" onClick={() => { setAgreed((v) => !v); setError(null); }}>
        <div className={`check${agreed ? " on" : ""}`}>
          <svg className="c-check" viewBox="0 0 24 24" fill="none">
            <path d="M2.5 13l5.5 5.5L21.5 4.5" stroke="var(--bg)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="task-name">
          <Link href="/terms" target="_blank" onClick={(e) => e.stopPropagation()} style={{ color: "var(--accent)" }}>
            قوانین و مقررات سایت
          </Link>
          {" "}را می‌پذیرم
        </div>
      </div>

      {error && <div className="field-error-msg" style={{ display: "block", marginTop: 8 }}>{error}</div>}

      <button type="button" className="auth-full-btn checkout-pay-btn" disabled={loading} onClick={pay}>
        {loading ? "در حال اتصال به درگاه…" : `پرداخت ${price}`}
      </button>
    </section>
  );
}
