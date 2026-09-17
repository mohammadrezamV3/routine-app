"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LogOut } from "lucide-react";
import { AccountRowLink, AccountRowButton } from "@/components/AccountRow";
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
  const router = useRouter();
  const [data, setData] = useState<IndexUser | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // طبقِ درخواستِ صریح: روی دسکتاپ سایدبار (app/account/layout.tsx) از قبل
  // همینِ فهرستِ بخش‌ها را نشان می‌دهد، پس تکرارش این‌جا (توی ستونِ محتوا)
  // یک باکسِ اضافه‌ی بی‌فایده بود — «سمتِ چپیِ» گزارش‌شده. روی دسکتاپ، پیشِ‌فرض
  // مستقیم می‌رود روی «پروفایل»؛ موبایل (که سایدبار ندارد) دست‌نخورده می‌ماند.
  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      router.replace("/account/profile");
    }
  }, [router]);

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

  // همون توالیِ خروجِ سایدبارِ دسکتاپ (app/account/layout.tsx) — طبقِ
  // گزارشِ باگ، روی موبایل سایدبار دیده نمی‌شه و راهِ دیگه‌ای برای خروج از
  // حساب نبود. این‌جا (صفحه‌ی اولِ پنل) تنها جایی‌ست که موبایل همیشه بهش
  // می‌رسه، پس همین‌جا هم اضافه شد.
  return (
    <section>
      {data && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
          <AccountHeroCard fullName={fullName} username={data.username} avatarUrl={avatarUrl} isPremium={isPremium} planNameFa={sub?.plan.nameFa ?? null} />
        </motion.div>
      )}

      {/* طبقِ درخواستِ صریح، «خروج از حساب» دیگر باکسِ جدا و مجزا نیست —
          داخلِ همون یک کارتِ بخش‌ها می‌نشیند، درست مثلِ بقیه‌ی ردیف‌ها. */}
      <div className="account-card account-card-full">
        {ACCOUNT_SECTIONS.map((s, i) => (
          <AccountRowLink key={s.href} href={s.href} icon={s.icon} label={s.label} desc={s.desc} index={i} />
        ))}
        <AccountRowButton
          icon={<LogOut size={15} />}
          label="خروج از حساب"
          onClick={logoutAndRedirect}
          danger
          index={ACCOUNT_SECTIONS.length}
        />
      </div>

      {/* طبقِ درخواستِ صریح، لینک‌های حقوقی/فوتر حذف شدند — فقط نسخه‌ی اپ
          می‌ماند، آن‌هم دیگر وسطِ صفحه نیست: گوشه‌ی پایین-راست. */}
      <div className="account-index-version mono" dir="ltr">
        Arion v{process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0"}
      </div>
    </section>
  );
}
