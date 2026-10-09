"use client";

// «کارهای سریع» (ردیف زیر هیرو). «همه‌ی بخش‌ها» (لانچر پایین صفحه) به
// درخواست صریح حذف شد — پالت فرمان (⌘K) و منوی کناری همون مسیرها رو دارن.
// کارهای «ثبت» (برنامه/غذا/معامله) پاپ‌آپ همون بخش رو همین‌جا باز می‌کنن
// (DashboardActions) نه صفحه‌ی جدید؛ بقیه لینک‌ان. قفل ماژول پولی فقط
// نشانه‌ست — روی آیتم قفل همون لینک می‌مونه تا مقصد گیت/خرید رو نشون بده.

import Link from "next/link";
import { motion } from "framer-motion";
import { tr, pick, type Localized } from "@/lib/i18n";
import { featureVisible, type FeatureKey } from "@/lib/featureFlags";
import { DashIcon, type DashIconName } from "./DashboardIcons";
import { D_EASE } from "./DashboardKit";
import { useDashAction, type DashAction } from "./DashboardActions";

type Item = { href: string; label: Localized; icon: DashIconName; module?: string; feature?: FeatureKey; tone?: string; action?: DashAction };

const QUICK: Item[] = [
  { href: "/weekly?add=1", label: { fa: "برنامه‌ی جدید", en: "New program" }, icon: "plus", feature: "routine", tone: "var(--accent)", action: "program" },
  { href: "/sleep", label: { fa: "ثبت خواب", en: "Log sleep" }, icon: "moon", module: "SLEEP", feature: "sleep", tone: "var(--moon)" },
  { href: "/exercise?tab=exercise", label: { fa: "شروع تمرین", en: "Start workout" }, icon: "dumbbell", module: "EXERCISE", feature: "exercise", tone: "var(--secondary)" },
  { href: "/exercise?tab=calorie", label: { fa: "ثبت غذا", en: "Log food" }, icon: "apple", module: "CALORIE", feature: "calorie", tone: "var(--sun)", action: "food" },
  { href: "/trade/journal", label: { fa: "ثبت معامله", en: "Log trade" }, icon: "journal", module: "TRADE", feature: "tradeJournal", tone: "var(--pnl-win)", action: "trade" },
  { href: "/trade/calendar", label: { fa: "تقویم اقتصادی", en: "Economic calendar" }, icon: "calendarBolt", module: "TRADE", feature: "economicCalendar", tone: "var(--pnl-loss)" },
  { href: "/trade/chart", label: { fa: "چارت", en: "Chart" }, icon: "chart", module: "TRADE", feature: "tradeChart", tone: "var(--accent-soft)" },
  { href: "/mentors", label: { fa: "مربی‌ها", en: "Mentors" }, icon: "mentors", feature: "mentors", tone: "var(--moon)" },
  { href: "/roadmaps/new", label: { fa: "رودمپ AI", en: "AI roadmap" }, icon: "spark", feature: "roadmaps", tone: "var(--orb-c2)" },
];

function visible(items: Item[], features: Partial<Record<FeatureKey, boolean>> | null) {
  return items.filter((i) => !i.feature || featureVisible(features, i.feature));
}

export function DashboardQuickActions({ features, modules }: { features: Partial<Record<FeatureKey, boolean>> | null; modules: Set<string> | null }) {
  const run = useDashAction();
  const n = visible(QUICK, features).length;
  // موبایل/تبلت: تعداد ستون طوری که ردیف آخر یک خانه‌ی تنها نداشته باشه
  const qc = n <= 4 || n % 4 === 0 ? 4 : n % 3 === 0 ? 3 : 4;
  return (
    <motion.nav className="db-quick" style={{ ["--qn" as any]: n, ["--qc" as any]: Math.min(qc, n) }} aria-label={tr("کارهای سریع", "Quick actions")} initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.04, delayChildren: 0.2 } } }}>
      {visible(QUICK, features).map((q) => {
        const locked = !!q.module && modules !== null && !modules.has(q.module);
        return (
          <motion.div key={q.href} variants={{ hidden: { opacity: 0, y: 10, scale: 0.94 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: D_EASE } } }}>
            {q.action && run && !locked ? (
              <button type="button" onClick={() => run(q.action!)} className="db-quick-item" style={{ ["--tone" as any]: q.tone }}>
                <span className="db-quick-icon"><DashIcon name={q.icon} /></span>
                <span className="db-quick-label">{pick(q.label)}</span>
              </button>
            ) : (
              <Link href={q.href} prefetch className="db-quick-item" style={{ ["--tone" as any]: q.tone }}>
                <span className="db-quick-icon"><DashIcon name={q.icon} /></span>
                <span className="db-quick-label">{pick(q.label)}</span>
                {locked && <span className="db-quick-lock"><DashIcon name="lock" /></span>}
              </Link>
            )}
          </motion.div>
        );
      })}
    </motion.nav>
  );
}
