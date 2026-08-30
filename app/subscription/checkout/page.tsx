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
// عددِ خام را به همان شکلی درمی‌آورد که رشته‌های `prices` نوشته شده‌اند:
// برای ایران مبلغ به ریال است و تومان نمایش داده می‌شود (تقسیم بر ۱۰)،
// برای بین‌المللی به سنت است و دلار نمایش داده می‌شود.
function formatAmount(amount: number, isIntl: boolean): string {
  if (isIntl) return `$${(amount / 100).toFixed(2)}`;
  return `${Math.round(amount / 10).toLocaleString("en-US")} تومان`;
}

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
  const basePrice = plan.prices[duration];

  // مبلغِ نمایشی بعد از تخفیف.
  //
  // باگی که این حل می‌کند: قبلاً همیشه `plan.prices[duration]` — یعنی
  // رشته‌ی *بدونِ تخفیف* — نمایش داده می‌شد. با کدِ ۹۰٪ تخفیف، بالای صفحه
  // «۹۰٪ تخفیف اعمال شد» می‌آمد ولی دکمه همچنان «پرداخت ۹۹,۰۰۰ تومان»
  // می‌گفت. سرور مبلغِ درست را حساب می‌کرد (پس پولِ درست کم می‌شد)، ولی
  // کاربر عددِ غلط می‌دید — که هم گیج‌کننده است هم اعتمادسوز.
  //
  // از `amounts` (عددِ خام، به ریال برای ایران و سنت برای بین‌المللی) حساب
  // می‌شود، نه از پارس‌کردنِ رشته‌ی نمایشی، و **با همان فرمولِ سمتِ سرور**
  // (`Math.round(base * (100 - percent) / 100)`) تا عددِ روی دکمه دقیقاً
  // همانی باشد که از کارت کم می‌شود.
  const percentOff = discountResult?.ok ? discountResult.percentOff : 0;
  const rawAmount = plan.amounts?.[duration];
  const price =
    percentOff > 0 && typeof rawAmount === "number"
      ? formatAmount(Math.round((rawAmount * (100 - percentOff)) / 100), isIntl)
      : basePrice;

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

  // پاسخِ بدونِ JSON یعنی خطا از خودِ اپ نیامده بلکه از لایه‌ی جلوترش
  // (nginx / پراکسی / کانتینرِ خاموش). این پیام‌ها کاربر را به سمتِ کارِ درست
  // می‌برند به‌جای این‌که فکر کند اینترنتش مشکل دارد.
  function httpErrorMessage(status: number): string {
    if (status === 504 || status === 408) return "درگاهِ پرداخت دیر جواب داد — چند لحظه دیگر دوباره امتحان کن";
    if (status === 502 || status === 503) return "سرورِ پرداخت موقتاً در دسترس نیست — چند دقیقه دیگر دوباره امتحان کن";
    if (status === 401) return "برای پرداخت باید دوباره وارد حسابت بشی";
    if (status === 429) return "تعداد تلاش‌ها زیاد بود — چند دقیقه صبر کن";
    return `خطای غیرمنتظره از سرور (کدِ ${status}) — اگر تکرار شد به پشتیبانی اطلاع بده`;
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
      // عمداً `res.json()` مستقیم صدا زده نمی‌شود: اگر پاسخ JSON نباشد (مثلاً
      // ۵۰۴ـِ HTML از nginx وقتی درگاه کند است، یا ۵۰۲ وقتی کانتینر بالا
      // نیامده) آن فراخوانی throw می‌کرد و می‌افتاد توی catch — و کاربر پیامِ
      // «مشکلی در اتصال به سرور» را می‌دید، انگار اینترنتش قطع است. حالا کدِ
      // واقعیِ HTTP به کاربر گفته می‌شود تا مشکل قابلِ تشخیص باشد.
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        setError(data?.error || httpErrorMessage(res.status));
        setLoading(false);
        return;
      }
      window.location.href = data.paymentUrl;
    } catch {
      // این‌جا فقط خطای واقعیِ شبکه می‌رسد (اینترنتِ کاربر قطع شده)، نه پاسخِ
      // نامعتبرِ سرور — پس این پیام حالا واقعاً درست است.
      setError("اتصال به اینترنت برقرار نیست — اتصالت رو چک کن و دوباره امتحان کن");
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
        <div className="checkout-summary-price">
          {percentOff > 0 && (
            <span style={{ textDecoration: "line-through", opacity: 0.5, fontSize: "0.82em", marginInlineEnd: 6 }}>
              {basePrice}
            </span>
          )}
          {price}
        </div>
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
            قوانین و مقررات
          </Link>
          {" "}سایت را می‌پذیرم
        </div>
      </div>

      {error && <div className="field-error-msg" style={{ display: "block", marginTop: 8 }}>{error}</div>}

      <button type="button" className="auth-full-btn checkout-pay-btn" disabled={loading} onClick={pay}>
        {loading ? "در حال اتصال به درگاه…" : `پرداخت ${price}`}
      </button>
    </section>
  );
}
