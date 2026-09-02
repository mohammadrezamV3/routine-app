"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { ModuleGate } from "./ModuleGate";
import { AuthGate } from "./AuthGate";
import { PanelSkeleton } from "./PanelSkeleton";

/**
 * پوسته‌ی مشترکِ همه‌ی زیرصفحه‌های ترید — عنوان، لینکِ بازگشت، گیت‌ها و
 * ورودِ نرم، همه یک‌جا.
 *
 * چرا یک کامپوننتِ مشترک: هر شش زیرصفحه عیناً همین ساختار را داشتند و یک
 * باگِ یکسان: تا وقتی `useSession()` هنوز `loading` بود، شرطِ
 * `status === "authenticated" ? ... : <AuthGate/>` باعث می‌شد کاربرِ
 * لاگین‌کرده یک لحظه پیامِ «وارد شوید» ببیند و بعد صفحه عوض شود. همان
 * پرشِ کوتاه بخشِ بزرگی از حسِ «سخت و ناگهانی» بودنِ باز شدنِ صفحه بود.
 * حالا در حالتِ loading اسکلتِ همیشگیِ اپ دیده می‌شود، نه پیامِ اشتباه.
 */
export function TradePageShell({
  title,
  note,
  back = { href: "/trade", label: "ترید" },
  titleAction,
  children,
}: {
  title: string;
  note?: string;
  back?: { href: string; label: string } | null;
  titleAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { status } = useSession();

  return (
    <section className="trade-desktop">
      {back && (
        <Link href={back.href} prefetch className="trade-back-link">
          <ChevronRight size={15} /> {back.label}
        </Link>
      )}
      <div className={titleAction ? "trade-head-row" : undefined}>
        <h1>{title}</h1>
        {titleAction}
      </div>
      {note && <div className="section-note">{note}</div>}

      {status === "loading" && <PanelSkeleton />}

      {status === "unauthenticated" && <AuthGate message="برای استفاده از این سرویس وارد شوید" />}

      {status === "authenticated" && (
        <ModuleGate module="TRADE">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </ModuleGate>
      )}
    </section>
  );
}
