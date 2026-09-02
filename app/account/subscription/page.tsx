"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getAccount, AccountData } from "@/lib/accountCache";
import { toJalali, J_MONTHS } from "@/lib/jalali";
import { AccountBackButton } from "@/components/AccountBackButton";

type SubUser = {
  isSuperAdmin: boolean;
  subscriptions: { status: string; currentPeriodEnd: string; plan: { nameFa: string; key: string } }[];
};

// تاریخ با ارقامِ انگلیسی — `toLocaleDateString("fa-IR")` ارقامِ فارسی می‌داد
function formatJalaliDate(iso: string): string {
  const d = new Date(iso);
  const [jy, jm, jd] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${jd} ${J_MONTHS[jm - 1]} ${jy}`;
}

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
      <AccountBackButton />
      <h1>اشتراک</h1>
      <div className="account-content-hint">وضعیتِ فعلیِ اشتراکِ حسابت</div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="account-card" style={{ padding: 16 }}>
        {data.isSuperAdmin ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="about-label">وضعیت</span>
            <span style={{ color: "var(--accent)", fontWeight: 700 }}>سوپریوزر — دسترسی نامحدود</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="about-label">پلنِ فعلی</span>
              <span style={{ fontWeight: 700, color: "var(--text)" }}>{currentSub ? currentSub.plan.nameFa : "بدون اشتراک فعال"}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="about-label">وضعیت</span>
              <span style={{ color: "var(--text)" }}>{currentSub ? SUB_STATUS_FA[currentSub.status] || currentSub.status : "—"}</span>
            </div>
            {currentSub?.currentPeriodEnd && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="about-label">تاریخ پایان</span>
                <span className="mono" dir="ltr" style={{ color: "var(--text)" }}>{formatJalaliDate(currentSub.currentPeriodEnd)}</span>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {!data.isSuperAdmin && (
        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <Link href="/subscription" className="account-sub-cta-btn">مشاهده و مدیریت پلن‌ها</Link>
        </div>
      )}
    </section>
  );
}
