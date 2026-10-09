"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { ModuleGate } from "@/components/ModuleGate";
import { AuthGate } from "@/components/AuthGate";
import { PanelSkeleton } from "@/components/PanelSkeleton";
import { ICONS } from "@/components/NavDrawer";
import { TradeShareButton } from "@/components/TradeShareButton";
import { featureVisible, type FeatureKey } from "@/lib/featureFlags";
import { useFeatures } from "@/lib/useFeatures";
import { isEn, pick, tr, type Localized } from "@/lib/i18n";

// هاب بخش ترید — تنها ورودی ماژول. منو دیگر زیرمجموعه ندارد؛ با زدن
// «ترید» مستقیم همین صفحه بالا می‌آید و انتخاب بخش این‌جا انجام می‌شود.
// چیدمان و حرکت کارت‌ها عینا همان الگوی ردیف‌های پنل کاربری است
// (آیکون در دایره‌ی نرم + عنوان + توضیح + شوران)، نه یک الگوی تازه.

const ITEMS: { href: string; title: Localized; desc: Localized; icon: keyof typeof ICONS; feature: FeatureKey }[] = [
  { href: "/trade/chart", title: { fa: "چارت", en: "Chart" }, desc: { fa: "چارت تریدینگ‌ویو، تقویم اقتصادی و گفت‌وگوی هر نماد", en: "TradingView chart, economic calendar and a chat room for every symbol" }, icon: "trade", feature: "tradeChart" },
  { href: "/trade/journal", title: { fa: "ژورنال‌نویسی", en: "Journal" }, desc: { fa: "حساب‌های معاملاتی، ثبت معامله و آمار عملکرد", en: "Trading accounts, trade logging and performance stats" }, icon: "journal", feature: "tradeJournal" },
  { href: "/trade/checklists", title: { fa: "چک‌لیست", en: "Checklists" }, desc: { fa: "شرط‌های ورود و اتصالشان به معامله", en: "Entry conditions and linking them to trades" }, icon: "checklist", feature: "tradeChecklists" },
  { href: "/trade/calendar", title: { fa: "تقویم اقتصادی", en: "Economic calendar" }, desc: { fa: "رویدادهای مهم بازار، با هشدار قبل از انتشار", en: "Key market events, with alerts before release" }, icon: "weekly", feature: "economicCalendar" },
  { href: "/trade/risk", title: { fa: "ریسک و سود", en: "Risk and reward" }, desc: { fa: "حجم معامله، نسبت ریسک به سود و حداقل درصد برد", en: "Position size, risk to reward ratio and minimum win rate" }, icon: "checklist", feature: "tradeRisk" },
  { href: "/trade/money", title: { fa: "مدیریت سرمایه", en: "Money management" }, desc: { fa: "اکسپرت متاتریدر برای ریسک، حد ضرر روزانه و حجم خودکار", en: "MetaTrader expert for risk, daily loss limit and automatic lot size" }, icon: "trade", feature: "tradeMoneyMgmt" },
  { href: "/trade/clock", title: { fa: "ساعت فارکس", en: "Forex clock" }, desc: { fa: "وضعیت لحظه‌ای جلسه‌های معاملاتی", en: "Live status of the trading sessions" }, icon: "trade", feature: "forexClock" },
  { href: "/trade/notes", title: { fa: "یادداشت‌ها", en: "Notes" }, desc: { fa: "تحلیل‌ها و تجربه‌های شخصی", en: "Your analyses and personal experiences" }, icon: "journal", feature: "tradeNotes" },
  { href: "/trade/metatrader", title: { fa: "اتصال متاتریدر", en: "MetaTrader connection" }, desc: { fa: "دریافت خودکار معاملات، برای هر حساب جداگانه", en: "Automatic trade import, separately for each account" }, icon: "trade", feature: "metatrader" },
];

export default function TradePage() {
  const { status } = useSession();
  // زیربخش‌هایی که از پنل ادمین خاموشن (/admin/features) کارت نمی‌گیرن
  const features = useFeatures();
  const items = ITEMS.filter((it) => featureVisible(features, it.feature));

  return (
    <section className="trade-desktop">
      <div className="trade-head-row" style={{ justifyContent: "flex-start" }}>
        <span className="page-title-icon">{ICONS.trade}</span>
        <h1>{tr("ترید", "Trading")}</h1>
        {/* اشتراک کارنامه‌ی همه‌ی حساب‌ها — فقط با ماژول ترید فعال؛ ?share=1 هم بازش می‌کنه */}
        <TradeShareButton deepLink className="trade-hub-share" size={19} />
      </div>

      {status === "loading" && <PanelSkeleton />}
      {status === "unauthenticated" && <AuthGate message={tr("برای استفاده از این سرویس وارد شوید", "Sign in to use this service")} />}

      {status === "authenticated" && (
        <ModuleGate module="TRADE">
          <div className="trade-hub-grid">
            {items.map((it, i) => (
              <motion.div
                key={it.href}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.34, delay: i * 0.045, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link href={it.href} prefetch className="trade-surface trade-hub-box">
                  <span className="trade-hub-icon">{ICONS[it.icon]}</span>
                  <span className="trade-hub-body">
                    <span className="trade-hub-title">{pick(it.title)}</span>
                    <span className="trade-hub-desc">{pick(it.desc)}</span>
                  </span>
                  {isEn() ? <ChevronRight size={17} className="trade-hub-chevron" /> : <ChevronLeft size={17} className="trade-hub-chevron" />}
                </Link>
              </motion.div>
            ))}
          </div>
        </ModuleGate>
      )}
    </section>
  );
}
