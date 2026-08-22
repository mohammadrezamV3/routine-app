"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { CheckCircle2, XCircle } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { getSiteMarket } from "@/lib/market";
import { PlansSection } from "@/components/PlanShowcase";

type SubscriptionInfo = { planId: string; status: string; currentPeriodEnd: string; plan: { key: string; nameFa: string } } | null;

// صفحه‌ی مستقلِ «اشتراک» — همون کارت‌ها/جدولِ مقایسه‌ی صفحه‌ی لندینگ رو
// اینجا هم نشون می‌ده (از طریقِ PlansSection مشترک)، فقط دکمه‌ی هر پلن
// به‌جای بردن به ثبت‌نام، می‌بره به چک‌اوتِ واقعی — پلنِ فعلیِ کاربر هم
// به‌جای دکمه‌ی خرید یه نشانِ «پلنِ فعلیِ تو» می‌گیره.
export default function SubscriptionPage() {
  const { status } = useSession();
  const [checkoutResult, setCheckoutResult] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const isIntl = getSiteMarket() === "INTERNATIONAL";

  // از window.location مستقیم می‌خونیم تا نیازی به useSearchParams/Suspense
  // نباشه (قاعده‌ی معمولِ پروژه — نگاه کن به app/auth/login/page.tsx).
  useEffect(() => {
    setCheckoutResult(new URLSearchParams(window.location.search).get("checkout"));
  }, []);

  // پنل Owner › Funnel — یک بار به‌ازای هر بازدیدِ واقعیِ این صفحه، بی‌صدا و
  // بدون تأثیر روی تجربه‌ی کاربر (fire-and-forget)
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
        setIsSuperAdmin(!!data.isSuperAdmin);
        setLoaded(true);
      });
  }, [status]);

  if (status !== "authenticated") {
    return (
      <section className="subscription-page">
        <h1>اشتراک</h1>
        <AuthGate message="برای مشاهده‌ی پلن‌های اشتراک وارد شوید" />
      </section>
    );
  }

  return (
    <section className="subscription-page">
      <h1>اشتراک</h1>

      {checkoutResult === "success" && (
        <div className="checkout-status-banner success">
          <CheckCircle2 size={18} /> پرداخت با موفقیت انجام شد — پلنِ جدید فعال شد.
        </div>
      )}
      {checkoutResult === "failed" && (
        <div className="checkout-status-banner failed">
          <XCircle size={18} /> پرداخت ناموفق بود یا لغو شد — چیزی از حسابت کم نشده.
        </div>
      )}

      <div className="section-note">
        {isSuperAdmin
          ? "دسترسیِ نامحدود داری — نیازی به اشتراک نداری"
          : subscription
          ? `پلنِ فعلی: ${subscription.plan.nameFa} — ${subscription.status === "TRIAL" ? "دوره آزمایشی" : "فعال"}`
          : "هنوز پلن پولی فعالی نداری — فقط ماژول‌های دوره آزمایشی در دسترسته"}
      </div>

      {!loaded ? (
        <div className="item-line" style={{ marginTop: 14 }}>در حال بارگذاری…</div>
      ) : (
        <div style={{ marginTop: 8 }}>
          <PlansSection isIntl={isIntl} mode="account" currentPlanKey={subscription?.plan.key ?? null} title="" />
        </div>
      )}
    </section>
  );
}
