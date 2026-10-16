"use client";

// هاب بخش ترید — تنها ورودی ماژول و اولین صفحه‌ی ترید که به همه‌ی ابزارها لینک
// می‌ده. طرح: عنوان + برچسب زنده‌ی جلسه + اشتراک + «ثبت معامله»، ردیف KPI،
// ساعت فارکس، و سه گروه (تحلیل بازار / ژورنال و نظم / ریسک و اتصال).
// موبایل (کمتر از 768) همون گروه‌ها رو لیست ردیفی نشون می‌ده (CSS).
//
// داده: یک درخواست GET /api/trade/hub (lib/useTradeHub.ts)؛ جلسه‌ها و شمارش
// معکوس سمت کلاینت حساب می‌شن. هر کارت فلگ خودش رو داره (پنل ادمین) و کارت
// خاموش حذف می‌شه؛ گروه بدون کارت هم نمی‌آد. گیت واقعی ماژول سمت سرور
// (/api/trade/hub → requireModule(TRADE)) و ModuleGate کلاینتی فقط UX‌اند.

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  BookOpen, CalendarDays, CandlestickChart, Clock, FileText, Link2, ListChecks, Plus, ShieldCheck, TrendingUp, WalletCards,
} from "lucide-react";
import { ModuleGate } from "@/components/ModuleGate";
import { AuthGate } from "@/components/AuthGate";
import { PanelSkeleton } from "@/components/PanelSkeleton";
import { TradeShareButton } from "@/components/TradeShareButton";
import { Spinner } from "@/components/Spinner";
import { ClockCard, CandlePreview, HubCard, Kpi, NewsCountdown, Skel, useNow } from "@/components/TradeHubParts";
import { useLogTrade } from "@/components/TradeHubLog";
import { activeModulesOf, getAccount } from "@/lib/accountCache";
import { featureVisible, type FeatureKey } from "@/lib/featureFlags";
import { useFeatures } from "@/lib/useFeatures";
import { useTradeHub } from "@/lib/useTradeHub";
import {
  DEFAULT_CHART_SYMBOLS, agoLabel, eventWhenLabel, formatHubMoney, formatPct, hhmm,
  liveSessionPill, pickChartSymbols, relativeDayLabel,
} from "@/lib/tradeHubCompute";
import type { HubEvent, TradeHubData } from "@/lib/tradeHubTypes";
import { tr } from "@/lib/i18n";

const RISK_LS_KEY = "arion:riskCalc";

/** تنظیمات ذخیره‌ی ماشین‌حساب ریسک (فقط همین دستگاه، localStorage) — بعد از mount خونده می‌شه */
function useRiskPrefs() {
  const [prefs, setPrefs] = useState<{ mode: string; value: number } | null>(null);
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(RISK_LS_KEY) || "{}") || {};
      const v = Number(p.riskValue);
      if (Number.isFinite(v) && v > 0) setPrefs({ mode: p.mode === "amount" ? "amount" : "percent", value: v });
    } catch { /* بدون تنظیم ذخیره‌شده: راهنمای ثابت */ }
  }, []);
  return prefs;
}

const Num = ({ children }: { children: React.ReactNode }) => <bdi dir="ltr" className="th-num">{children}</bdi>;

function ImpactDot({ impact }: { impact: HubEvent["impact"] }) {
  return <span className={`th-dot is-${impact === "HIGH" ? "high" : "med"}`} aria-hidden="true" />;
}

export function TradeHub() {
  const { status } = useSession();
  const features = useFeatures();
  const authed = status === "authenticated";
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => {
    if (!authed) { setAllowed(null); return; }
    let alive = true;
    getAccount()
      .then((d) => { if (alive) setAllowed(!!d?.user && activeModulesOf(d).has("TRADE")); })
      .catch(() => { if (alive) setAllowed(false); });
    return () => { alive = false; };
  }, [authed]);

  const show = (k: FeatureKey) => featureVisible(features, k);
  const { data, status: dataStatus, refresh } = useTradeHub(authed && allowed !== false);
  const loading = !data && dataStatus === "loading";
  const now = useNow(30_000);
  const canLog = authed && allowed === true && show("tradeJournal");
  const log = useLogTrade(canLog, () => refresh(true));
  const riskPrefs = useRiskPrefs();
  const pill = allowed === true && show("forexClock") && now ? liveSessionPill(now) : null;

  const ctaLabel = tr("ثبت معامله", "Log trade");
  const cta = (cls: string) => (
    <button type="button" className={`trade-primary-btn th-cta ${cls}`} onClick={log.open} disabled={log.busy} aria-busy={log.busy}>
      {log.busy ? <Spinner size={17} label={null} /> : <Plus size={18} strokeWidth={2.2} aria-hidden="true" />}
      {ctaLabel}
    </button>
  );

  return (
    <section className="trade-desktop th-page">
      <div className="th-title-row">
        <span className="th-title-chip" aria-hidden="true"><TrendingUp size={22} strokeWidth={1.8} /></span>
        <h1>{tr("ترید", "Trading")}</h1>
        {pill && (
          <span className={`th-pill is-${pill.tone}`} role="status">
            <span className="th-pill-dot" aria-hidden="true" />
            <span className="th-pill-text">{pill.text}</span>
          </span>
        )}
        <div className="th-title-actions">
          {/* اشتراک کارنامه‌ی همه‌ی حساب‌ها — فقط با ماژول ترید و فلگ tradeShare؛ ?share=1 هم بازش می‌کنه */}
          <TradeShareButton deepLink className="th-share" size={18} />
          {canLog && cta("th-cta-desk")}
        </div>
      </div>

      {status === "loading" && <PanelSkeleton />}
      {status === "unauthenticated" && <AuthGate message={tr("برای استفاده از این سرویس وارد شوید", "Sign in to use this service")} />}

      {authed && (
        <ModuleGate module="TRADE">
          {allowed !== false && (
            <HubBody
              data={data}
              loading={loading}
              now={now}
              show={show}
              riskPrefs={riskPrefs}
              onExpire={() => refresh(true)}
              mobileCta={canLog ? cta("th-cta-mob") : null}
            />
          )}
        </ModuleGate>
      )}
      {log.modal}
    </section>
  );
}

function HubBody({ data, loading, now, show, riskPrefs, onExpire, mobileCta }: {
  data: TradeHubData | null;
  loading: boolean;
  now: Date | null;
  show: (k: FeatureKey) => boolean;
  riskPrefs: { mode: string; value: number } | null;
  onExpire: () => void;
  mobileCta: React.ReactNode;
}) {
  const kpi = data?.kpi ?? null;
  const showStats = show("tradeJournal");
  const showNews = show("economicCalendar");
  const tiles = (showStats ? 3 : 0) + (showNews ? 1 : 0);

  const cur = kpi?.currency ?? "USD";
  const noAccounts = !loading && !!kpi && kpi.accountCount === 0;
  const news = data?.nextNews ?? null;

  return (
    <div className="th-body-wrap">
      {tiles > 0 && (
        <div className="th-kpis" role="region" aria-label={tr("امروز", "Today")} style={{ ["--th-n" as string]: tiles }}>
          {showStats && (
            <>
              <Kpi
                loading={loading}
                label={tr("سود و زیان امروز", "Today's P&L")}
                value={kpi && !noAccounts ? <Num>{formatHubMoney(kpi.today.pnl, cur, true)}</Num> : "—"}
                tone={kpi && kpi.today.pnl > 0 ? "win" : kpi && kpi.today.pnl < 0 ? "loss" : undefined}
                sub={noAccounts ? tr("هنوز حسابی نساخته‌ای", "No trading account yet") : kpi ? (kpi.today.count ? tr(`${kpi.today.count} معامله بسته شده`, `${kpi.today.count} closed ${kpi.today.count === 1 ? "trade" : "trades"}`) : tr("معامله‌ی بسته‌ای نیست", "No closed trades")) : undefined}
              />
              <Kpi
                loading={loading}
                label={tr("وین‌ریت 30 روز", "30-day win rate")}
                value={kpi?.winRate != null ? <Num>{kpi.winRate}%</Num> : "—"}
                ring={kpi?.winRate ?? null}
                sub={kpi?.profitFactor != null ? <>{tr("پرافیت فکتور", "Profit factor")} <Num>{kpi.profitFactor.toFixed(1)}</Num></> : tr("معامله‌ی بسته‌ای در 30 روز اخیر نیست", "No closed trades in 30 days")}
              />
              <Kpi
                loading={loading}
                label={tr("معاملات باز", "Open trades")}
                value={kpi ? <Num>{kpi.openTrades}</Num> : "—"}
                sub={kpi?.openTrades ? <Num>{kpi.openSymbols.join(" · ")}</Num> : tr("معامله‌ی بازی نیست", "No open trades")}
              />
            </>
          )}
          {showNews && (
            <Kpi
              loading={loading}
              alert={!!news}
              label={<span className="th-lbl"><span className="th-dot is-high" aria-hidden="true" />{tr("خبر مهم بعدی", "Next key news")}</span>}
              value={news ? <NewsCountdown iso={news.occursAt} onExpire={onExpire} /> : "—"}
              sub={news ? <><bdi dir="ltr">{news.title}</bdi> · <bdi dir="ltr">{news.currency}</bdi></> : tr("خبر مهمی در پیش نیست", "No major news ahead")}
            />
          )}
        </div>
      )}

      {mobileCta}

      {show("forexClock") && <ClockCard now={now} />}

      <HubSections data={data} loading={loading} now={now} show={show} riskPrefs={riskPrefs} />
    </div>
  );
}

function HubSections({ data, loading, now, show, riskPrefs }: {
  data: TradeHubData | null;
  loading: boolean;
  now: Date | null;
  show: (k: FeatureKey) => boolean;
  riskPrefs: { mode: string; value: number } | null;
}) {
  const sub = (live: React.ReactNode, fallback: string) => (loading ? <Skel w="62%" h={11} /> : live ?? fallback);
  const body = (node: React.ReactNode, lines = 2) =>
    loading ? (
      <div className="th-body th-body-skel">{Array.from({ length: lines }, (_, i) => <Skel key={i} w={i ? "70%" : "100%"} h={14} />)}</div>
    ) : (
      <div className="th-body">{node}</div>
    );

  const clk = now ?? new Date(0);
  const nowReady = !!now;

  // ── تحلیل بازار ──
  const events = data?.calendar?.events ?? [];
  const chartSyms = useMemo(
    () => pickChartSymbols(data?.chart?.lastSymbol ?? null, data?.chart?.recentSymbols ?? [], DEFAULT_CHART_SYMBOLS, 4),
    [data?.chart?.lastSymbol, data?.chart?.recentSymbols]
  );
  const firstEv = events[0] ?? null;
  const analysis: React.ReactNode[] = [];
  if (show("tradeChart")) {
    analysis.push(
      <HubCard
        key="chart" href="/trade/chart" span={show("economicCalendar") ? 2 : 3} className="th-chart"
        icon={<CandlestickChart size={18} strokeWidth={1.8} />}
        title={tr("چارت", "Chart")}
        desc={tr("چارت تریدینگ‌ویو، تقویم و گفت‌وگوی هر نماد", "TradingView chart, calendar and chat for every symbol")}
        more={tr("باز کردن", "Open")}
        sub={sub(data?.chart?.lastSymbol ? <>{tr("آخرین نماد", "Last symbol")} <Num>{data.chart.lastSymbol}</Num></> : null, tr("تریدینگ‌ویو و گفت‌وگوی هر نماد", "TradingView and chat for every symbol"))}
        body={
          <div className="th-body">
            <div className="th-chips" dir="ltr">
              {chartSyms.map((s, i) => <span key={s} className={`th-chip-sym${i === 0 ? " is-on" : ""}`}>{s}</span>)}
            </div>
            <CandlePreview />
          </div>
        }
      />
    );
  }
  if (show("economicCalendar")) {
    analysis.push(
      <HubCard
        key="cal" href="/trade/calendar" className="th-cal"
        icon={<CalendarDays size={18} strokeWidth={1.8} />}
        title={tr("تقویم اقتصادی", "Economic calendar")}
        desc={tr("رویدادهای مهم با هشدار", "Key events with alerts")}
        sub={sub(firstEv ? <><bdi dir="ltr">{firstEv.title}</bdi> · <Num>{nowReady ? eventWhenLabel(firstEv.occursAt, clk) : hhmm(new Date(firstEv.occursAt))}</Num></> : null, tr("رویدادهای مهم بازار، با هشدار", "Key market events, with alerts"))}
        end={firstEv ? <ImpactDot impact={firstEv.impact} /> : undefined}
        body={
          <div className="th-body">
            {events.length ? (
              <div className="th-rows">
                {events.map((e) => (
                  <div className="th-row" key={e.id}>
                    <ImpactDot impact={e.impact} />
                    <span className={`th-row-t${e.impact === "HIGH" ? " is-strong" : ""}`}><bdi dir="ltr">{e.title}</bdi></span>
                    <Num>{nowReady ? eventWhenLabel(e.occursAt, clk) : ""}</Num>
                  </div>
                ))}
              </div>
            ) : (
              <p className="th-hint">{tr("رویداد مهمی در هفته‌ی پیش‌رو ثبت نشده", "No major events scheduled this week")}</p>
            )}
            <span className="th-more th-more-foot">{tr("همه‌ی رویدادها", "All events")}</span>
          </div>
        }
      />
    );
  }
  if (show("forexClock")) {
    // موبایل: ساعت فارکس یک ردیف لیست؛ دسکتاپ کارت نوار جلسه‌ها بالاتر نشون داده می‌شه
    const pill = nowReady ? liveSessionPill(clk) : null;
    analysis.push(
      <HubCard
        key="clock" href="/trade/clock" className="th-only-mob"
        icon={<Clock size={18} strokeWidth={1.8} />}
        title={tr("ساعت فارکس", "Forex clock")}
        desc={tr("وضعیت لحظه‌ای جلسه‌های معاملاتی", "Live status of the trading sessions")}
        sub={pill ? pill.text : <Skel w="50%" h={11} />}
      />
    );
  }

  // ── ژورنال و نظم ──
  const accs = data?.accounts ?? null;
  const journal: React.ReactNode[] = [];
  if (show("tradeJournal")) {
    const items = accs?.items ?? [];
    const sameCur = items.length > 0 && items.every((a) => a.currency === items[0].currency);
    const total = items.reduce((s, a) => s + a.balance, 0);
    const accSub = !accs ? null
      : accs.total === 0 ? tr("اولین حساب معاملاتی‌ات رو بساز", "Create your first trading account")
      : <>{tr(`${accs.total} حساب`, `${accs.total} ${accs.total === 1 ? "account" : "accounts"}`)}{sameCur && items.length === accs.total ? <> · <Num>{formatHubMoney(total, items[0].currency)}</Num></> : null}</>;
    journal.push(
      <HubCard
        key="journal" href="/trade/journal" className="th-journal"
        icon={<BookOpen size={18} strokeWidth={1.8} />}
        title={tr("ژورنال‌نویسی", "Journal")}
        desc={tr("حساب‌ها و آمار عملکرد", "Accounts and performance stats")}
        sub={sub(accSub, tr("حساب‌های معاملاتی، ثبت معامله و آمار عملکرد", "Trading accounts, trade logging and performance stats"))}
        body={body(
          items.length ? (
            <div className="th-rows">
              {items.map((a) => (
                <div className="th-row" key={a.id}>
                  <span className="th-acc-dot" style={{ background: a.color }} aria-hidden="true" />
                  <span className="th-row-t">{a.name}</span>
                  <Num><b>{formatHubMoney(a.balance, a.currency)}</b></Num>
                  {a.growthPct !== null && <Num><span className={`th-growth${a.growthPct > 0 ? " is-win" : a.growthPct < 0 ? " is-loss" : ""}`}>{formatPct(a.growthPct, true)}</span></Num>}
                </div>
              ))}
            </div>
          ) : (
            <p className="th-hint">{tr("هنوز حسابی نیست؛ با ساخت حساب، موجودی و رشدش این‌جا زنده می‌شه", "No account yet; once you add one, its balance and growth show up here")}</p>
          )
        )}
      />
    );
  }
  if (show("tradeChecklists")) {
    const c = data?.checklists ?? null;
    const last = c?.lastUsedAt && nowReady ? relativeDayLabel(c.lastUsedAt, clk) : null;
    const countText = c ? tr(`${c.count} چک‌لیست`, `${c.count} ${c.count === 1 ? "checklist" : "checklists"}`) : "";
    const footer = c && c.count ? <>{countText}{last ? ` · ${tr("آخرین استفاده", "last used")} ${last}` : ""}</> : null;
    const pct = c?.featured && c.featured.total ? Math.round((c.featured.checked / c.featured.total) * 100) : 0;
    journal.push(
      <HubCard
        key="checklists" href="/trade/checklists" className="th-checklists"
        icon={<ListChecks size={18} strokeWidth={1.8} />}
        title={tr("چک‌لیست", "Checklists")}
        desc={tr("شرط‌های ورود هر استراتژی", "Entry conditions for each strategy")}
        sub={sub(c ? (c.count ? footer : tr("هنوز چک‌لیستی نساخته‌ای", "No checklist yet")) : null, tr("شرط‌های ورود و اتصالشان به معامله", "Entry conditions and linking them to trades"))}
        body={body(
          c?.featured ? (
            <div className="th-prog">
              <div className="th-prog-top"><span>{c.featured.name}</span><Num><span className="th-muted">{c.featured.checked}/{c.featured.total}</span></Num></div>
              <div className="th-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><span style={{ width: `${pct}%` }} /></div>
              <span className="th-ks">{footer}</span>
            </div>
          ) : (
            <p className="th-hint">{tr("شرط‌های ورودت رو به‌صورت چک‌لیست بنویس و به هر معامله وصلش کن", "Write your entry conditions as a checklist and link it to each trade")}</p>
          )
        )}
      />
    );
  }
  if (show("tradeNotes")) {
    const n = data?.notes ?? null;
    journal.push(
      <HubCard
        key="notes" href="/trade/notes" className="th-notes"
        icon={<FileText size={18} strokeWidth={1.8} />}
        title={tr("یادداشت‌ها", "Notes")}
        desc={tr("تحلیل‌ها و تجربه‌های تو", "Your analyses and experiences")}
        sub={sub(n ? (n.latest ? n.latest.excerpt : tr("اولین یادداشتت رو بنویس", "Write your first note")) : null, tr("تحلیل‌ها و تجربه‌های شخصی", "Your analyses and personal experiences"))}
        body={body(
          n?.latest ? <p className="th-note">{n.latest.excerpt}</p> : <p className="th-hint">{tr("تحلیل‌ها و تجربه‌هات رو این‌جا نگه دار", "Keep your analyses and experiences here")}</p>
        )}
      />
    );
  }

  // ── ریسک و اتصال ──
  const risk: React.ReactNode[] = [];
  if (show("tradeRisk")) {
    const rv = riskPrefs ? (riskPrefs.mode === "percent" ? `${riskPrefs.value}%` : String(riskPrefs.value)) : null;
    risk.push(
      <HubCard
        key="risk" href="/trade/risk" className="th-risk"
        icon={<ShieldCheck size={18} strokeWidth={1.8} />}
        title={tr("ریسک و سود", "Risk and reward")}
        desc={tr("حجم معامله و نسبت ریسک به سود", "Position size and risk to reward")}
        sub={rv ? <>{riskPrefs?.mode === "percent" ? tr("ریسک هر معامله", "Risk per trade") : tr("مبلغ ریسک", "Risk amount")} <Num>{rv}</Num></> : tr("حجم معامله و نسبت ریسک به سود", "Position size and risk to reward")}
        body={
          <div className="th-body">
            {rv ? (
              <div className="th-stat">
                <span className="th-ks">{riskPrefs?.mode === "percent" ? tr("ریسک هر معامله", "Risk per trade") : tr("مبلغ ریسک", "Risk amount")}</span>
                <Num><b>{rv}</b></Num>
              </div>
            ) : (
              <p className="th-hint">{tr("درصد ریسک و حد ضرر رو بده تا حجم دقیق معامله حساب بشه", "Enter your risk percent and stop loss to get the exact position size")}</p>
            )}
          </div>
        }
      />
    );
  }
  if (show("tradeMoneyMgmt")) {
    risk.push(
      <HubCard
        key="money" href="/trade/money" className="th-money"
        icon={<WalletCards size={18} strokeWidth={1.8} />}
        title={tr("مدیریت سرمایه", "Money management")}
        desc={tr("اکسپرت حد ضرر روزانه و لات خودکار", "Expert for daily loss limit and automatic lot size")}
        sub={tr("اکسپرت MT4 و MT5", "MT4 and MT5 expert")}
        body={<div className="th-body"><div className="th-chips" dir="ltr"><span className="th-chip-sym">MT4</span><span className="th-chip-sym">MT5</span></div></div>}
      />
    );
  }
  if (show("metatrader")) {
    const mt = data?.metatrader ?? null;
    const ago = mt?.lastSyncAt && nowReady ? agoLabel(mt.lastSyncAt, clk) : null;
    const connectedText = mt ? (mt.connected ? tr(`${mt.connected} حساب متصل`, `${mt.connected} ${mt.connected === 1 ? "account" : "accounts"} connected`) : tr("متصل نیست", "Not connected")) : "";
    risk.push(
      <HubCard
        key="mt" href="/trade/metatrader" className="th-mt"
        icon={<Link2 size={18} strokeWidth={1.8} />}
        title={tr("اتصال متاتریدر", "MetaTrader connection")}
        desc={tr("دریافت خودکار معاملات", "Automatic trade import")}
        sub={sub(mt ? (mt.connected ? <>{connectedText}{ago ? ` · ${ago}` : ""}</> : tr("اتصال خودکار معاملات", "Connect for automatic trade import")) : null, tr("دریافت خودکار معاملات، برای هر حساب جداگانه", "Automatic trade import, separately for each account"))}
        end={mt?.connected ? <span className="th-dot is-ok" aria-hidden="true" /> : undefined}
        body={body(
          mt ? (
            <div className="th-mt-row">
              <span className={`th-pill is-${mt.connected ? "open" : "closed"}`}>
                <span className="th-pill-dot" aria-hidden="true" />{connectedText}
              </span>
              {mt.connected > 0 && ago && <span className="th-ks">{tr("آخرین همگام‌سازی", "Last sync")} {ago}</span>}
            </div>
          ) : null, 1
        )}
      />
    );
  }

  const groups = [
    { key: "analysis", title: tr("تحلیل بازار", "Market analysis"), cards: analysis },
    { key: "journal", title: tr("ژورنال و نظم", "Journal and discipline"), cards: journal },
    { key: "risk", title: tr("ریسک و اتصال", "Risk and connection"), cards: risk },
  ].filter((g) => g.cards.length > 0);
  // گروهی که فقط ردیف موبایلی ساعت دارد روی دسکتاپ خالی می‌شود → پنهان (CSS)
  const mobOnly = (cards: React.ReactNode[]) => cards.every((c) => (c as React.ReactElement)?.key === "clock");

  return (
    <>
      {groups.map((g) => (
        <div className={`th-group${mobOnly(g.cards) ? " th-group-mob" : ""}`} key={g.key}>
          <h2 className="th-sec">{g.title}</h2>
          <div className="th-grid">{g.cards}</div>
        </div>
      ))}
    </>
  );
}
