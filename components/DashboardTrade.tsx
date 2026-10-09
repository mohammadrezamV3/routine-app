"use client";

// کارت عملکرد ترید — منحنی اکوئیتی ۳۰ روز (تجمع سود/زیان روزانه)،
// کاشی‌های امروز/هفته/وین‌ریت/پرافیت‌فکتور، حساب‌ها با پیشرفت هدف، و آخرین
// معامله‌ها. سبز/قرمز سود و زیان از توکن‌های --pnl-* (بیرون پالت تم).

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { faNum } from "@/lib/jalali";
import { getSetting } from "@/lib/storage";
import { rowActivateProps } from "@/lib/rowActivate";
import { CAL_SYSTEM_KEY, type CalSystem } from "@/lib/tradeTypes";
import { TradeDetailDrawer } from "./TradeDetailDrawer";
import { compactNumber, equityPoints } from "@/lib/dashboardCompute";
import type { DashTrade } from "@/lib/dashboardTypes";
import { BentoCard, CardHead, CountUp, EmptyState, Meter, Skel, Sparkline } from "./DashboardKit";
import { tr, dirSign } from "@/lib/i18n";

const CUR_SIGN: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", JPY: "¥" };
const money = (n: number, cur: string) => `${n < 0 ? "−" : n > 0 ? "+" : ""}${CUR_SIGN[cur] ?? ""}${faNum(compactNumber(Math.abs(n)))}${CUR_SIGN[cur] ? "" : ` ${cur}`}`;
const tone = (n: number) => (n > 0 ? "is-win" : n < 0 ? "is-loss" : "");

export function DashboardTrade({ trade, loading }: { trade: DashTrade | null; loading: boolean }) {
  return (
    <BentoCard area="trade" className="db-trade" label={tr("ترید", "Trading")}>
      <CardHead icon="candles" title={tr("عملکرد ترید", "Trading performance")} href="/trade/journal" hrefLabel={tr("ژورنال", "Journal")} />
      {loading ? (
        <div className="db-trade-skel"><Skel w="45%" h={26} /><Skel w="100%" h={90} r={12} /><Skel w="100%" h={50} r={12} /></div>
      ) : !trade ? null : trade.accountCount === 0 ? (
        <EmptyState icon="journal" text={tr("اولین حساب معاملاتیت رو بساز تا آمار و منحنی سودت این‌جا زنده بشه.", "Create your first trading account to bring your stats and equity curve to life here.")} href="/trade/journal" cta={tr("ساخت حساب", "Create account")} />
      ) : (
        <TradeBody t={trade} />
      )}
    </BentoCard>
  );
}

function TradeBody({ t }: { t: DashTrade }) {
  const cur = t.sumCurrency;
  // جزئیات کامل معامله درجا روی داشبورد (فقط‌خواندنی). payload در recent
  // عمدا سبک است؛ خود کشو معامله را با GET /api/trade/entries/[id] می‌گیرد
  // (گیت ماژول TRADE + where:{id,userId}). ویرایش = رفتن به صفحه‌ی حساب.
  const [openTrade, setOpenTrade] = useState<{ id: string; accountId: string; currency: string } | null>(null);
  const [calSystem, setCalSystem] = useState<CalSystem>("jalali");
  useEffect(() => {
    if (!openTrade) return;
    getSetting<CalSystem>(CAL_SYSTEM_KEY, "jalali").then(setCalSystem).catch(() => {});
  }, [openTrade]);
  const equity = equityPoints(t.daily30);
  const flat = t.daily30.every((v) => v === 0);
  return (
    <div className="db-trade-body">
      <div className="db-trade-main">
        <div className="db-trade-hero">
          <span className="db-stat-label">{tr("سود/زیان 30 روز اخیر", "Last 30 days P/L")}{t.currency === null ? ` (${cur})` : ""}</span>
          <b className={`db-trade-pnl ${tone(t.month.pnl)}`}>
            <CountUp value={t.month.pnl} decimals={Math.abs(t.month.pnl) < 1000 ? 2 : 0} signed prefix={CUR_SIGN[cur] ?? ""} suffix={CUR_SIGN[cur] ? "" : ` ${cur}`} />
          </b>
          <span className="db-trade-sub">{tr(`${faNum(t.month.count)} معامله‌ی بسته‌شده`, `${t.month.count} closed ${t.month.count === 1 ? "trade" : "trades"}`)}</span>
        </div>
        <div className="db-trade-chart">
          {flat ? <div className="db-trade-flat">{tr("هنوز معامله‌ی بسته‌شده‌ای در 30 روز اخیر نیست", "No closed trades in the last 30 days")}</div> : <Sparkline values={equity} height={96} />}
        </div>
      </div>

      <div className="db-trade-tiles">
        <Tile label={tr("امروز", "Today")} value={money(t.today.pnl, cur)} toneCls={tone(t.today.pnl)} sub={tr(`${faNum(t.today.count)} معامله`, `${t.today.count} ${t.today.count === 1 ? "trade" : "trades"}`)} />
        <Tile label={tr("این هفته", "This week")} value={money(t.week.pnl, cur)} toneCls={tone(t.week.pnl)} sub={tr(`${faNum(t.week.wins)} برد · ${faNum(t.week.losses)} باخت`, `${t.week.wins} ${t.week.wins === 1 ? "win" : "wins"} · ${t.week.losses} ${t.week.losses === 1 ? "loss" : "losses"}`)} />
        <Tile label={tr("وین‌ریت", "Win rate")} value={t.month.winRate === null ? "—" : `${faNum(t.month.winRate)}${tr("٪", "%")}`} sub={tr("30 روز", "30 days")} ring={t.month.winRate === null ? undefined : t.month.winRate / 100} />
        <Tile label={tr("پرافیت فکتور", "Profit factor")} value={t.month.profitFactor === null ? "—" : faNum(t.month.profitFactor.toFixed(2))} toneCls={t.month.profitFactor === null ? "" : t.month.profitFactor >= 1 ? "is-win" : "is-loss"} sub={t.openTrades ? tr(`${faNum(t.openTrades)} معامله‌ی باز`, `${t.openTrades} open ${t.openTrades === 1 ? "trade" : "trades"}`) : tr("بدون معامله‌ی باز", "No open trades")} />
      </div>

      <div className="db-trade-split">
        <div className="db-trade-accs">
          <span className="db-sub-head">{tr("حساب‌ها", "Accounts")}</span>
          {t.accounts.map((a, i) => (
            <Link key={a.id} href={`/trade/accounts/${a.id}`} prefetch className="db-acc">
              <span className="db-acc-dot" style={{ background: a.color }} />
              <span className="db-acc-name">{a.name}</span>
              <span className={`db-acc-pnl ${tone(a.netPnl)}`} dir="ltr">{money(a.netPnl, a.currency)}</span>
              {a.goalProgress !== null && (
                <span className="db-acc-goal" title={tr(`${faNum(Math.round(a.goalProgress * 100))}٪ از هدف`, `${Math.round(a.goalProgress * 100)}% of goal`)}>
                  <Meter value={a.goalProgress} color={a.color} delay={0.5 + i * 0.08} />
                </span>
              )}
            </Link>
          ))}
          {t.accountCount > t.accounts.length && <Link href="/trade/journal" prefetch className="db-today-more">{tr(`+${faNum(t.accountCount - t.accounts.length)} حساب دیگه`, `+${t.accountCount - t.accounts.length} more`)}</Link>}
        </div>
        <div className="db-trade-recent">
          <span className="db-sub-head">{tr("آخرین معامله‌ها", "Recent trades")}</span>
          {t.recent.length === 0 ? (
            <p className="db-muted-line">{tr("هنوز معامله‌ای ثبت نشده", "No trades logged yet")}</p>
          ) : (
            t.recent.map((r, i) => {
              const acc = t.accounts.find((a) => a.id === r.accountId);
              const rowCur = r.currency ?? acc?.currency ?? cur;
              return (
                <motion.div
                  key={r.id}
                  className="db-trow is-clickable"
                  initial={{ opacity: 0, x: dirSign() * 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.05 }}
                  whileHover={{ x: dirSign() * 3, transition: { duration: 0.2 } }}
                  {...rowActivateProps(() => setOpenTrade({ id: r.id, accountId: r.accountId, currency: rowCur }), tr(`جزئیات معامله‌ی ${r.symbol}`, `Trade details for ${r.symbol}`))}
                >
                  <span className={`db-dir ${r.direction === "BUY" ? "is-buy" : "is-sell"}`} aria-label={r.direction === "BUY" ? tr("خرید", "Buy") : tr("فروش", "Sell")}>
                    <svg viewBox="0 0 12 12" aria-hidden="true"><path d={r.direction === "BUY" ? "M6 2.5 10 8H2Z" : "M6 9.5 2 4h8Z"} fill="currentColor" /></svg>
                  </span>
                  <span className="db-trow-sym" dir="ltr">{r.symbol}</span>
                  {r.status === "OPEN" ? <span className="db-pill">{tr("باز", "Open")}</span> : <span className={`db-trow-pnl ${tone(r.pnl)}`} dir="ltr">{money(r.pnl, rowCur)}</span>}
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {openTrade && (
        <TradeDetailDrawer
          entryId={openTrade.id}
          calSystem={calSystem}
          currency={openTrade.currency}
          editHref={`/trade/accounts/${openTrade.accountId}`}
          onClose={() => setOpenTrade(null)}
        />
      )}
    </div>
  );
}

function Tile({ label, value, sub, toneCls = "", ring }: { label: string; value: string; sub: string; toneCls?: string; ring?: number }) {
  return (
    <div className="db-tile">
      <span className="db-stat-label">{label}</span>
      <b className={`db-tile-val ${toneCls}`} dir="ltr">{value}</b>
      <span className="db-tile-sub">{sub}</span>
      {ring !== undefined && (
        <svg className="db-tile-ring" viewBox="0 0 36 36" aria-hidden="true">
          <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(var(--pnl-win-rgb),.15)" strokeWidth="3.5" />
          <motion.circle cx="18" cy="18" r="15" fill="none" stroke="var(--pnl-win)" strokeWidth="3.5" strokeLinecap="round" transform="rotate(-90 18 18)" initial={{ pathLength: 0 }} animate={{ pathLength: Math.max(0.0001, ring) }} transition={{ duration: 1.1, delay: 0.4 }} />
        </svg>
      )}
    </div>
  );
}

