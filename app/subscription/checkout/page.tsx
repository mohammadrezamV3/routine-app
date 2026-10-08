"use client";

import { useEffect, useRef, useState } from "react";
import { readInviteRef } from "@/lib/invite";
import { REFERRAL_DISCOUNT_PERCENT } from "@/lib/referral";
import { faNum } from "@/lib/jalali";
import { useSession } from "next-auth/react";
import { XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthGate } from "@/components/AuthGate";
import { priceText as formatPriceAmount } from "@/lib/subscriptionI18n";
import { findPlanCard, formatJalaliLong, UpgradeOffer } from "@/components/PlanShowcase";
import { Duration, isDuration, isPaidPlanKey } from "@/lib/planPricing";
import { monthsText } from "@/lib/subscriptionI18n";
import { usePlanPricing } from "@/lib/usePlanPricing";
import { TickButton } from "@/components/TickButton";
import { isMonthlyOption, pickBestDiscount } from "@/lib/achievementRewards";
import { getAccount } from "@/lib/accountCache";
import { ToggleSwitch } from "@/components/ToggleSwitch";
import { tr, isEn } from "@/lib/i18n";

type Gateway = "zibal";

// نشان خود درگاه — آیکون عمومی ShieldCheck قبلا جای یک نشان متمایز
// (رنگ/شکل مخصوص زیبال) رو نمی‌گرفت. طراحی ساده، فقط برای تمایز بصری.
function ZibalMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="7" fill="#00C2A8" />
      <circle cx="12" cy="12" r="5.2" fill="#04302A" />
    </svg>
  );
}

// چک‌اوت واقعی خرید پلن — از صفحه‌ی /subscription با ?plan=key&duration=1|3|6|12
// باز می‌شه. کد تخفیف (رفرال یک نفر دیگه)، کیفِ اعتبار، پذیرش قوانین و دکمه‌ی
// پرداخت. زرین‌پال طبق درخواست صریح کامل از پروژه حذف شد — زیبال تنها درگاهه.
export default function CheckoutPage() {
  const { status } = useSession();
  const router = useRouter();

  // از window.location مستقیم می‌خونیم تا نیازی به useSearchParams/Suspense
  // نباشه (قاعده‌ی معمول پروژه — نگاه کن به app/auth/login/page.tsx).
  const [query, setQuery] = useState<{ planKey: string; duration: Duration } | null>(null);
  // وقتی پرداخت نگرفته، درگاه کاربر را به همین صفحه برمی‌گرداند (نه فهرست
  // اشتراک‌ها) تا بتواند بدون از سر گرفتن انتخاب پلن، همان‌جا دوباره —
  // یا با درگاه دیگر — امتحان کند. این پرچم فقط پیام را نشان می‌دهد.
  const [failedReturn, setFailedReturn] = useState(false);
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setQuery({ planKey: sp.get("plan") || "", duration: (sp.get("duration") || "1") as Duration });
    if (sp.get("checkout") === "failed") setFailedReturn(true);
    // کد دعوت دوستی که کاربر با لینکش اومده (lib/invite.ts) — فقط پیش‌پر می‌شه؛
    // اعمال و اعتبارسنجی مثل هر کد دیگه با دکمه‌ی «اعمال» و سمت سرور.
    const ref = readInviteRef();
    if (ref) { setDiscountCode((c) => c || ref); setFromInvite(true); }
  }, []);

  const planKey = query?.planKey || "";
  const duration = query?.duration || "1";
  const plan = query ? findPlanCard(planKey) : undefined;
  // قیمت/مدت‌ها از همون پیکربندی پنل ادمین که سرور مبلغ واقعی رو باهاش حساب می‌کنه
  const { pricing, ready: pricingReady } = usePlanPricing();

  const [discountCode, setDiscountCode] = useState("");
  const [fromInvite, setFromInvite] = useState(false);
  const [discountResult, setDiscountResult] = useState<{ ok: true; percentOff: number } | { ok: false; error: string } | null>(null);
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  // applyingDiscount (state) async/batch-ست و جلوی دابل‌کلیک سریع رو کامل
  // نمی‌گیره؛ applyingRef سنکرونه. requestGenRef هم جلوی ریس‌کاندیشن رو
  // می‌گیره: اگه یه درخواست قدیمی‌تر دیرتر از یه درخواست جدیدتر برگرده،
  // نتیجه‌ی قدیمی نباید نتیجه‌ی جدید رو رونویسی کنه (همون باگ «یه بار
  // اعمال می‌کنه یه بار نه»).
  const applyingRef = useRef(false);
  const requestGenRef = useRef(0);
  const gateway: Gateway = "zibal";
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);

  // موجودیِ کیفِ اعتبار — از همون کشِ مشترکِ account (lib/accountCache.ts)
  // می‌خونیم، نه فچِ جداگانه، چون اینجا فقط یک عدد لازمه.
  useEffect(() => {
    if (status !== "authenticated") return;
    getAccount().then((acc) => {
      const bal = Number((acc?.user as any)?.walletBalance || 0);
      setWalletBalance(bal);
    });
  }, [status]);

  // اعتبار ارتقا به مکس (اگه کاربر از قبل ورزش/ترید فعال داره) — پیش‌نمایشه؛
  // مبلغ واقعی همیشه سمت سرور، مستقل از این fetch، توی
  // api/subscription/checkout دوباره محاسبه می‌شه.
  const [upgradeOffer, setUpgradeOffer] = useState<UpgradeOffer | null>(null);
  // پاداش اچیومنت‌ها (20٪ با نصف، 50٪ با همه) — فقط روی گزینه‌ی یک‌ماهه؛ پیش‌نمایش،
  // تصمیم واقعی همیشه سمت سرور.
  const [achReward, setAchReward] = useState<{ tier: "half" | "full"; percent: number } | null>(null);
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/plans").then((r) => r.json()).then((data) => setUpgradeOffer(data.upgradeOffer || null)).catch(() => {});
    fetch("/api/achievements/reward", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => setAchReward(d?.reward ?? null)).catch(() => {});
  }, [status]);

  if (!query || !pricingReady) return null;

  if (status !== "authenticated") {
    return (
      <section className="checkout-page">
        <h1>{tr("پرداخت", "Checkout")}</h1>
        <AuthGate message={tr("برای خرید اشتراک وارد شوید", "Log in to buy a subscription")} />
      </section>
    );
  }

  const durationOk = isDuration(duration) && pricing.durations[duration].enabled;
  if (!plan || plan.free || !isPaidPlanKey(planKey) || !durationOk) {
    return (
      <section className="checkout-page">
        <h1>{tr("پرداخت", "Checkout")}</h1>
        <div className="section-note">{tr("پلن انتخاب‌شده معتبر نیست.", "The selected plan is not valid.")}</div>
        <Link href="/subscription" className="checkout-back-link">{tr("بازگشت به صفحه‌ی اشتراک", "Back to subscription")}</Link>
      </section>
    );
  }

  const baseAmount = pricing.plans[planKey][duration].price * 10;
  const price = formatPriceAmount(baseAmount);
  const upgradeInfo = planKey === "max" ? upgradeOffer?.perDuration[duration] : undefined;
  // اعتبار ارتقا (اگه باشه) اول اعمال می‌شه، بعد اگه کد تخفیفی هم اعمال
  // شده باشه، درصدش روی همون قیمت اعتبارخورده حساب می‌شه — نه روی قیمت
  // خام اولیه.
  const creditedBaseAmount = upgradeInfo ? upgradeInfo.amount : baseAmount;
  const codePercent = discountResult?.ok ? discountResult.percentOff : 0;
  const monthly = isMonthlyOption(pricing.durations[duration].months);
  const achPercent = monthly && achReward ? achReward.percent : 0;
  const best = pickBestDiscount([
    { source: "code", percent: codePercent },
    { source: "achievement", percent: achPercent },
  ]);
  const achWins = best?.source === "achievement";
  const effectivePercent = best?.percent ?? 0;
  const discountedAmount = effectivePercent > 0 && creditedBaseAmount != null
    ? Math.round((creditedBaseAmount * (100 - effectivePercent)) / 100)
    : upgradeInfo
    ? upgradeInfo.amount
    : null;
  const finalPriceLabel = discountedAmount != null ? formatPriceAmount(discountedAmount) : price;

  // کیفِ اعتبار آخرین لایه‌است — روی قیمتی اعمال می‌شه که همه‌ی تخفیف‌های
  // بالا (ارتقا/کد/اچیومنت) قبلا روش حساب شدن. سرور دوباره و مستقلا همین
  // ترتیب رو با همین سقف‌ها حساب می‌کنه (clampWalletApply در lib/wallet.ts).
  const preWalletAmount = discountedAmount ?? (upgradeInfo ? upgradeInfo.amount : baseAmount);
  const appliedCredit = useWallet ? Math.min(walletBalance, preWalletAmount) : 0;
  const payAmount = Math.max(0, preWalletAmount - appliedCredit);
  const payLabel = formatPriceAmount(payAmount);

  async function applyDiscount() {
    if (discountResult?.ok) {
      // فیلد قفل بود («تغییر») — دوباره باز می‌شه برای وارد‌کردن کد جدید.
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
      if (myGen !== requestGenRef.current) return; // درخواست جدیدتری در راهه/رسیده — این جواب دیگه معتبر نیست
      if (!res.ok) {
        setDiscountResult({ ok: false, error: data.error || tr("خطایی پیش آمد — دوباره امتحان کن", "Something went wrong. Please try again") });
      } else {
        setDiscountResult({ ok: true, percentOff: data.percentOff });
      }
    } catch {
      if (myGen === requestGenRef.current) {
        setDiscountResult({ ok: false, error: tr("مشکلی در اتصال به سرور پیش اومد — دوباره امتحان کن", "Could not reach the server. Please try again") });
      }
    } finally {
      applyingRef.current = false;
      setApplyingDiscount(false);
    }
  }

  // پاسخ بدون JSON یعنی خطا از خود اپ نیامده بلکه از لایه‌ی جلوترش
  // (nginx / پراکسی / کانتینر خاموش). این پیام‌ها کاربر را به سمت کار درست
  // می‌برند به‌جای این‌که فکر کند اینترنتش مشکل دارد.
  function httpErrorMessage(status: number): string {
    if (status === 504 || status === 408) return tr("درگاه پرداخت دیر جواب داد — چند لحظه دیگر دوباره امتحان کن", "The payment gateway took too long to respond. Please try again in a moment");
    if (status === 502 || status === 503) return tr("سرور پرداخت موقتا در دسترس نیست — چند دقیقه دیگر دوباره امتحان کن", "The payment server is temporarily unavailable. Please try again in a few minutes");
    if (status === 401) return tr("برای پرداخت باید دوباره وارد حسابت بشی", "You need to log in again to pay");
    if (status === 429) return tr("تعداد تلاش‌ها زیاد بود — چند دقیقه صبر کن", "Too many attempts. Please wait a few minutes");
    return tr(`خطای غیرمنتظره از سرور (کد ${status}) — اگر تکرار شد به پشتیبانی اطلاع بده`, `Unexpected server error (code ${status}). If it keeps happening, contact support`);
  }

  async function pay() {
    if (loading) return;
    if (!agreed) {
      setError(tr("برای ادامه‌ی پرداخت، لطفا قوانین و مقررات سایت را بپذیر", "To continue, please accept the terms and conditions"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey, duration, discountCode: discountCode.trim() || undefined, gateway, useWalletCredit: useWallet }),
      });
      // عمدا `res.json()` مستقیم صدا زده نمی‌شود: اگر پاسخ JSON نباشد (مثلا
      // ۵۰۴ـ HTML از nginx وقتی درگاه کند است، یا ۵۰۲ وقتی کانتینر بالا
      // نیامده) آن فراخوانی throw می‌کرد و می‌افتاد توی catch — و کاربر پیام
      // «مشکلی در اتصال به سرور» را می‌دید، انگار اینترنتش قطع است. حالا کد
      // واقعی HTTP به کاربر گفته می‌شود تا مشکل قابل تشخیص باشد.
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        setError(data?.error || httpErrorMessage(res.status));
        setLoading(false);
        return;
      }
      // کیفِ اعتبار ممکنه کلِ قیمت رو پوشش بده — آن‌وقت دیگه نیازی به درگاه
      // نیست و سرور مستقیم redirectUrl (صفحه‌ی موفقیت) برمی‌گردونه.
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    } catch {
      // این‌جا فقط خطای واقعی شبکه می‌رسد (اینترنت کاربر قطع شده)، نه پاسخ
      // نامعتبر سرور — پس این پیام حالا واقعا درست است.
      setError(tr("اتصال به اینترنت برقرار نیست — اتصالت رو چک کن و دوباره امتحان کن", "No internet connection. Check your connection and try again"));
      setLoading(false);
    }
  }

  return (
    <section className="checkout-page">
      <button type="button" className="checkout-back-btn" aria-label={tr("بازگشت", "Back")} onClick={() => router.push("/subscription")}>
        <svg viewBox="0 0 24 24" fill="none" className="dir-flip"><path d="M3 12h18M21 12l-7-6M21 12l-7 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>

      <h1>{tr("تکمیل خرید", "Complete purchase")}</h1>

      {failedReturn && (
        <div className="checkout-status-banner failed">
          <XCircle size={18} /> {tr("پرداخت ناموفق بود یا لغو شد — چیزی از حسابت کم نشده. می‌تونی دوباره امتحان کنی.", "The payment failed or was cancelled. Nothing was charged. You can try again.")}
        </div>
      )}

      <div className="checkout-summary">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full checkout-summary-icon">{plan.icon}</span>
        <div className="checkout-summary-body">
          <div className="checkout-summary-name">{plan.nameFa}</div>
          <div className="checkout-summary-duration">{monthsText(pricing.durations[duration].months)}</div>
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
          {tr("با اعتبار پلن فعلیت ارتقا می‌گیری —", "You are upgrading with the credit from your current plan —")}{" "}
          {upgradeInfo.capped
            ? tr(`این پلن تا ${formatJalaliLong(upgradeInfo.capEndIso)} فعال می‌مونه (هم‌زمان با پایان پلن فعلیت).`, `This plan stays active until ${formatJalaliLong(upgradeInfo.capEndIso)} (the same day your current plan ends).`)
            : tr("به‌مدت کامل خریداری‌شده فعال می‌مونه.", "Stays active for the full purchased period.")}
        </div>
      )}

      <div className="checkout-box">
        <div className="checkout-discount-row">
          <label className="checkout-field-label" htmlFor="discountCode">{tr("کد تخفیف", "Discount code")}</label>
          <div className={`checkout-discount-field-wrap${discountResult?.ok ? " applied" : ""}`}>
            <input
              id="discountCode"
              type="text"
              dir="ltr"
              className="wsearch-newform-name checkout-discount-input"
              style={{ textAlign: isEn() ? "left" : "right" }}
              placeholder={tr("کد تخفیف (اختیاری)", "Discount code (optional)")}
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
              {applyingDiscount ? "..." : discountResult?.ok ? tr("تغییر", "Change") : tr("اعمال", "Apply")}
            </button>
          </div>
        </div>
        {fromInvite && !discountResult && <div className="checkout-invite-hint">{isEn() ? `Your friend's invite code is filled in. Press “Apply” to get ${faNum(REFERRAL_DISCOUNT_PERCENT)}% off` : <>کد دعوت دوستت پر شده — «اعمال» رو بزن تا {faNum(REFERRAL_DISCOUNT_PERCENT)}٪ تخفیف بگیری</>}</div>}
        {achWins && achReward && (
          <div className="checkout-discount-success">
            {isEn()
              ? `${faNum(achReward.percent)}% achievements reward (${achReward.tier === "full" ? "all achievements unlocked" : "half of the achievements unlocked"}) was applied automatically${discountResult?.ok ? " (it is bigger than the discount code, so the code is not used)" : ""}`
              : <>{faNum(achReward.percent)}٪ تخفیف پاداش اچیومنت‌ها ({achReward.tier === "full" ? "باز کردن همه‌ی اچیومنت‌ها" : "باز کردن نیمی از اچیومنت‌ها"}) خودکار اعمال شد{discountResult?.ok ? " (از کد تخفیف بیشتره، پس اون مصرف نمی‌شه)" : ""}</>}
          </div>
        )}
        {achReward && !monthly && <div className="checkout-invite-hint">{isEn() ? `The ${faNum(achReward.percent)}% achievements reward only applies to the 1-month option` : <>پاداش {faNum(achReward.percent)}٪ اچیومنت‌ها فقط روی گزینه‌ی یک‌ماهه اعمال می‌شه</>}</div>}
        {discountResult?.ok && !achWins && <div className="checkout-discount-success">{tr("کد تخفیف اعمال شد", "Discount code applied")}</div>}
        {discountResult && !discountResult.ok && <div className="field-error-msg" style={{ display: "block", marginTop: 7 }}>{discountResult.error}</div>}
      </div>

      <div className="checkout-box">
        <div className="checkout-field-label">{tr("درگاه پرداخت", "Payment gateway")}</div>
        <div className="checkout-gateway-row">
          <button type="button" className="checkout-gateway-pill on" disabled>
            <ZibalMark />
            {tr("زیبال", "Zibal")}
          </button>
        </div>
      </div>

      {walletBalance > 0 && (
        <div className="checkout-box">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div className="checkout-field-label" style={{ marginBottom: 0 }}>
              {tr(tr("استفاده از کیفِ اعتبار", "Use wallet credit"), "Use wallet credit")}{" "}
              <span className="mono" dir="ltr" style={{ marginInlineStart: 4, color: "var(--accent)", fontWeight: 700 }}>
                {formatPriceAmount(walletBalance)}
              </span>
            </div>
            <ToggleSwitch checked={useWallet} onChange={setUseWallet} label={tr("استفاده از کیفِ اعتبار", "Use wallet credit")} />
          </div>
          {useWallet && preWalletAmount > 0 && (
            <div className="item-line" style={{ marginTop: 8 }}>
              {tr("مبلغِ قابل‌اعمال از کیف:", "Applied from wallet:")} <span className="mono" dir="ltr">{formatPriceAmount(appliedCredit)}</span>
              {" — "}
              {tr("باقیِ قابلِ پرداخت:", "Left to pay:")} <span className="mono" dir="ltr">{payLabel}</span>
            </div>
          )}
        </div>
      )}

      <div className="task checkout-terms-row" onClick={() => { setAgreed((v) => !v); setError(null); }}>
        <TickButton as="span" className="mt-0.5" size={22} shape="square" checked={agreed} />
        <div className="task-name">
          {isEn() && <>{"I accept the "}</>}
          <Link href="/terms" target="_blank" onClick={(e) => e.stopPropagation()} style={{ color: "var(--accent)" }}>
            {tr("قوانین و مقررات", "terms and conditions")}
          </Link>
          {!isEn() && <>{" "}سایت را می‌پذیرم</>}
        </div>
      </div>

      {error && <div className="field-error-msg" style={{ display: "block", marginTop: 8 }}>{error}</div>}

      <button type="button" className="auth-full-btn checkout-pay-btn" disabled={loading} onClick={pay}>
        {loading ? (
          tr("در حال اتصال به درگاه…", "Connecting to the gateway…")
        ) : (
          <span className="checkout-pay-btn-inner">
            {(discountedAmount != null || appliedCredit > 0) && <span className="checkout-pay-old-price">{price}</span>}
            <span>{payAmount === 0 ? tr("فعال‌سازی با کیفِ اعتبار", "Activate with wallet credit") : tr(`پرداخت ${payLabel}`, `Pay ${payLabel}`)}</span>
          </span>
        )}
      </button>
    </section>
  );
}
