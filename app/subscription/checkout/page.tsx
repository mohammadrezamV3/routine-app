"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthGate } from "@/components/AuthGate";
import { getSiteMarket } from "@/lib/market";
import { formatPriceAmount } from "@/lib/formatPrice";
import { findPlanCard, formatJalaliLong, DURATION_LABELS, DURATION_LABELS_INTL, Duration, UpgradeOffer } from "@/components/PlanShowcase";

type Gateway = "zarinpal" | "zibal";

// نشان‌های خودِ درگاه‌ها — آیکونِ عمومیِ ShieldCheck که قبلاً هر دو دکمه
// مشترک بودن، جای دو نشانِ متمایز رو (رنگ/شکلِ مخصوصِ خودِ زرین‌پال/زیبال)
// نمی‌گرفت. طراحیِ ساده و غیرِ عینِ لوگوی رسمی، فقط برای تمایزِ بصری.
function ZarinpalMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="7" fill="#FFB800" />
      <path d="M12 6.2 L17 16.4 H7 Z" fill="#241C08" />
    </svg>
  );
}
function ZibalMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="7" fill="#00C2A8" />
      <circle cx="12" cy="12" r="5.2" fill="#04302A" />
    </svg>
  );
}

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
  // applyingDiscount (state) async/batch-ست و جلوی دابل‌کلیکِ سریع رو کامل
  // نمی‌گیره؛ applyingRef سنکرونه. requestGenRef هم جلوی رِیس‌کاندیشن رو
  // می‌گیره: اگه یه درخواستِ قدیمی‌تر دیرتر از یه درخواستِ جدیدتر برگرده،
  // نتیجه‌ی قدیمی نباید نتیجه‌ی جدید رو رونویسی کنه (همون باگِ «یه بار
  // اعمال می‌کنه یه بار نه»).
  const applyingRef = useRef(false);
  const requestGenRef = useRef(0);
  const [gateway, setGateway] = useState<Gateway>("zibal");
  // کدام درگاه‌ها روی این سرور واقعاً تنظیم شده‌اند. تا وقتی جواب نیامده،
  // null است و هر دو نشان داده می‌شوند (رفتارِ قبلی) — این‌طور اگر این
  // درخواست شکست بخورد، صفحه بدترنمی‌شود.
  const [availableGateways, setAvailableGateways] = useState<Gateway[] | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // اعتبارِ ارتقا به مکس (اگه کاربر از قبل ورزش/ترید فعال داره) — پیش‌نمایشه؛
  // مبلغِ واقعی همیشه سمتِ سرور، مستقل از این fetch، توی
  // api/subscription/checkout دوباره محاسبه می‌شه.
  const [upgradeOffer, setUpgradeOffer] = useState<UpgradeOffer | null>(null);
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/plans").then((r) => r.json()).then((data) => setUpgradeOffer(data.upgradeOffer || null)).catch(() => {});
  }, [status]);

  useEffect(() => {
    fetch("/api/subscription/gateways")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const list: Gateway[] = Array.isArray(d?.available) ? d.available : [];
        if (!list.length) return;
        setAvailableGateways(list);
        // اگر درگاهِ انتخاب‌شده روی این سرور تنظیم نشده، برو سراغِ اولین
        // درگاهِ سالم — وگرنه کاربر روی گزینه‌ای می‌ماند که حتماً خطا می‌دهد.
        setGateway((g) => (list.includes(g) ? g : list[0]));
      })
      .catch(() => {});
  }, []);

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
  const upgradeInfo = planKey === "max" ? upgradeOffer?.perDuration[duration] : undefined;
  // اعتبارِ ارتقا (اگه باشه) اول اعمال می‌شه، بعد اگه کدِ تخفیفی هم اعمال
  // شده باشه، درصدش روی همون قیمتِ اعتبارخورده حساب می‌شه — نه رویِ قیمتِ
  // خامِ اولیه.
  const creditedBaseAmount = upgradeInfo ? upgradeInfo.amount : plan.amounts?.[duration];
  const discountedAmount = discountResult?.ok && creditedBaseAmount != null
    ? Math.round((creditedBaseAmount * (100 - discountResult.percentOff)) / 100)
    : upgradeInfo
    ? upgradeInfo.amount
    : null;
  const finalPriceLabel = discountedAmount != null ? formatPriceAmount(discountedAmount, isIntl) : price;

  async function applyDiscount() {
    if (discountResult?.ok) {
      // فیلد قفل بود («تغییر») — دوباره باز می‌شه برای وارد‌کردنِ کدِ جدید.
      setDiscountResult(null);
      return;
    }
    if (!discountCode.trim() || applyingRef.current) return;
    applyingRef.current = true;
    setApplyingDiscount(true);
    const myGen = ++requestGenRef.current;
    try {
      const res = await fetch("/api/subscription/discount-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: discountCode.trim(), planKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (myGen !== requestGenRef.current) return; // درخواستِ جدیدتری در راهه/رسیده — این جواب دیگه معتبر نیست
      if (!res.ok) {
        setDiscountResult({ ok: false, error: data.error || "خطایی پیش آمد — دوباره امتحان کن" });
      } else {
        setDiscountResult({ ok: true, percentOff: data.percentOff });
      }
    } catch {
      if (myGen === requestGenRef.current) {
        setDiscountResult({ ok: false, error: "مشکلی در اتصال به سرور پیش اومد — دوباره امتحان کن" });
      }
    } finally {
      applyingRef.current = false;
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
          {discountedAmount != null && (
            <span style={{ textDecoration: "line-through", opacity: 0.5, fontSize: "0.82em", marginInlineEnd: 6 }}>
              {price}
            </span>
          )}
          {finalPriceLabel}
        </div>
      </div>

      {upgradeInfo && (
        <div className="checkout-upgrade-note">
          با اعتبارِ پلنِ فعلیت ارتقا می‌گیری —{" "}
          {upgradeInfo.capped
            ? `این پلن تا ${formatJalaliLong(upgradeInfo.capEndIso)} فعال می‌مونه (هم‌زمان با پایانِ پلنِ فعلیت).`
            : "به‌مدتِ کامل خریداری‌شده فعال می‌مونه."}
        </div>
      )}

      <div className="checkout-box">
        <div className="checkout-discount-row">
          <label className="checkout-field-label" htmlFor="discountCode">کد تخفیف</label>
          <div className={`checkout-discount-field-wrap${discountResult?.ok ? " applied" : ""}`}>
            <input
              id="discountCode"
              type="text"
              dir="ltr"
              className="wsearch-newform-name checkout-discount-input"
              style={{ textAlign: "right" }}
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
        {discountResult?.ok && <div className="checkout-discount-success">کد تخفیف اعمال شد</div>}
        {discountResult && !discountResult.ok && <div className="field-error-msg" style={{ display: "block", marginTop: 7 }}>{discountResult.error}</div>}
      </div>

      <div className="checkout-box">
        <div className="checkout-field-label">درگاه پرداخت</div>
        <div className="checkout-gateway-row">
          {(!availableGateways || availableGateways.includes("zarinpal")) && (
          <button
            type="button"
            className={`checkout-gateway-pill${gateway === "zarinpal" ? " on" : ""}`}
            onClick={() => setGateway("zarinpal")}
          >
            <ZarinpalMark />
            زرین‌پال
          </button>
          )}
          {(!availableGateways || availableGateways.includes("zibal")) && (
          <button
            type="button"
            className={`checkout-gateway-pill${gateway === "zibal" ? " on" : ""}`}
            onClick={() => setGateway("zibal")}
          >
            <ZibalMark />
            زیبال
          </button>
          )}
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
        {loading ? (
          "در حال اتصال به درگاه…"
        ) : (
          <span className="checkout-pay-btn-inner">
            {discountedAmount != null && <span className="checkout-pay-old-price">{price}</span>}
            <span>{`پرداخت ${finalPriceLabel}`}</span>
          </span>
        )}
      </button>
    </section>
  );
}
