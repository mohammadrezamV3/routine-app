"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { ModuleGate } from "./ModuleGate";
import { AuthGate } from "./AuthGate";
import { PanelSkeleton } from "./PanelSkeleton";

/**
 * پوسته‌ی مشترک همه‌ی زیرصفحه‌های ترید — عنوان، لینک بازگشت، گیت‌ها و
 * ورود نرم، همه یک‌جا.
 *
 * چرا یک کامپوننت مشترک: هر شش زیرصفحه عینا همین ساختار را داشتند و یک
 * باگ یکسان: تا وقتی `useSession()` هنوز `loading` بود، شرط
 * `status === "authenticated" ? ... : <AuthGate/>` باعث می‌شد کاربر
 * لاگین‌کرده یک لحظه پیام «وارد شوید» ببیند و بعد صفحه عوض شود. همان
 * پرش کوتاه بخش بزرگی از حس «سخت و ناگهانی» بودن باز شدن صفحه بود.
 * حالا در حالت loading اسکلت همیشگی اپ دیده می‌شود، نه پیام اشتباه.
 */
export function TradePageShell({
  title,
  note,
  back = { href: "/trade", label: "ترید" },
  titleAction,
  fullBleed = false,
  noScroll = false,
  children,
}: {
  title: string;
  note?: string;
  back?: { href: string; label: string } | null;
  titleAction?: React.ReactNode;
  /**
   * دیوار-تا-دیوار روی دسکتاپ: عرضِ ثابتِ ۱۱۰۰پیکسلیِ `.trade-desktop` را
   * برمی‌دارد تا محتوا خودش بتواند تا لبه‌های پنجره باز شود (صفحه‌ی چارت).
   */
  fullBleed?: boolean;
  /**
   * صفحه‌هایی که یک لیستِ بلند دارند (یادداشت‌ها/چک‌لیست‌ها/ژورنال): طبقِ
   * درخواستِ صریح، خودِ صفحه دیگر اسکرول نمی‌خورد — فقط همین ناحیه‌ی
   * محتوا (زیرِ تایتل/سرصفحه) داخلش اسکرول دارد، هم‌الگویِ همان تکنیکِ
   * `--tv-h` در صفحه‌ی چارت (ارتفاعِ واقعیِ «از اینجا تا کفِ پنجره»، چون
   * ارتفاعِ سرصفحه ثابت نیست و با شکستنِ خط عوض می‌شود).
   */
  noScroll?: boolean;
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!noScroll) return;
    const el = boxRef.current;
    if (!el) return;
    const apply = () => {
      if (window.innerWidth < 1024) { el.style.removeProperty("--tp-h"); return; }
      const top = el.getBoundingClientRect().top;
      const bodyPad = parseFloat(getComputedStyle(document.body).paddingBottom) || 0;
      const h = window.innerHeight - top - Math.min(bodyPad, 24) - 12;
      el.style.setProperty("--tp-h", `${Math.max(360, Math.round(h))}px`);
    };
    apply();
    const t = setTimeout(apply, 460);
    window.addEventListener("resize", apply);
    return () => { clearTimeout(t); window.removeEventListener("resize", apply); };
  }, [noScroll, status]);

  return (
    <section className={fullBleed ? "trade-desktop trade-desktop-full" : "trade-desktop"}>
      {/* در حالتِ تمام‌صفحه، لینکِ بازگشت و عنوان یک ردیف‌اند — هر ردیفِ
          جدا در این صفحه یعنی همان‌قدر ارتفاعِ کمتر برای چارت. */}
      {fullBleed ? (
        <div className="trade-head-inline">
          {back && (
            <Link href={back.href} prefetch className="trade-back-link">
              <ChevronRight size={15} /> {back.label}
            </Link>
          )}
          {!!title && <h1>{title}</h1>}
          {titleAction}
        </div>
      ) : (
        <>
          {back && (
            <Link href={back.href} prefetch className="trade-back-link">
              <ChevronRight size={15} /> {back.label}
            </Link>
          )}
          <div className={titleAction ? "trade-head-row" : undefined}>
            <h1>{title}</h1>
            {titleAction}
          </div>
        </>
      )}
      {note && <div className="section-note">{note}</div>}

      {status === "loading" && <PanelSkeleton />}

      {status === "unauthenticated" && <AuthGate message="برای استفاده از این سرویس وارد شوید" />}

      {status === "authenticated" && (
        <ModuleGate module="TRADE">
          <motion.div
            ref={noScroll ? boxRef : undefined}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
            className={noScroll ? "trade-noscroll-box thin-scroll" : undefined}
          >
            {children}
          </motion.div>
        </ModuleGate>
      )}
    </section>
  );
}
