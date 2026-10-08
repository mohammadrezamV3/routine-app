"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { CheckCircle2, XCircle } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { PlansSection, UpgradeOffer, BREAKOUT } from "@/components/PlanShowcase";
import { PremiumUnlockCelebration } from "@/components/PremiumUnlockCelebration";
import { FREE_ROUTINE_COPY_FA } from "@/lib/trial";
import { planDisplayName, trialCopy, freeRoutineCopyEn } from "@/lib/subscriptionI18n";
import { fillPriceCopy } from "@/lib/planPricing";
import { usePlanPricing } from "@/lib/usePlanPricing";
import { tr } from "@/lib/i18n";

type SubscriptionInfo = { planId: string; status: string; currentPeriodEnd: string; plan: { key: string; nameFa: string } } | null;

// صفحه‌ی مستقل «اشتراک» — همون کارت‌ها/جدول مقایسه‌ی صفحه‌ی لندینگ رو
// اینجا هم نشون می‌ده (از طریق PlansSection مشترک)، فقط دکمه‌ی هر پلن
// به‌جای بردن به ثبت‌نام، می‌بره به چک‌اوت واقعی — پلن فعلی کاربر هم
// به‌جای دکمه‌ی خرید یه نشان «پلن فعلی تو» می‌گیره.
export default function SubscriptionPage() {
  const { status } = useSession();
  const { pricing } = usePlanPricing();
  const [checkoutResult, setCheckoutResult] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo>(null);
  const [upgradeOffer, setUpgradeOffer] = useState<UpgradeOffer | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // از window.location مستقیم می‌خونیم تا نیازی به useSearchParams/Suspense
  // نباشه (قاعده‌ی معمول پروژه — نگاه کن به app/auth/login/page.tsx).
  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("checkout");
    setCheckoutResult(result);
    if (result === "success") setShowCelebration(true);
  }, []);

  // پنل Owner › Funnel — یک بار به‌ازای هر بازدید واقعی این صفحه، بی‌صدا و
  // بدون تاثیر روی تجربه‌ی کاربر (fire-and-forget)
  useEffect(() => {
    if (status === "loading") return;
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "view_subscription_page" }),
    }).catch(() => {});
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/plans")
      .then((r) => r.json())
      .then((data) => {
        setSubscription(data.subscription || null);
        setUpgradeOffer(data.upgradeOffer || null);
        setIsSuperAdmin(!!data.isSuperAdmin);
        setLoaded(true);
      });
  }, [status]);

  if (status !== "authenticated") {
    return (
      <section className="subscription-page">
        {/* BREAKOUT: تیتر باید با کارت‌های پلن (که خودشون از ستون باریک
            ۶۲۰px بیرون می‌زنن) هم‌لبه بمونه — بدونش تیتر توی همون ستون
            باریک می‌موند و روی دسکتاپ نسبت به کارت‌های عریض‌تر زیرش،
            راست‌چین به‌نظر نمی‌رسید (لبه‌ی راستش با لبه‌ی راست کارت‌ها
            یکی نبود). */}
        <h1 className={BREAKOUT}>{tr("اشتراک", "Subscription")}</h1>
        <AuthGate message={tr("برای مشاهده‌ی پلن‌های اشتراک وارد شوید", "Log in to see the subscription plans")} />
      </section>
    );
  }

  return (
    <section className="subscription-page">
      <h1 className={BREAKOUT}>{tr("اشتراک", "Subscription")}</h1>

      {checkoutResult === "success" && (
        <div className="checkout-status-banner success">
          <CheckCircle2 size={18} /> {tr("پرداخت با موفقیت انجام شد — پلن جدید فعال شد.", "Payment successful. Your new plan is active.")}
        </div>
      )}
      {checkoutResult === "failed" && (
        <div className="checkout-status-banner failed">
          <XCircle size={18} /> {tr("پرداخت ناموفق بود یا لغو شد — چیزی از حسابت کم نشده.", "The payment failed or was cancelled. Nothing was charged.")}
        </div>
      )}

      <div className="section-note">
        {isSuperAdmin
          ? tr("دسترسی نامحدود داری — نیازی به اشتراک نداری", "You have unlimited access, no subscription needed")
          : subscription
          ? tr(`پلن فعلی: ${subscription.plan.nameFa} — ${subscription.status === "TRIAL" ? "دوره آزمایشی" : "فعال"}`, `Current plan: ${planDisplayName(subscription.plan)} — ${subscription.status === "TRIAL" ? "trial" : "active"}`)
          : tr(`هنوز پلن پولی فعالی نداری. ${fillPriceCopy(FREE_ROUTINE_COPY_FA, pricing)} هر حساب تازه: ${trialCopy()}؛ بعدش برای ادامه یکی از پلن‌ها رو انتخاب کن.`, `You do not have an active paid plan yet. ${freeRoutineCopyEn(pricing)} Every new account gets: ${trialCopy()}. After that, pick a plan to continue.`)}
      </div>

      {!loaded ? (
        <div className="item-line is-loading" style={{ marginTop: 14 }}>{tr("در حال بارگذاری…", "Loading…")}</div>
      ) : (
        <div style={{ marginTop: 8 }}>
          <PlansSection mode="account" currentPlanKey={subscription?.plan.key ?? null} title="" upgradeOffer={upgradeOffer} />
        </div>
      )}

      {showCelebration && <PremiumUnlockCelebration onClose={() => setShowCelebration(false)} />}
    </section>
  );
}
