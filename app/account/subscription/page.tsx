"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAccount, AccountData } from "@/lib/accountCache";

type SubUser = {
  isSuperAdmin: boolean;
  subscriptions: { status: string; currentPeriodEnd: string; plan: { nameFa: string; key: string } }[];
};

const SUB_STATUS_FA: Record<string, string> = {
  TRIAL: "دوره آزمایشی",
  ACTIVE: "فعال",
  PAST_DUE: "پرداخت معوق",
  CANCELED: "لغوشده",
  EXPIRED: "منقضی",
};

// عمداً فقط خلاصه — طبقِ درخواستِ صریح («این قسمت نباید تبدیل به صفحه‌ی
// فروشِ بزرگ بشه»). صفحه‌ی واقعیِ پلن‌ها/قیمت‌گذاری همون /subscription
// موجوده که قبلاً کاملاً ساخته شده؛ این‌جا فقط بهش لینک می‌دیم.
export default function AccountSubscriptionPage() {
  const [data, setData] = useState<SubUser | null>(null);

  useEffect(() => {
    getAccount().then((res: AccountData) => {
      const u = res?.user as SubUser | undefined;
      if (u) setData(u);
    });
  }, []);

  if (!data) return null;

  const currentSub = data.subscriptions?.[0];

  return (
    <section>
      <h1>اشتراک</h1>
      <div className="account-content-hint">وضعیتِ فعلیِ اشتراکِ حسابت</div>

      {data.isSuperAdmin ? (
        <div className="about-list">
          <div className="about-row">
            <span className="about-label">وضعیت</span>
            <span style={{ color: "var(--accent)", fontWeight: 700 }}>سوپریوزر — دسترسی نامحدود</span>
          </div>
        </div>
      ) : (
        <div className="about-list">
          <div className="about-row">
            <span className="about-label">پلنِ فعلی</span>
            <span style={{ fontWeight: 700 }}>{currentSub ? currentSub.plan.nameFa : "بدون اشتراک فعال"}</span>
          </div>
          <div className="about-row">
            <span className="about-label">وضعیت</span>
            <span>{currentSub ? SUB_STATUS_FA[currentSub.status] || currentSub.status : "—"}</span>
          </div>
          {currentSub?.currentPeriodEnd && (
            <div className="about-row">
              <span className="about-label">تاریخ پایان</span>
              <span className="mono" dir="ltr">{new Date(currentSub.currentPeriodEnd).toLocaleDateString("fa-IR")}</span>
            </div>
          )}
        </div>
      )}

      {!data.isSuperAdmin && (
        <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
          <Link href="/subscription" className="account-sub-cta-btn">مدیریت اشتراک</Link>
          <Link href="/subscription" className="account-sub-cta-btn account-sub-cta-btn-outline">ارتقا به پلن بالاتر</Link>
        </div>
      )}
    </section>
  );
}
