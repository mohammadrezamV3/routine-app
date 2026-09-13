"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { LogOut } from "lucide-react";
import { AccountRowLink } from "@/components/AccountRow";
import { logoutAndRedirect } from "@/lib/logout";
import { AccountHeroCard } from "@/components/AccountHeroCard";
import { getAccount, getAvatarUrl, AccountData } from "@/lib/accountCache";
import { ACCOUNT_SECTIONS } from "@/components/accountSections";

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

      <div className="account-card account-card-full">
        {ACCOUNT_SECTIONS.map((s, i) => (
          <AccountRowLink key={s.href} href={s.href} icon={s.icon} label={s.label} desc={s.desc} index={i} />
        ))}
      </div>

      {/* ته صفحه‌ی اولِ پنل: خروج از حساب، لینک‌های حقوقی، و نسخه‌ی اپ.
          دکمه‌ی خروج فقط روی موبایل رندر می‌شود (با CSS) — روی دسکتاپ خودِ
          سایدبار دکمه‌اش را دارد و دو دکمه‌ی خروج توی یک صفحه گیج‌کننده است. */}
      <div className="account-index-foot">
        <button type="button" className="account-index-logout" onClick={logoutAndRedirect}>
          <LogOut size={15} />
          <span>خروج از حساب</span>
        </button>

        <nav className="account-index-links">
          <Link href="/terms">قوانین و مقررات</Link>
          <span aria-hidden="true">·</span>
          <Link href="/about">درباره آریون</Link>
          <span aria-hidden="true">·</span>
          <Link href="/blog">وبلاگ</Link>
        </nav>

        <div className="account-index-version mono" dir="ltr">
          Arion v{process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0"}
        </div>
      </div>
    </section>
  );
}
