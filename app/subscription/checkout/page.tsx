"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { getSiteMarket } from "@/lib/market";
import { findPlanCard, DURATION_LABELS, DURATION_LABELS_INTL, Duration } from "@/components/PlanShowcase";

// چک‌اوتِ واقعیِ خریدِ پلن — از صفحه‌ی /subscription با ?plan=key&duration=1|3|6|12
// باز می‌شه. کدِ تخفیف (رفرالِ یک نفرِ دیگه)، پذیرشِ قوانین، انتخابِ درگاه
// (فعلاً فقط زرین‌پال) و دکمه‌ی پرداخت — دقیقاً همون چیزی که کاربر خواسته.
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

  async function pay() {
    if (!agreed || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey, duration, discountCode: discountCode.trim() || undefined }),
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
        <label className="checkout-field-label" htmlFor="discountCode">کد تخفیف (اختیاری)</label>
        <input
          id="discountCode"
          type="text"
          dir="ltr"
          className="wsearch-newform-name checkout-discount-input"
          placeholder="کد تخفیف"
          value={discountCode}
          onChange={(e) => setDiscountCode(e.target.value)}
        />
      </div>

      <div className="checkout-box">
        <div className="checkout-field-label">درگاه پرداخت</div>
        <div className="checkout-gateway-row">
          <div className="checkout-gateway-pill on">
            <ShieldCheck size={16} />
            زرین‌پال
          </div>
        </div>
      </div>

      <div className="task checkout-terms-row" onClick={() => setAgreed((v) => !v)}>
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

      <button type="button" className="auth-full-btn checkout-pay-btn" disabled={!agreed || loading} onClick={pay}>
        {loading ? "در حال اتصال به درگاه…" : `پرداخت ${price}`}
      </button>
    </section>
  );
}
