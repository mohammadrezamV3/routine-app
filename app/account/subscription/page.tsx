"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getAccount, AccountData } from "@/lib/accountCache";
import { toJalali, J_MONTHS } from "@/lib/jalali";
import { AccountPageHead, AccountBlock, AccountLine } from "@/components/AccountUI";
import { CreditCard } from "lucide-react";

type SubUser = {
  isSuperAdmin: boolean;
  subscriptions: { status: string; currentPeriodEnd: string; plan: { nameFa: string; key: string } }[];
};

// تاریخ با ارقام انگلیسی — `toLocaleDateString("fa-IR")` ارقام فارسی می‌داد
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

// عمدا فقط خلاصه — طبق درخواست صریح («این قسمت نباید تبدیل به صفحه‌ی
// فروش بزرگ بشه»). صفحه‌ی واقعی پلن‌ها/قیمت‌گذاری همون /subscription
// موجوده که قبلا کاملا ساخته شده؛ این‌جا فقط بهش لینک می‌دیم.
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
      <AccountPageHead title="اشتراک" hint="وضعیت فعلی اشتراک حسابت" />

      <AccountBlock title="پلن فعلی" icon={<CreditCard size={15} />} flush>
        {data.isSuperAdmin ? (
          <AccountLine label="وضعیت" value="سوپریوزر — دسترسی نامحدود" />
        ) : (
          <>
            <AccountLine label="پلن فعلی" value={currentSub ? currentSub.plan.nameFa : "بدون اشتراک فعال"} />
            <AccountLine label="وضعیت" value={currentSub ? SUB_STATUS_FA[currentSub.status] || currentSub.status : "—"} />
            {currentSub?.currentPeriodEnd && (
              <AccountLine label="تاریخ پایان" value={formatJalaliDate(currentSub.currentPeriodEnd)} mono />
            )}
          </>
        )}
      </AccountBlock>

      {!data.isSuperAdmin && (
        <Link href="/subscription" className="account-sub-cta-btn">مشاهده و مدیریت پلن‌ها</Link>
      )}
    </section>
  );
}
