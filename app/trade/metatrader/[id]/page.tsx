"use client";

import { useEffect, useState } from "react";
import { TradePageShell } from "@/components/TradePageShell";
import { TradeMtAccountPanel } from "@/components/TradeMtAccountPanel";

// دکمه‌ی بازگشت باید به همان جایی برگردد که کاربر از آن آمده.
//
// قبلا همیشه به فهرست متاتریدر برمی‌گشت — یعنی کسی که از ژورنال ← صفحه‌ی
// حساب ← متاتریدر آمده بود، با بازگشت سر از فهرست متاتریدر درمی‌آورد و از
// آنجا هم دکمه‌ی بازگشتش به هاب ترید می‌رفت، نه به ژورنال. حالا لینکِ
// صفحه‌ی حساب `?from=account` می‌فرستد و بازگشت به خود همان حساب می‌رود.
//
// `useSearchParams` عمدا استفاده نشده تا این صفحه نیازی به Suspense نداشته
// باشد — همان قاعده‌ی بقیه‌ی صفحه‌های پروژه (نگاه کن به app/auth/login).
export default function TradeMetaTraderAccountPage({ params }: { params: { id: string } }) {
  const [fromAccount, setFromAccount] = useState(false);

  useEffect(() => {
    setFromAccount(new URLSearchParams(window.location.search).get("from") === "account");
  }, []);

  return (
    <TradePageShell
      title="اتصال متاتریدر"
      back={
        fromAccount
          ? { href: `/trade/accounts/${params.id}`, label: "حساب" }
          : { href: "/trade/metatrader", label: "اتصال متاتریدر" }
      }
    >
      <TradeMtAccountPanel accountId={params.id} />
    </TradePageShell>
  );
}
