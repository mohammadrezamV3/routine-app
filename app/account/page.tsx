"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AccountRowLink } from "@/components/AccountRow";
import { AccountHeroCard } from "@/components/AccountHeroCard";
import { getAccount, getAvatarUrl, AccountData } from "@/lib/accountCache";
import { ACCOUNT_SECTIONS } from "./layout";

type IndexUser = {
  name: string | null; lastName: string | null; username: string | null;
  subscriptions: { status: string; plan: { key: string; nameFa: string } }[];
};

// صفحه‌ی اول پنل کاربری — فقط سرصفحه (آواتار/نام/وضعیت پریمیوم) + فهرست
// زبانه‌ها با آیکون؛ محتوای هر بخش (پروفایل، تنظیمات و...) توی صفحه‌ی
// اختصاصی خودش با کلیک روی همین ردیف‌ها باز می‌شه.
export default function AccountIndexPage() {
  const [data, setData] = useState<IndexUser | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    getAccount().then((res: AccountData) => {
      const u = res?.user as IndexUser | undefined;
      if (u) setData(u);
    });
    getAvatarUrl().then(setAvatarUrl);
  }, []);

  const fullName = data ? [data.name, data.lastName].filter(Boolean).join(" ") || "کاربر آریون" : "";
  // /api/account فقط اشتراک واقعا فعال (ACTIVE/TRIAL منقضی‌نشده) رو برمی‌گردونه،
  // پس این‌جا دیگه لازم نیست وضعیت دوباره چک بشه — قبلا «آخرین ردیف ساخته‌شده»
  // می‌اومد و یه اشتراک منقضی هم «پریمیوم» نشون داده می‌شد.
  const sub = data?.subscriptions?.[0];
  const isPremium = !!sub && sub.plan.key !== "basic";

  return (
    <section>
      {data && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
          <AccountHeroCard fullName={fullName} username={data.username} avatarUrl={avatarUrl} isPremium={isPremium} planNameFa={sub?.plan.nameFa ?? null} />
        </motion.div>
      )}

      <div className="account-card">
        {ACCOUNT_SECTIONS.map((s, i) => (
          <AccountRowLink key={s.href} href={s.href} icon={s.icon} label={s.label} index={i} />
        ))}
      </div>
    </section>
  );
}
