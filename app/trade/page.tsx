"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { useSession } from "next-auth/react";
import { ModuleGate } from "@/components/ModuleGate";
import { AuthGate } from "@/components/AuthGate";
import { PanelSkeleton } from "@/components/PanelSkeleton";
import { MarketTicker } from "@/components/MarketTicker";
import { ICONS } from "@/components/NavDrawer";

// هابِ بخشِ ترید — تنها ورودیِ ماژول. منو دیگر زیرمجموعه ندارد؛ با زدنِ
// «ترید» مستقیم همین صفحه بالا می‌آید و انتخابِ بخش این‌جا انجام می‌شود.
// چیدمان و حرکتِ کارت‌ها عیناً همان الگوی ردیف‌های پنل کاربری است
// (آیکون در دایره‌ی نرم + عنوان + توضیح + شِوران)، نه یک الگوی تازه.

const ITEMS: { href: string; title: string; desc: string; icon: keyof typeof ICONS }[] = [
  { href: "/trade/chart", title: "چارت", desc: "چارت تریدینگ‌ویو، تقویم اقتصادی و گفت‌وگوی هر نماد", icon: "trade" },
  { href: "/trade/journal", title: "ژورنال‌نویسی", desc: "حساب‌های معاملاتی، ثبت معامله و آمار عملکرد", icon: "journal" },
  { href: "/trade/checklists", title: "چک‌لیست", desc: "شرط‌های ورود و اتصالشان به معامله", icon: "checklist" },
  { href: "/trade/calendar", title: "تقویم اقتصادی", desc: "رویدادهای مهم بازار، با هشدار قبل از انتشار", icon: "weekly" },
  { href: "/trade/clock", title: "ساعت فارکس", desc: "وضعیت لحظه‌ای جلسه‌های معاملاتی", icon: "trade" },
  { href: "/trade/notes", title: "یادداشت‌ها", desc: "تحلیل‌ها و تجربه‌های شخصی", icon: "journal" },
  { href: "/trade/metatrader", title: "اتصال متاتریدر", desc: "دریافت خودکار معاملات، برای هر حساب جداگانه", icon: "trade" },
];

export default function TradePage() {
  const { status } = useSession();

  return (
    <section className="trade-desktop">
      <MarketTicker />
      <h1>ترید</h1>
      <div className="section-note">از چک‌لیست تا ثبت معامله و تحلیل عملکرد — همه در یک جا</div>

      {status === "loading" && <PanelSkeleton />}
      {status === "unauthenticated" && <AuthGate message="برای استفاده از این سرویس وارد شوید" />}

      {status === "authenticated" && (
        <ModuleGate module="TRADE">
          <div className="trade-hub-grid">
            {ITEMS.map((it, i) => (
              <motion.div
                key={it.href}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.34, delay: i * 0.045, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link href={it.href} prefetch className="trade-surface trade-hub-box">
                  <span className="trade-hub-icon">{ICONS[it.icon]}</span>
                  <span className="trade-hub-body">
                    <span className="trade-hub-title">{it.title}</span>
                    <span className="trade-hub-desc">{it.desc}</span>
                  </span>
                  <ChevronLeft size={17} className="trade-hub-chevron" />
                </Link>
              </motion.div>
            ))}
          </div>
        </ModuleGate>
      )}
    </section>
  );
}
