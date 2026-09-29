"use client";

// «کارهای سریع» (ردیفِ زیرِ هیرو) و «همه‌ی بخش‌ها» (لانچرِ پایینِ صفحه) —
// داشبورد صفحه‌ی اصلیِ کاربره، پس از این‌جا باید به تقریبا هر صفحه‌ای رسید.
// فقط لینک‌ان؛ قفلِ ماژولِ پولی فقط نشانه‌ست و enforcement سمتِ مقصد/سرور.

import Link from "next/link";
import { motion } from "framer-motion";
import type { FeatureKey } from "@/lib/featureFlags";
import { DashIcon, type DashIconName } from "./DashboardIcons";
import { BentoCard, CardHead, D_EASE } from "./DashboardKit";

type Item = { href: string; label: string; desc?: string; icon: DashIconName; module?: string; feature?: FeatureKey; tone?: string };

const QUICK: Item[] = [
  { href: "/weekly?add=1", label: "برنامه‌ی جدید", icon: "plus", tone: "var(--accent)" },
  { href: "/exercise?tab=exercise", label: "شروعِ تمرین", icon: "dumbbell", module: "EXERCISE", tone: "var(--secondary)" },
  { href: "/exercise?tab=calorie", label: "ثبتِ غذا", icon: "apple", module: "CALORIE", tone: "var(--sun)" },
  { href: "/trade/journal", label: "ثبتِ معامله", icon: "journal", module: "TRADE", tone: "var(--pnl-win)" },
  { href: "/trade/calendar", label: "تقویمِ اقتصادی", icon: "calendarBolt", module: "TRADE", tone: "var(--pnl-loss)" },
  { href: "/trade/chart", label: "چارت", icon: "chart", module: "TRADE", tone: "var(--accent-soft)" },
  { href: "/mentors", label: "مربی‌ها", icon: "mentors", feature: "mentors", tone: "var(--moon)" },
  { href: "/roadmaps/new", label: "رودمپِ AI", icon: "spark", feature: "roadmaps", tone: "var(--orb-c2)" },
];

const SECTIONS: Item[] = [
  { href: "/weekly", label: "روتین", desc: "برنامه‌ی روزانه و هفتگی", icon: "routine" },
  { href: "/exercise?tab=exercise", label: "برنامه‌ی تمرینی", desc: "پلن، ست‌ها و پیشرفت", icon: "dumbbell", module: "EXERCISE" },
  { href: "/exercise?tab=calorie", label: "کالری‌شمار", desc: "وعده‌ها، ماکرو و هدف", icon: "apple", module: "CALORIE" },
  { href: "/trade", label: "ترید", desc: "هابِ همه‌ی ابزارهای بازار", icon: "candles", module: "TRADE" },
  { href: "/trade/checklists", label: "چک‌لیست‌ها", desc: "شرط‌های ورود", icon: "checklist", module: "TRADE" },
  { href: "/trade/clock", label: "ساعتِ فارکس", desc: "جلسه‌های لحظه‌ای", icon: "globeClock", module: "TRADE" },
  { href: "/trade/notes", label: "یادداشت‌ها", desc: "تحلیل و تجربه", icon: "notes", module: "TRADE" },
  { href: "/trade/metatrader", label: "متاتریدر", desc: "همگام‌سازیِ خودکار", icon: "link", module: "TRADE" },
  { href: "/roadmaps", label: "رودمپ‌ها", desc: "مسیرهای یادگیری", icon: "roadmap", feature: "roadmaps", module: "ROADMAP" },
  { href: "/mentorship", label: "مربی‌های من", desc: "گفت‌وگو و برنامه‌ها", icon: "mentors", feature: "mentors" },
  { href: "/analysis/weekly", label: "آنالیزِ هفتگی", desc: "گزارش و مربیِ AI", icon: "analysis", feature: "weeklyAnalysis", module: "AI_INSIGHT" },
  { href: "/account", label: "پنلِ کاربری", desc: "پروفایل و تنظیمات", icon: "user" },
];

function visible(items: Item[], features: Partial<Record<FeatureKey, boolean>> | null) {
  return items.filter((i) => !i.feature || features?.[i.feature] === true);
}

export function DashboardQuickActions({ features, modules }: { features: Partial<Record<FeatureKey, boolean>> | null; modules: Set<string> | null }) {
  return (
    <motion.nav className="db-quick" style={{ ["--qn" as any]: visible(QUICK, features).length }} aria-label="کارهای سریع" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.04, delayChildren: 0.2 } } }}>
      {visible(QUICK, features).map((q) => {
        const locked = !!q.module && modules !== null && !modules.has(q.module);
        return (
          <motion.div key={q.href} variants={{ hidden: { opacity: 0, y: 10, scale: 0.94 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: D_EASE } } }}>
            <Link href={q.href} prefetch className="db-quick-item" style={{ ["--tone" as any]: q.tone }}>
              <span className="db-quick-icon"><DashIcon name={q.icon} /></span>
              <span className="db-quick-label">{q.label}</span>
              {locked && <span className="db-quick-lock"><DashIcon name="lock" /></span>}
            </Link>
          </motion.div>
        );
      })}
    </motion.nav>
  );
}

export function DashboardLauncher({ features, modules, isAdmin }: { features: Partial<Record<FeatureKey, boolean>> | null; modules: Set<string> | null; isAdmin: boolean }) {
  const items = visible(SECTIONS, features);
  if (isAdmin) items.push({ href: "/admin", label: "پنلِ ادمین", desc: "مدیریتِ سایت", icon: "shield" });
  return (
    <BentoCard area="launch" className="db-launch" label="همه‌ی بخش‌ها">
      <CardHead icon="target" title="همه‌ی بخش‌ها" />
      <div className="db-launch-grid">
        {items.map((it) => {
          const locked = !!it.module && modules !== null && !modules.has(it.module);
          return (
            <Link key={it.href} href={it.href} prefetch className={`db-launch-item${locked ? " is-locked" : ""}`}>
              <span className="db-launch-icon"><DashIcon name={it.icon} /></span>
              <span className="db-launch-text">
                <b>{it.label}</b>
                {it.desc && <span>{it.desc}</span>}
              </span>
              {locked ? <span className="db-launch-lock"><DashIcon name="lock" /></span> : <DashIcon name="arrow" className="db-launch-arrow" />}
            </Link>
          );
        })}
      </div>
    </BentoCard>
  );
}
