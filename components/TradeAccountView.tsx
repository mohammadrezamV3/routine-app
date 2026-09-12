"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Award, Building2, ChevronDown, ChevronRight, Flame, Gauge, Hash,
  Inbox, Pencil, Percent, Plus, Scale, Sigma, Snowflake, TrendingDown,
  TrendingUp, Wallet, Zap,
} from "lucide-react";
import { faNum, isoLocal } from "@/lib/jalali";
import { getSetting } from "@/lib/storage";
import { computeTradeStats, statValue } from "@/lib/tradeAnalytics";
import { formatTradeDateTime } from "@/lib/tradeDateTime";
import {
  ACCOUNT_TYPE_LABELS, CAL_SYSTEM_KEY, CalSystem, currencySymbol,
  DEFAULT_VISIBLE_TRADE_FACTS, DEFAULT_VISIBLE_TRADE_STATS, RESULT_LABELS, STATUS_LABELS,
  TRADE_FACT_LABELS, TRADE_FACTS_VISIBILITY_KEY, TRADE_STAT_LABELS, TRADE_STAT_ORDER,
  TRADE_STATS_VISIBILITY_KEY, TradeAccount, TradeEntry, TradeEntryDetail,
  TradeFactKey, TradeStatKey, TradeTag,
} from "@/lib/tradeTypes";
import { SESSION_LABELS } from "@/lib/forexSessions";
import { TradeAccountModal } from "./TradeAccountModal";
import { TradeFormModal } from "./TradeFormModal";
import { TradeDetailDrawer } from "./TradeDetailDrawer";
import { TradeCalendarPanel } from "./TradeCalendarPanel";
import { PanelSkeleton } from "./PanelSkeleton";
import { useAsyncAction } from "@/lib/useAsyncAction";

// آیکون هر کارت آماری — فقط یک لمس بصری، بدون تغییر در منطق محاسبه‌ها
const TRADE_STAT_ICONS: Record<TradeStatKey, typeof Wallet> = {
  goalRing: Award,
  balance: Wallet,
  monthTotal: TrendingUp,
  total: Hash,
  winRate: Percent,
  avgWin: TrendingUp,
  avgLoss: TrendingDown,
  largestGain: TrendingUp,
  largestLoss: TrendingDown,
  maxWinStreak: Flame,
  maxLossStreak: Snowflake,
  avgR: Gauge,
  profitFactor: Scale,
  maxDrawdown: TrendingDown,
  expectancy: Sigma,
};

// سه آماری که همیشه بالای باکس‌اند و توی لیست «بقیه‌ی آمارها» تکرار نمی‌شوند
const HEADLINE_STATS: TradeStatKey[] = ["goalRing", "monthTotal", "winRate"];

/**
 * صفحه‌ی یک حساب («ژورنال‌نویسی»).
 *
 * چیدمان طبق شماتیکِ خواسته‌شده، از بالا به پایین:
 *   ۱) تایتل صفحه، و زیرش نام حساب (ابتدای خط) هم‌ردیفِ بالانس اولیه (انتهای خط)
 *   ۲) یک باکسِ واحدِ دوبخشی: بالا سه آمارِ سرخط (سود/زیان، دایره‌ی هدف،
 *      نرخ برد) + کشویی نرمِ بقیه‌ی آمارها؛ پایینِ همان باکس، تقویمِ ماهانه
 *   ۳) «تریدها» هم‌ردیفِ دکمه‌ی افزودن، و زیرش تریدهای همان روزِ انتخاب‌شده‌ی
 *      تقویم — هرکدام با دکمه‌ی «جزئیات» که کارتِ کاملِ معامله را باز می‌کند.
 */
export function TradeAccountView({ accountId }: { accountId: string }) {
  const [account, setAccount] = useState<TradeAccount | null>(null);
  const [entries, setEntries] = useState<TradeEntry[]>([]);
  const [tags, setTags] = useState<TradeTag[]>([]);
  const [calSystem, setCalSystem] = useState<CalSystem>("jalali");
  const [visibleStats, setVisibleStats] = useState<TradeStatKey[]>(DEFAULT_VISIBLE_TRADE_STATS);
  const [visibleFacts, setVisibleFacts] = useState<TradeFactKey[]>(DEFAULT_VISIBLE_TRADE_FACTS);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);

  const [editingAccount, setEditingAccount] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TradeEntryDetail | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const { error: actionError, run } = useAsyncAction();

  useEffect(() => {
    getSetting<CalSystem>(CAL_SYSTEM_KEY, "jalali").then(setCalSystem);
    getSetting<TradeStatKey[]>(TRADE_STATS_VISIBILITY_KEY, DEFAULT_VISIBLE_TRADE_STATS)
      .then((v) => setVisibleStats(v?.length ? v : DEFAULT_VISIBLE_TRADE_STATS));
    getSetting<TradeFactKey[]>(TRADE_FACTS_VISIBILITY_KEY, DEFAULT_VISIBLE_TRADE_FACTS)
      .then((v) => setVisibleFacts(v?.length ? v : DEFAULT_VISIBLE_TRADE_FACTS));
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [aRes, eRes, tRes] = await Promise.all([
        fetch("/api/trade/accounts?archived=1"),
        fetch(`/api/trade/entries?accountId=${accountId}`),
        fetch("/api/trade/tags"),
      ]);
      const aData = aRes.ok ? await aRes.json() : null;
      const found = (aData?.accounts || []).find((a: TradeAccount) => a.id === accountId) || null;
      if (!found) { setNotFound(true); return; }
      setAccount(found);
      setEntries(eRes.ok ? (await eRes.json()).entries || [] : []);
      setTags(tRes.ok ? (await tRes.json()).tags || [] : []);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [accountId]);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => computeTradeStats(entries, account || undefined), [entries, account]);

  // روزِ نمایش‌داده‌شده: هرچه روی تقویم انتخاب شده، وگرنه امروز. لیستِ پایین
  // همیشه «تریدهای همان روز» است، نه کلِ تاریخچه — طبق شماتیک.
  const activeDay = selectedDay || isoLocal(new Date());
  const dayEntries = useMemo(
    () => entries.filter((e) => isoLocal(new Date(e.openedAt)) === activeDay),
    [entries, activeDay]
  );

  function editEntry(entry: TradeEntryDetail) {
    setEditingEntry(entry);
    setDetailId(null);
    setFormOpen(true);
  }

  async function deleteEntry(id: string) {
    const snapshot = entries;
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setDetailId(null);
    const ok = await run("delete", () => fetch(`/api/trade/entries?id=${id}`, { method: "DELETE" }));
    // اگر حذف روی سرور نگرفت، ردیف را برگردان تا کاربر فکر نکند پاک شده
    if (!ok) { setEntries(snapshot); return; }
    load(true);
  }

  if (loading && !account) return <PanelSkeleton />;
  if (notFound) return <div className="item-line empty">این حساب پیدا نشد.</div>;
  if (!account) return null;

  const goal = stats.goalProgress;
  const inProfit = stats.netPnl > 0;
  const sym = currencySymbol(account.currency);
  const restStats = TRADE_STAT_ORDER.filter((k) => !HEADLINE_STATS.includes(k) && visibleStats.includes(k));

  return (
    <div>
      <Link href="/trade/journal" className="trade-back-link"><ChevronRight size={15} /> حساب‌ها</Link>

      <h1 className="trade-journal-title">ژورنال‌نویسی</h1>

      {/* نام حساب ابتدای خط، بالانس اولیه انتهای همان خط */}
      <div className="trade-journal-idrow">
        <div className="trade-journal-idrow-name">
          <span className="trade-journal-acc-dot" style={{ background: account.color }} />
          <b>{account.name}</b>
          <span className="trade-account-type">{ACCOUNT_TYPE_LABELS[account.type]}</span>
          {account.archived && <span className="trade-account-archived-badge">آرشیو</span>}
          <button type="button" className="trade-icon-btn" onClick={() => setEditingAccount(true)} aria-label="ویرایش حساب">
            <Pencil size={14} />
          </button>
        </div>
        <div className="trade-journal-idrow-balance">
          <span>بالانس اولیه</span>
          <b className="mono">{faNum(account.initialBalance.toFixed(2))} {sym}</b>
        </div>
      </div>

      {(account.broker || account.leverage) && (
        <div className="trade-journal-submeta">
          {account.broker && <span><Building2 size={12} /> {account.broker}</span>}
          {account.leverage ? <span className="mono"><Zap size={12} /> 1:{faNum(account.leverage)}</span> : null}
        </div>
      )}

      {actionError && <div className="trade-form-error">{actionError}</div>}

      {/* ── باکسِ واحدِ دوبخشی: آمار (بالا) + تقویم (پایین) ────────────── */}
      <div className="trade-surface trade-journal-box">
        <div className="trade-journal-stats-part">
          <div className="trade-headline-stats">
            <HeadlineStat
              label="نرخ برد"
              value={stats.winRate === null ? "—" : `${faNum(stats.winRate)}٪`}
              tone={stats.winRate === null ? undefined : stats.winRate >= 50 ? "up" : "down"}
              icon={<Percent size={13} />}
            />

            {/* دایره‌ی هدفِ سود: توی ضرر خالی می‌ماند (صفر)، توی سود پر می‌شود.
                دایره سمتِ راست، و لیبل + مقدارِ هدف سمتِ چپش. */}
            <div className="trade-headline-goal">
              <div className="trade-goal-ring-wrap">
                <svg viewBox="0 0 72 72" className="trade-goal-ring">
                  <circle cx="36" cy="36" r="30" fill="none" stroke="var(--line)" strokeWidth="6" />
                  <circle
                    cx="36" cy="36" r="30" fill="none" strokeWidth="6" strokeLinecap="round"
                    stroke="var(--pnl-win)"
                    strokeDasharray={2 * Math.PI * 30}
                    strokeDashoffset={2 * Math.PI * 30 * (1 - (inProfit ? (goal ?? 0) : 0))}
                    transform="rotate(-90 36 36)"
                    className="trade-goal-ring-fill"
                  />
                </svg>
                <span className="trade-goal-ring-pct mono">
                  {faNum(Math.round((inProfit ? (goal ?? 0) : 0) * 100))}٪
                </span>
              </div>
              <div className="trade-headline-goal-text">
                <div className="trade-stat-label">هدف سود</div>
                <div className="trade-headline-goal-target mono">
                  {faNum((stats.goalTarget || 0).toFixed(0))} {sym}
                </div>
              </div>
            </div>

            <HeadlineStat
              label="سود / ضرر"
              value={`${faNum(stats.netPnl.toFixed(2))} ${sym}`}
              tone={stats.netPnl >= 0 ? "up" : "down"}
              icon={stats.netPnl >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            />
          </div>

          {!!restStats.length && (
            <>
              {/* دستگیره‌ی کوچکِ بی‌متن زیرِ آمارها: یک پیکانِ رو به پایین با
                  رنگِ اکسنت که با نبضِ آرام می‌فهماند این‌جا چیزی برای باز
                  کردن هست. متنِ واقعی‌اش در aria-label می‌ماند. */}
              <button
                type="button"
                className={`trade-stats-handle${statsOpen ? " open" : ""}`}
                onClick={() => setStatsOpen((v) => !v)}
                aria-expanded={statsOpen}
                aria-label={statsOpen ? "بستن بقیه‌ی آمارها" : "نمایش بقیه‌ی آمارها"}
              >
                <ChevronDown size={18} aria-hidden="true" />
              </button>

              {/* انیمیشنِ نرمِ باز شدن با grid-template-rows: 0fr → 1fr — برخلاف
                  max-height ثابت، به ارتفاعِ واقعیِ محتوا گره خورده، پس نه
                  می‌پرد نه وسطِ راه قطع می‌شود. */}
              <div className={`trade-stats-collapse${statsOpen ? " open" : ""}`}>
                <div className="trade-stats-collapse-inner">
                  <div className="trade-stats-grid">
                    {restStats.map((k) => {
                      const v = statValue(k, stats);
                      if (!v) return null;
                      const Icon = TRADE_STAT_ICONS[k];
                      return (
                        <div key={k} className="trade-stat-tile">
                          <div className="trade-stat-label"><Icon size={12} /> {TRADE_STAT_LABELS[k]}</div>
                          <div
                            className="trade-stat-value mono"
                            style={v.positive === undefined ? undefined : { color: v.positive ? "var(--pnl-win)" : "var(--pnl-loss)" }}
                          >
                            {faNum(v.value)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <TradeCalendarPanel
          embedded
          entries={entries}
          currency={account.currency}
          calSystem={calSystem}
          selectedDay={selectedDay}
          onSelectDay={(iso) => setSelectedDay((prev) => (prev === iso ? null : iso))}
        />
      </div>

      {/* ── تریدهای روزِ انتخاب‌شده ───────────────────────────────────── */}
      <div className="trade-list-head">
        <div className="trade-section-title">
          تریدها
          <span className="trade-day-label">
            {formatTradeDateTime(new Date(`${activeDay}T00:00:00`).toISOString(), calSystem, false)}
          </span>
        </div>
        <button type="button" className="trade-add-btn" onClick={() => { setEditingEntry(null); setFormOpen(true); }}>
          <Plus size={15} /> افزودن
        </button>
      </div>

      <div className="trade-surface trade-day-box">
        {!dayEntries.length && (
          <div className="trade-empty-state">
            <Inbox size={28} />
            <p>برای این روز معامله‌ای ثبت نشده</p>
          </div>
        )}

        {dayEntries.map((e) => (
          <div key={e.id} className="trade-day-row">
            <div className="trade-day-row-head">
              <span className={`trade-row-dir ${e.direction === "BUY" ? "buy" : "sell"}`}>
                {e.direction === "BUY" ? "خرید" : "فروش"}
              </span>
              <span className="trade-row-symbol mono">{e.symbol}</span>
              {e.status === "CLOSED" ? (
                <b className="mono trade-day-row-pnl" style={{ color: e.pnl > 0 ? "var(--pnl-win)" : e.pnl < 0 ? "var(--pnl-loss)" : "var(--muted)" }}>
                  {faNum(e.pnl.toFixed(2))} {sym}
                </b>
              ) : (
                <b className="trade-row-status trade-day-row-pnl">{STATUS_LABELS[e.status]}</b>
              )}
            </div>

            <div className="trade-day-row-facts">
              {visibleFacts.map((k) => {
                const v = tradeFactValue(k, e, calSystem, sym);
                if (!v) return null;
                return (
                  <span key={k}>
                    {TRADE_FACT_LABELS[k]} <b className="mono">{v}</b>
                  </span>
                );
              })}
            </div>

            {(e.checklistTotal !== null || !!e.tags.length) && (
              <div className="trade-row-badges">
                {e.checklistTotal !== null && (
                  <span className={`trade-row-badge${(e.checklistDone ?? 0) < (e.checklistTotal ?? 0) ? " warn" : ""}`}>
                    {e.checklistName}: {faNum(e.checklistDone ?? 0)}/{faNum(e.checklistTotal ?? 0)}
                  </span>
                )}
                {e.tags.map((t) => (
                  <span key={t.id} className="trade-row-badge" style={{ borderColor: t.color, color: t.color }}>{t.name}</span>
                ))}
              </div>
            )}

            <button type="button" className="trade-detail-btn" onClick={() => setDetailId(e.id)}>
              جزئیات
            </button>
          </div>
        ))}
      </div>

      {/* جزئیات کامل اتصال (مراحل نصب، کد اتصال، ...) جاش صفحه‌ی
          اختصاصی /trade/metatrader/[id]ه — این‌جا فقط یک خط وضعیته. */}
      <Link href={`/trade/metatrader/${account.id}?from=account`} className="trade-surface trade-mt-line">
        <span>اتصال متاتریدر</span>
        <span className={`trade-mt-status${account.mtConnected ? " connected" : ""}`}>
          <span className="forex-dot" />
          {account.mtConnected ? "فعال" : "غیرفعال"}
        </span>
      </Link>

      {editingAccount && (
        <TradeAccountModal
          account={account}
          tags={tags}
          onTagCreated={(t) => setTags((p) => [...p, t])}
          onClose={() => setEditingAccount(false)}
          onSaved={() => { setEditingAccount(false); load(true); }}
        />
      )}

      {formOpen && (
        <TradeFormModal
          account={account}
          entry={editingEntry}
          tags={tags}
          calSystem={calSystem}
          onTagCreated={(t) => setTags((p) => [...p, t])}
          onClose={() => { setFormOpen(false); setEditingEntry(null); }}
          onSaved={() => { setFormOpen(false); setEditingEntry(null); load(true); }}
        />
      )}

      {detailId && (
        <TradeDetailDrawer
          entryId={detailId}
          calSystem={calSystem}
          currency={account.currency}
          onClose={() => setDetailId(null)}
          onEdit={editEntry}
          onDelete={() => deleteEntry(detailId)}
        />
      )}
    </div>
  );
}

/**
 * مقدارِ یک «جزئیاتِ اولیه» برای نمایش در ردیفِ ترید.
 * `null` یعنی این ترید آن فیلد را ندارد، پس اصلا رندر نمی‌شود (نه «—»).
 */
function tradeFactValue(
  key: TradeFactKey,
  e: TradeEntry,
  calSystem: CalSystem,
  sym: string
): string | null {
  // فقط ساعت، نه تاریخ: تاریخِ همه‌ی این ردیف‌ها همان روزِ انتخاب‌شده است
  const timeOf = (iso: string) => formatTradeDateTime(iso, calSystem).split(" ").slice(-1)[0];
  switch (key) {
    case "openedAt": return timeOf(e.openedAt);
    case "closedAt": return e.closedAt ? timeOf(e.closedAt) : null;
    case "volume": return `${faNum(e.volume)} ${e.volumeUnit === "LOT" ? "لات" : "$"}`;
    case "rMultiple": return e.rMultiple === null ? null : `${e.rMultiple > 0 ? "+" : ""}${faNum(e.rMultiple)}`;
    case "timeframe": return e.timeframe || null;
    case "setup": return e.setup || null;
    case "entryPrice": return e.entryPrice === null ? null : faNum(e.entryPrice);
    case "exitPrice": return e.exitPrice === null ? null : faNum(e.exitPrice);
    case "stopLoss": return e.stopLoss === null ? null : faNum(e.stopLoss);
    case "takeProfit": return e.takeProfit === null ? null : faNum(e.takeProfit);
    case "riskAmount": return e.riskAmount === null ? null : `${faNum(e.riskAmount)} ${sym}`;
    case "commission": return e.commission === null ? null : faNum(e.commission);
    case "swap": return e.swap === null ? null : faNum(e.swap);
    case "session": return e.sessions.length ? e.sessions.map((s) => SESSION_LABELS[s]).join("، ") : null;
    case "confidence": return e.confidence === null ? null : `${faNum(e.confidence)}/۱۰`;
    case "result": return RESULT_LABELS[e.result];
  }
}

function HeadlineStat({
  label, value, tone, icon,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
  icon: JSX.Element;
}) {
  return (
    <div className="trade-headline-stat">
      <div className="trade-stat-label">{icon} {label}</div>
      <div
        className="trade-headline-value mono"
        style={tone ? { color: tone === "up" ? "var(--pnl-win)" : "var(--pnl-loss)" } : undefined}
      >
        {value}
      </div>
    </div>
  );
}
