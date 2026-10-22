"use client";

// «ابزارها» — کارت بنتوی بخش ترید؛ جای هاب قدیمی /trade. ابزارهایی که آمارشون
// توی کارت عملکرد/بازار نیست (چارت، ژورنال، چک‌لیست، یادداشت، ریسک، مدیریت
// سرمایه، متاتریدر) به‌صورت کاشی‌های لینکی کنار هم، هرکدوم با یک خط زنده از
// data.tradeTools. هر کاشی فلگ خودش رو داره. داده null (هنوز نرسیده/خطا) →
// زیرنویس ثابت. ریسک از localStorage همین دستگاه بعد از mount خونده می‌شه.
// کاشی‌ها بک‌گراند ندارن (فقط بوردر، عین .db-tile)؛ ورود پله‌ای فقط transform/opacity.

import { SmartLink as Link } from "@/components/SmartLink";
import { useEffect, useMemo, useState } from "react";
import { m as motion, type Variants } from "framer-motion";
import { featureVisible, type FeatureKey } from "@/lib/featureFlags";
import { DEFAULT_CHART_SYMBOLS, agoLabel, pickChartSymbols } from "@/lib/tradeHubCompute";
import type { DashTradeTools } from "@/lib/dashboardTypes";
import { BentoCard, CardHead, D_EASE, Meter, Skel } from "./DashboardKit";
import { DashIcon, type DashIconName } from "./DashboardIcons";
import { tr } from "@/lib/i18n";

/** فلگ هر ابزار — DashboardClient با همین فهرست تصمیم می‌گیره کارت بیاد یا نه */
export const TRADE_TOOL_FLAGS: FeatureKey[] = ["tradeChart", "tradeJournal", "tradeChecklists", "tradeNotes", "tradeRisk", "tradeMoneyMgmt", "metatrader"];

const RISK_LS_KEY = "arion:riskCalc";

/** تنظیمات ذخیره‌ی ماشین‌حساب ریسک (فقط همین دستگاه) — بعد از mount خونده می‌شه تا هیدریشن بهم نخوره */
function useRiskPrefs() {
  const [prefs, setPrefs] = useState<{ mode: string; value: number } | null>(null);
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(RISK_LS_KEY) || "{}") || {};
      const v = Number(p.riskValue);
      if (Number.isFinite(v) && v > 0) setPrefs({ mode: p.mode === "amount" ? "amount" : "percent", value: v });
    } catch { /* بدون تنظیم ذخیره‌شده: زیرنویس ثابت */ }
  }, []);
  return prefs;
}

const V_TOOLS: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.045, delayChildren: 0.1 } } };
const V_TOOL: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: D_EASE } },
};

const Num = ({ children }: { children: React.ReactNode }) => <bdi dir="ltr">{children}</bdi>;

type Tool = { key: string; href: string; icon: DashIconName; title: string; sub: React.ReactNode; extra?: React.ReactNode; dot?: boolean };

export function DashboardTradeTools({ tools, accountCount, features, loading }: {
  tools: DashTradeTools | null;
  accountCount: number | null;
  features: Parameters<typeof featureVisible>[0];
  loading: boolean;
}) {
  const risk = useRiskPrefs();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const on = (k: FeatureKey) => featureVisible(features, k);
  const live = (node: React.ReactNode, fallback: string) => (loading ? <Skel w="70%" h={11} /> : node ?? fallback);

  const chart = tools?.chart ?? null;
  const chartSyms = useMemo(
    () => pickChartSymbols(chart?.lastSymbol ?? null, chart?.recentSymbols ?? [], DEFAULT_CHART_SYMBOLS, 3),
    [chart?.lastSymbol, chart?.recentSymbols]
  );

  const list: Tool[] = [];
  if (on("tradeChart")) {
    list.push({
      key: "chart", href: "/trade/chart", icon: "chart", title: tr("چارت", "Chart"),
      sub: live(chart?.lastSymbol ? <>{tr("آخرین نماد", "Last symbol")} <Num>{chart.lastSymbol}</Num></> : null, tr("تریدینگ‌ویو و گفت‌وگوی هر نماد", "TradingView and chat for every symbol")),
      extra: chart && chart.recentSymbols.length > 0 ? <span className="db-tool-chips" dir="ltr">{chartSyms.map((s) => <span key={s}>{s}</span>)}</span> : null,
    });
  }
  if (on("tradeJournal")) {
    list.push({
      key: "journal", href: "/trade/journal", icon: "journal", title: tr("ژورنال", "Journal"),
      sub: live(accountCount === null ? null : accountCount === 0 ? tr("اولین حساب معاملاتی‌ات رو بساز", "Create your first trading account") : tr(`${accountCount} حساب معاملاتی`, `${accountCount} trading ${accountCount === 1 ? "account" : "accounts"}`), tr("حساب‌های معاملاتی و ثبت معامله", "Trading accounts and trade logging")),
    });
  }
  if (on("tradeChecklists")) {
    const c = tools?.checklists ?? null;
    const f = c?.featured ?? null;
    const frac = f && f.total ? f.checked / f.total : 0;
    list.push({
      key: "checklists", href: "/trade/checklists", icon: "checklist", title: tr("چک‌لیست", "Checklists"),
      sub: live(c ? (f ? <bdi>{f.name}</bdi> : c.count ? tr(`${c.count} چک‌لیست`, `${c.count} ${c.count === 1 ? "checklist" : "checklists"}`) : tr("هنوز چک‌لیستی نساخته‌ای", "No checklist yet")) : null, tr("شرط‌های ورود هر استراتژی", "Entry conditions for each strategy")),
      extra: f ? (
        <span className="db-tool-prog">
          <Meter value={frac} delay={0.4} />
          <Num>{f.checked}/{f.total}</Num>
        </span>
      ) : null,
    });
  }
  if (on("tradeNotes")) {
    const n = tools?.notes ?? null;
    list.push({
      key: "notes", href: "/trade/notes", icon: "notes", title: tr("یادداشت‌ها", "Notes"),
      sub: live(n ? (n.latest ? n.latest.excerpt : tr("اولین یادداشتت رو بنویس", "Write your first note")) : null, tr("تحلیل‌ها و تجربه‌های شخصی", "Your analyses and personal experiences")),
    });
  }
  if (on("tradeRisk")) {
    const rv = risk ? (risk.mode === "percent" ? `${risk.value}%` : String(risk.value)) : null;
    list.push({
      key: "risk", href: "/trade/risk", icon: "shield", title: tr("ریسک و سود", "Risk and reward"),
      sub: rv ? <>{risk?.mode === "percent" ? tr("ریسک هر معامله", "Risk per trade") : tr("مبلغ ریسک", "Risk amount")} <Num>{rv}</Num></> : tr("حجم معامله و نسبت ریسک به سود", "Position size and risk to reward"),
    });
  }
  if (on("tradeMoneyMgmt")) {
    list.push({
      key: "money", href: "/trade/money", icon: "card", title: tr("مدیریت سرمایه", "Money management"),
      sub: <Num>MT4 · MT5</Num>,
    });
  }
  if (on("metatrader")) {
    const mt = tools?.metatrader ?? null;
    const ago = mt?.lastSyncAt && now ? agoLabel(mt.lastSyncAt, now) : null;
    const text = mt ? (mt.connected ? tr(`${mt.connected} حساب متصل`, `${mt.connected} ${mt.connected === 1 ? "account" : "accounts"} connected`) : tr("متصل نیست", "Not connected")) : null;
    list.push({
      key: "mt", href: "/trade/metatrader", icon: "link", title: tr("اتصال متاتریدر", "MetaTrader"),
      sub: live(text ? <>{text}{mt?.connected && ago ? ` · ${ago}` : ""}</> : null, tr("دریافت خودکار معاملات", "Automatic trade import")),
      dot: !!mt?.connected,
    });
  }

  if (!list.length) return null;
  return (
    <BentoCard area="tools" className="db-tools" label={tr("ابزارها", "Tools")}>
      <CardHead icon="spark" title={tr("ابزارها", "Tools")} />
      <motion.div className="db-tools-grid" variants={V_TOOLS}>
        {list.map((t) => (
          <motion.div key={t.key} variants={V_TOOL} className="db-tool-cell">
            <Link href={t.href} prefetch className="db-tool">
              <span className="db-tool-head">
                <span className="db-tool-icon"><DashIcon name={t.icon} /></span>
                <b className="db-tool-title">{t.title}</b>
                {t.dot && <span className="db-tool-dot" aria-hidden="true" />}
              </span>
              <span className="db-tool-sub">{t.sub}</span>
              {t.extra}
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </BentoCard>
  );
}
