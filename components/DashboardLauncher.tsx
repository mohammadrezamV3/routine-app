"use client";

// «کارهای سریع» (ردیفِ زیرِ هیرو). «همه‌ی بخش‌ها» (لانچرِ پایینِ صفحه) به
// درخواستِ صریح حذف شد — پالتِ فرمان (⌘K) و منوی کناری همون مسیرها رو دارن.
// کارهای «ثبت» (برنامه/غذا/معامله) پاپ‌آپِ همون بخش رو همین‌جا باز می‌کنن
// (DashboardActions) نه صفحه‌ی جدید؛ بقیه لینک‌ان. قفلِ ماژولِ پولی فقط
// نشانه‌ست — روی آیتمِ قفل همون لینک می‌مونه تا مقصد گیت/خرید رو نشون بده.

import Link from "next/link";
import { motion } from "framer-motion";
import type { FeatureKey } from "@/lib/featureFlags";
import { DashIcon, type DashIconName } from "./DashboardIcons";
import { D_EASE } from "./DashboardKit";
import { useDashAction, type DashAction } from "./DashboardActions";

type Item = { href: string; label: string; icon: DashIconName; module?: string; feature?: FeatureKey; tone?: string; action?: DashAction };

const QUICK: Item[] = [
  { href: "/weekly?add=1", label: "برنامه‌ی جدید", icon: "plus", tone: "var(--accent)", action: "program" },
  { href: "/exercise?tab=exercise", label: "شروعِ تمرین", icon: "dumbbell", module: "EXERCISE", tone: "var(--secondary)" },
  { href: "/exercise?tab=calorie", label: "ثبتِ غذا", icon: "apple", module: "CALORIE", tone: "var(--sun)", action: "food" },
  { href: "/trade/journal", label: "ثبتِ معامله", icon: "journal", module: "TRADE", tone: "var(--pnl-win)", action: "trade" },
  { href: "/trade/calendar", label: "تقویمِ اقتصادی", icon: "calendarBolt", module: "TRADE", tone: "var(--pnl-loss)" },
  { href: "/trade/chart", label: "چارت", icon: "chart", module: "TRADE", tone: "var(--accent-soft)" },
  { href: "/mentors", label: "مربی‌ها", icon: "mentors", feature: "mentors", tone: "var(--moon)" },
  { href: "/roadmaps/new", label: "رودمپِ AI", icon: "spark", feature: "roadmaps", tone: "var(--orb-c2)" },
];

function visible(items: Item[], features: Partial<Record<FeatureKey, boolean>> | null) {
  return items.filter((i) => !i.feature || features?.[i.feature] === true);
}

export function DashboardQuickActions({ features, modules }: { features: Partial<Record<FeatureKey, boolean>> | null; modules: Set<string> | null }) {
  const run = useDashAction();
  return (
    <motion.nav className="db-quick" aria-label="کارهای سریع" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.04, delayChildren: 0.2 } } }}>
      {visible(QUICK, features).map((q) => {
        const locked = !!q.module && modules !== null && !modules.has(q.module);
        return (
          <motion.div key={q.href} variants={{ hidden: { opacity: 0, y: 10, scale: 0.94 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: D_EASE } } }}>
            {q.action && run && !locked ? (
              <button type="button" onClick={() => run(q.action!)} className="db-quick-item" style={{ ["--tone" as any]: q.tone }}>
                <span className="db-quick-icon"><DashIcon name={q.icon} /></span>
                <span className="db-quick-label">{q.label}</span>
              </button>
            ) : (
              <Link href={q.href} prefetch className="db-quick-item" style={{ ["--tone" as any]: q.tone }}>
                <span className="db-quick-icon"><DashIcon name={q.icon} /></span>
                <span className="db-quick-label">{q.label}</span>
                {locked && <span className="db-quick-lock"><DashIcon name="lock" /></span>}
              </Link>
            )}
          </motion.div>
        );
      })}
    </motion.nav>
  );
}
