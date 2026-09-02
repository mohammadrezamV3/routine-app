"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Pencil, Plus, Search } from "lucide-react";
import { faNum } from "@/lib/jalali";
import { getSetting } from "@/lib/storage";
import { computeTradeStats, statValue } from "@/lib/tradeAnalytics";
import { formatTradeDateTime } from "@/lib/tradeDateTime";
import {
  ACCOUNT_TYPE_LABELS, CAL_SYSTEM_KEY, CalSystem, DEFAULT_VISIBLE_TRADE_STATS,
  RESULT_LABELS, STATUS_LABELS, TRADE_STAT_LABELS, TRADE_STAT_ORDER, TRADE_STATS_VISIBILITY_KEY,
  TradeAccount, TradeEntry, TradeEntryDetail, TradeStatKey, TradeStatus, TradeTag,
} from "@/lib/tradeTypes";
import { TradeAccountModal } from "./TradeAccountModal";
import { TradeFormModal } from "./TradeFormModal";
import { TradeDetailDrawer } from "./TradeDetailDrawer";
import { PanelSkeleton } from "./PanelSkeleton";
import { useAsyncAction } from "@/lib/useAsyncAction";

type StatusFilter = "ALL" | TradeStatus;

// صفحه‌ی یک حساب: مشخصات + آمار + لیست معاملات. طبق اصل «بدون شلوغی
// غیرضروری»ی اسپک، این‌جا فقط همین سه بخش است و هر چیز عمیق‌تر (جزئیات
// معامله، تصاویر، چک‌لیست) یک لایه پایین‌تر، در کشوی جزئیات، باز می‌شود.
export function TradeAccountView({ accountId }: { accountId: string }) {
  const [account, setAccount] = useState<TradeAccount | null>(null);
  const [entries, setEntries] = useState<TradeEntry[]>([]);
  const [tags, setTags] = useState<TradeTag[]>([]);
  const [calSystem, setCalSystem] = useState<CalSystem>("jalali");
  const [visibleStats, setVisibleStats] = useState<TradeStatKey[]>(DEFAULT_VISIBLE_TRADE_STATS);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [query, setQuery] = useState("");

  const [editingAccount, setEditingAccount] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TradeEntryDetail | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const { error: actionError, run } = useAsyncAction();

  useEffect(() => {
    getSetting<CalSystem>(CAL_SYSTEM_KEY, "jalali").then(setCalSystem);
    getSetting<TradeStatKey[]>(TRADE_STATS_VISIBILITY_KEY, DEFAULT_VISIBLE_TRADE_STATS)
      .then((v) => setVisibleStats(v?.length ? v : DEFAULT_VISIBLE_TRADE_STATS));
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

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    return entries.filter((e) => {
      if (statusFilter !== "ALL" && e.status !== statusFilter) return false;
      if (q && !e.symbol.includes(q) && !(e.setup || "").toUpperCase().includes(q)) return false;
      return true;
    });
  }, [entries, statusFilter, query]);

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

  return (
    <div>
      <Link href="/trade/journal" className="trade-back-link"><ChevronRight size={15} /> حساب‌ها</Link>

      <div className="trade-surface trade-account-header">
        <span className="trade-account-stripe" style={{ background: account.color }} />
        <div className="trade-account-header-main">
          <div className="trade-account-title-row">
            <h1 style={{ margin: 0 }}>{account.name}</h1>
            <span className="trade-account-type">{ACCOUNT_TYPE_LABELS[account.type]}</span>
            {account.archived && <span className="trade-account-archived-badge">آرشیو</span>}
          </div>
          <div className="trade-account-meta">
            {account.broker && <span>{account.broker}</span>}
            <span className="mono">{account.currency}</span>
            {account.leverage ? <span className="mono">1:{faNum(account.leverage)}</span> : null}
            <span>بالانس اولیه: <b className="mono">{faNum(account.initialBalance.toFixed(2))}</b></span>
          </div>
        </div>
        <div className="trade-account-header-actions">
          <button type="button" className="trade-icon-btn" onClick={() => setEditingAccount(true)} aria-label="ویرایش حساب"><Pencil size={16} /></button>
          <button type="button" className="trade-primary-btn" onClick={() => { setEditingEntry(null); setFormOpen(true); }}>
            <Plus size={15} /> افزودن معامله
          </button>
        </div>
      </div>

      {actionError && <div className="trade-form-error">{actionError}</div>}

      {visibleStats.includes("goalRing") && goal !== null && (
        <div className="trade-goal-ring-row">
          <div className="trade-goal-ring-wrap">
            <svg viewBox="0 0 72 72" className="trade-goal-ring">
              <circle cx="36" cy="36" r="30" fill="none" stroke="var(--line)" strokeWidth="6" />
              <circle
                cx="36" cy="36" r="30" fill="none" strokeWidth="6" strokeLinecap="round"
                stroke={stats.netPnl >= 0 ? "var(--accent)" : "#E05252"}
                strokeDasharray={2 * Math.PI * 30}
                strokeDashoffset={2 * Math.PI * 30 * (1 - goal)}
                transform="rotate(-90 36 36)"
                className="trade-goal-ring-fill"
              />
            </svg>
            <span className="trade-goal-ring-pct mono">{faNum(Math.round(goal * 100))}٪</span>
          </div>
          <div className="trade-goal-ring-text">
            <div className="trade-stat-label">هدف سود</div>
            <div className="trade-stat-value" style={{ color: stats.netPnl >= 0 ? "var(--accent)" : "#E05252" }}>
              {faNum(stats.netPnl.toFixed(2))}
              <span className="calorie-meal-of"> / {faNum((stats.goalTarget || 0).toFixed(2))}</span>
            </div>
          </div>
        </div>
      )}

      <div className="trade-stats-grid">
        {TRADE_STAT_ORDER.filter((k) => k !== "goalRing" && visibleStats.includes(k)).map((k) => {
          const v = statValue(k, stats);
          if (!v) return null;
          return (
            <div key={k} className="trade-stat-tile">
              <div className="trade-stat-label">{TRADE_STAT_LABELS[k]}</div>
              <div
                className="trade-stat-value mono"
                style={v.positive === undefined ? undefined : { color: v.positive ? "var(--accent)" : "#E05252" }}
              >
                {faNum(v.value)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="trade-list-head">
        <div className="domain-sub" style={{ margin: 0 }}>معاملات ({faNum(filtered.length)})</div>
        <div className="trade-list-filters">
          <div className="trade-search">
            <Search size={14} />
            <input className="wsearch-newform-name trade-glass-field" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="نماد یا ستاپ" />
          </div>
          <select className="wsearch-newform-name trade-glass-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
            <option value="ALL">همه</option>
            <option value="CLOSED">بسته</option>
            <option value="OPEN">باز</option>
            <option value="CANCELED">لغو شده</option>
          </select>
        </div>
      </div>

      {!filtered.length && <div className="item-line empty">معامله‌ای برای نمایش نیست</div>}

      <div className="trade-list">
        {filtered.map((e) => (
          <button key={e.id} type="button" className="trade-row" onClick={() => setDetailId(e.id)}>
            <span className={`trade-row-dir ${e.direction === "BUY" ? "buy" : "sell"}`}>
              {e.direction === "BUY" ? "خرید" : "فروش"}
            </span>

            <span className="trade-row-main">
              <span className="trade-row-symbol mono">{e.symbol}</span>
              <span className="trade-row-sub">
                {formatTradeDateTime(e.openedAt, calSystem)}
                {e.timeframe ? ` · ${e.timeframe}` : ""}
                {e.setup ? ` · ${e.setup}` : ""}
              </span>
              {(e.checklistTotal !== null || !!e.tags.length) && (
                <span className="trade-row-badges">
                  {e.checklistTotal !== null && (
                    <span className={`trade-row-badge${(e.checklistDone ?? 0) < (e.checklistTotal ?? 0) ? " warn" : ""}`}>
                      {e.checklistName}: {faNum(e.checklistDone ?? 0)}/{faNum(e.checklistTotal ?? 0)}
                    </span>
                  )}
                  {e.tags.map((t) => (
                    <span key={t.id} className="trade-row-badge" style={{ borderColor: t.color, color: t.color }}>{t.name}</span>
                  ))}
                </span>
              )}
            </span>

            <span className="trade-row-numbers">
              {e.status === "CLOSED" ? (
                <b className="mono" style={{ color: e.pnl > 0 ? "var(--accent)" : e.pnl < 0 ? "#E05252" : "var(--muted)" }}>
                  {faNum(e.pnl.toFixed(2))}
                </b>
              ) : (
                <b className="trade-row-status">{STATUS_LABELS[e.status]}</b>
              )}
              <span className="trade-row-r mono">
                {e.rMultiple !== null ? `${e.rMultiple > 0 ? "+" : ""}${faNum(e.rMultiple)}R` : `${faNum(e.volume)} ${e.volumeUnit === "LOT" ? "لات" : "$"}`}
              </span>
            </span>
          </button>
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
