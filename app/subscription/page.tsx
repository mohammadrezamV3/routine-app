"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Check } from "lucide-react";
import type { ModuleKey } from "@prisma/client";
import { AuthGate } from "@/components/AuthGate";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { MODULE_LABELS_FA } from "@/lib/modules";

type Plan = { id: string; key: string; nameFa: string; currency: "IRR" | "USD"; priceMonthly: number; priceYearly: number | null; modules: ModuleKey[] };
type SubscriptionInfo = { planId: string; status: string; currentPeriodEnd: string; plan: { nameFa: string } } | null;
type Interval = "monthly" | "yearly";

function formatPrice(amount: number, currency: "IRR" | "USD"): string {
  if (currency === "USD") return `$${(amount / 100).toLocaleString("en-US")}`;
  // priceMonthly/priceYearly برای IRR به ریال ذخیره شده — نمایش به تومان
  return `${Math.round(amount / 10).toLocaleString("fa-IR")} تومان`;
}

// صفحه‌ی مستقلِ «اشتراک» — قبلاً کلیک روی این دکمه فقط پنلِ کاربری رو باز
// می‌کرد که یک خطِ متنیِ وضعیتِ اشتراک داشت؛ طبقِ درخواستِ صریحِ کاربر الان
// یک صفحه‌ی کاملِ مقایسه‌ی پلن‌هاست. درگاهِ پرداخت هنوز وصل نشده (روی
// روادمپِ امنیت/دیپلویِ پروژه هنوز مونده)، پس دکمه‌ی هر پلن به‌جای خرید
// واقعی، وضعیتِ «به‌زودی» رو صادقانه نشون می‌ده — به‌جز پلنِ فعلیِ کاربر.
export default function SubscriptionPage() {
  const { status } = useSession();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [interval, setInterval_] = useState<Interval>("monthly");

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/plans")
      .then((r) => r.json())
      .then((data) => {
        const sorted = [...(data.plans || [])].sort((a: Plan, b: Plan) => a.priceMonthly - b.priceMonthly);
        setPlans(sorted);
        setSubscription(data.subscription || null);
        setIsSuperAdmin(!!data.isSuperAdmin);
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

  const hasYearly = (plans || []).some((p) => p.priceYearly != null);

  return (
    <section className="subscription-page">
      <h1>اشتراک</h1>
      <div className="section-note">
        {isSuperAdmin
          ? "دسترسیِ نامحدود داری — نیازی به اشتراک نداری"
          : subscription
          ? `پلنِ فعلی: ${subscription.plan.nameFa} — ${subscription.status === "TRIAL" ? "دوره آزمایشی" : "فعال"}`
          : "هنوز پلن پولی فعالی نداری — فقط ماژول‌های دوره آزمایشی در دسترسته"}
      </div>

      {hasYearly && !isSuperAdmin && (
        <div className="sub-interval-toggle">
          <SegmentedTabs
            active={interval}
            onChange={setInterval_}
            options={[
              { value: "monthly" as Interval, label: "ماهانه" },
              { value: "yearly" as Interval, label: "سالانه" },
            ]}
          />
        </div>
      )}

      {plans === null ? (
        <div className="item-line" style={{ marginTop: 14 }}>در حال بارگذاری…</div>
      ) : (
        <div className="sub-plans-grid">
          {plans.map((p) => {
            const isCurrent = subscription?.planId === p.id;
            const price = interval === "yearly" && p.priceYearly ? p.priceYearly : p.priceMonthly;
            return (
              <div key={p.id} className={`sub-plan-card${isCurrent ? " current" : ""}`}>
                {isCurrent && <div className="sub-plan-badge">پلنِ فعلیِ تو</div>}
                <div className="sub-plan-name">{p.nameFa}</div>
                <div className="sub-plan-price">
                  {formatPrice(price, p.currency)}
                  <span className="sub-plan-price-unit">/ {interval === "yearly" ? "سال" : "ماه"}</span>
                </div>
                <ul className="sub-plan-modules">
                  {p.modules.map((m) => (
                    <li key={m}>
                      <Check size={14} />
                      {MODULE_LABELS_FA[m]}
                    </li>
                  ))}
                </ul>
                <button type="button" className="sub-plan-cta" disabled>
                  {isCurrent ? "پلنِ فعلیِ تو" : "به‌زودی فعال می‌شه"}
                </button>
              </div>
            );
          })}
          {!plans.length && <div className="item-line empty">فعلاً پلنی برای بازارِ تو تعریف نشده.</div>}
        </div>
      )}
    </section>
  );
}
