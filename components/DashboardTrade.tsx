"use client";

// کارتِ عملکردِ ترید — منحنیِ اکوئیتیِ ۳۰ روز (تجمعِ سود/زیانِ روزانه)،
// کاشی‌های امروز/هفته/وین‌ریت/پرافیت‌فکتور، حساب‌ها با پیشرفتِ هدف، و آخرین
// معامله‌ها. سبز/قرمزِ سود و زیان از توکن‌های --pnl-* (بیرونِ پالتِ تم).

import Link from "next/link";
import { motion } from "framer-motion";
import { faNum } from "@/lib/jalali";
import { cumulative, compactNumber } from "@/lib/dashboardCompute";
import type { DashTrade } from "@/lib/dashboardTypes";
import { BentoCard, CardHead, CountUp, EmptyState, Meter, Skel, Sparkline } from "./DashboardKit";

const CUR_SIGN: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", JPY: "¥" };
const money = (n: number, cur: string) => `${n < 0 ? "−" : n > 0 ? "+" : ""}${CUR_SIGN[cur] ?? ""}${faNum(compactNumber(Math.abs(n)))}${CUR_SIGN[cur] ? "" : ` ${cur}`}`;
const tone = (n: number) => (n > 0 ? "is-win" : n < 0 ? "is-loss" : "");

export function DashboardTrade({ trade, loading }: { trade: DashTrade | null; loading: boolean }) {
  return (
    <BentoCard area="trade" className="db-trade" label="ترید">
      <CardHead icon="candles" title="عملکردِ ترید" href="/trade/journal" hrefLabel="ژورنال" />
      {loading ? (
        <div className="db-trade-skel"><Skel w="45%" h={26} /><Skel w="100%" h={90} r={12} /><Skel w="100%" h={50} r={12} /></div>
      ) : !trade ? null : trade.accountCount === 0 ? (
        <EmptyState icon="journal" text="اولین حسابِ معاملاتیت رو بساز تا آمار و منحنیِ سودت این‌جا زنده بشه." href="/trade/journal" cta="ساختِ حساب" />
      ) : (
        <TradeBody t={trade} />
      )}
    </BentoCard>
  );
}

function TradeBody({ t }: { t: DashTrade }) {
  const cur = t.sumCurrency;
  const equity = [0, ...cumulative(t.daily30)];
  const flat = t.daily30.every((v) => v === 0);
  return (
    <div className="db-trade-body">
      <div className="db-trade-main">
        <div className="db-trade-hero">
          <span className="db-stat-label">سود/زیانِ 30 روزِ اخیر{t.currency === null ? ` (${cur})` : ""}</span>
          <b className={`db-trade-pnl ${tone(t.month.pnl)}`}>
            <CountUp value={t.month.pnl} decimals={Math.abs(t.month.pnl) < 1000 ? 2 : 0} signed prefix={CUR_SIGN[cur] ?? ""} suffix={CUR_SIGN[cur] ? "" : ` ${cur}`} />
          </b>
          <span className="db-trade-sub">{faNum(t.month.count)} معامله‌ی بسته‌شده</span>
        </div>
        <div className="db-trade-chart">
          {flat ? <div className="db-trade-flat">هنوز معامله‌ی بسته‌شده‌ای در 30 روزِ اخیر نیست</div> : <Sparkline values={equity} height={96} />}
        </div>
      </div>

      <div className="db-trade-tiles">
        <Tile label="امروز" value={money(t.today.pnl, cur)} toneCls={tone(t.today.pnl)} sub={`${faNum(t.today.count)} معامله`} />
        <Tile label="این هفته" value={money(t.week.pnl, cur)} toneCls={tone(t.week.pnl)} sub={`${faNum(t.week.wins)} برد · ${faNum(t.week.losses)} باخت`} />
        <Tile label="وین‌ریت" value={t.month.winRate === null ? "—" : `${faNum(t.month.winRate)}٪`} sub="30 روز" ring={t.month.winRate === null ? undefined : t.month.winRate / 100} />
        <Tile label="پرافیت فکتور" value={t.month.profitFactor === null ? "—" : faNum(t.month.profitFactor.toFixed(2))} toneCls={t.month.profitFactor === null ? "" : t.month.profitFactor >= 1 ? "is-win" : "is-loss"} sub={t.openTrades ? `${faNum(t.openTrades)} معامله‌ی باز` : "بدونِ معامله‌ی باز"} />
      </div>

      <div className="db-trade-split">
        <div className="db-trade-accs">
          <span className="db-sub-head">حساب‌ها</span>
          {t.accounts.map((a, i) => (
            <Link key={a.id} href={`/trade/accounts/${a.id}`} prefetch className="db-acc">
              <span className="db-acc-dot" style={{ background: a.color }} />
              <span className="db-acc-name">{a.name}</span>
              <span className={`db-acc-pnl ${tone(a.netPnl)}`} dir="ltr">{money(a.netPnl, a.currency)}</span>
              {a.goalProgress !== null && (
                <span className="db-acc-goal" title={`${faNum(Math.round(a.goalProgress * 100))}٪ از هدف`}>
                  <Meter value={a.goalProgress} color={a.color} delay={0.5 + i * 0.08} />
                </span>
              )}
            </Link>
          ))}
          {t.accountCount > t.accounts.length && <Link href="/trade/journal" prefetch className="db-today-more">+{faNum(t.accountCount - t.accounts.length)} حسابِ دیگه</Link>}
        </div>
        <div className="db-trade-recent">
          <span className="db-sub-head">آخرین معامله‌ها</span>
          {t.recent.length === 0 ? (
            <p className="db-muted-line">هنوز معامله‌ای ثبت نشده</p>
          ) : (
            t.recent.map((r, i) => {
              const acc = t.accounts.find((a) => a.id === r.accountId);
              return (
                <motion.div key={r.id} className="db-trow" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.05 }}>
                  <span className={`db-dir ${r.direction === "BUY" ? "is-buy" : "is-sell"}`} aria-label={r.direction === "BUY" ? "خرید" : "فروش"}>
                    <svg viewBox="0 0 12 12" aria-hidden="true"><path d={r.direction === "BUY" ? "M6 2.5 10 8H2Z" : "M6 9.5 2 4h8Z"} fill="currentColor" /></svg>
                  </span>
                  <span className="db-trow-sym" dir="ltr">{r.symbol}</span>
                  {r.status === "OPEN" ? <span className="db-pill">باز</span> : <span className={`db-trow-pnl ${tone(r.pnl)}`} dir="ltr">{money(r.pnl, acc?.currency ?? cur)}</span>}
                </motion.div>
              );
            })
          )}
        </div>
      </div>
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

