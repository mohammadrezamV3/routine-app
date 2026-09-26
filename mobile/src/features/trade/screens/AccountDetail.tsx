import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Plus, Pencil, Archive } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { db, touch, type TradeEntryRow } from "../db";
import { useLiveQuery } from "../lib/useLiveQuery";
import { computeTradeStats } from "../lib/tradeAnalytics";
import { currencySymbol } from "../lib/types";
import StatTile from "../components/StatTile";
import EquityCurve from "../components/EquityCurve";
import TradeListRow from "../components/TradeListRow";
import TradeFormSheet from "../components/TradeFormSheet";
import TradeDetailSheet from "../components/TradeDetailSheet";
import AccountFormSheet from "../components/AccountFormSheet";
import { tapHaptic } from "@/lib/haptics";

type StatusFilter = "ALL" | "OPEN" | "CLOSED";

export default function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const [addOpen, setAddOpen] = useState(false);
  const [editAccountOpen, setEditAccountOpen] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<TradeEntryRow | null>(null);
  const [editingTrade, setEditingTrade] = useState<TradeEntryRow | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const account = useLiveQuery(() => (id ? db.accounts.get(id) : undefined), [id]);
  const trades =
    useLiveQuery(
      () =>
        id
          ? db.trades
              .where("accountId")
              .equals(id)
              .toArray()
              .then((rows) => rows.filter((t) => !t.deletedAt).sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()))
          : Promise.resolve([] as TradeEntryRow[]),
      [id],
      [],
    ) ?? [];

  const stats = useMemo(() => computeTradeStats(trades, account ?? undefined), [trades, account]);

  const equityPoints = useMemo(() => {
    const closed = trades
      .filter((t) => t.status === "CLOSED")
      .slice()
      .sort((a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime());
    let cum = account?.initialBalance ?? 0;
    const pts = [cum];
    for (const t of closed) {
      cum += t.pnl;
      pts.push(cum);
    }
    return pts;
  }, [trades, account]);

  const filteredTrades = useMemo(() => {
    if (statusFilter === "ALL") return trades;
    return trades.filter((t) => t.status === statusFilter);
  }, [trades, statusFilter]);

  async function archiveAccount() {
    if (!account) return;
    await db.accounts.put(touch({ ...account, archived: true, archivedAt: new Date().toISOString() }));
    await tapHaptic();
    history.back();
  }

  if (!account) {
    return (
      <div>
        <AppHeader title="حساب" showBack />
        <div className="px-4 py-8 text-center font-vazir text-[13px]" style={{ color: "var(--muted)" }}>
          حساب یافت نشد.
        </div>
      </div>
    );
  }

  return (
    <div>
      <AppHeader
        title={account.name}
        showBack
        right={
          <div className="flex gap-1">
            <button
              onClick={() => setEditAccountOpen(true)}
              className="flex items-center justify-center"
              style={{ width: 40, height: 40 }}
              aria-label="ویرایش حساب"
            >
              <Pencil size={17} color="var(--text)" />
            </button>
            <button
              onClick={archiveAccount}
              className="flex items-center justify-center"
              style={{ width: 40, height: 40 }}
              aria-label="آرشیو حساب"
            >
              <Archive size={17} color="var(--muted)" />
            </button>
          </div>
        }
      />

      <div className="flex flex-col gap-4 px-4 py-4 pb-24">
        <EquityCurve points={equityPoints} />

        <div className="flex flex-wrap gap-2">
          <StatTile label="بالانس" value={`${currencySymbol(account.currency)} ${stats.balance.toFixed(2)}`} />
          <StatTile label="سود/زیان کل" value={stats.netPnl.toFixed(2)} positive={stats.netPnl >= 0} />
          <StatTile label="نرخ برد" value={stats.winRate === null ? "—" : `${stats.winRate}٪`} positive={stats.winRate !== null && stats.winRate >= 50} />
          <StatTile label="میانگین R" value={stats.avgR === null ? "—" : `${stats.avgR > 0 ? "+" : ""}${stats.avgR}`} positive={stats.avgR !== null && stats.avgR >= 0} />
          <StatTile label="فاکتور سود" value={stats.profitFactor === null ? "—" : String(stats.profitFactor)} positive={stats.profitFactor !== null && stats.profitFactor >= 1} />
          <StatTile label="بیشترین افت" value={stats.maxDrawdown.toFixed(2)} positive={false} />
        </div>

        {stats.goalTarget !== null && (
          <div className="rounded-card border px-4 py-3" style={{ borderColor: "var(--surface-line)", background: "var(--surface-1)" }}>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-vazir text-[12.5px]" style={{ color: "var(--muted)" }}>
                پیشرفت هدف
              </span>
              <span className="font-vazir text-[12.5px] font-semibold" style={{ color: "var(--text)" }}>
                {Math.round((stats.goalProgress ?? 0) * 100)}٪
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.round((stats.goalProgress ?? 0) * 100)}%`, background: "var(--accent)" }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {(["ALL", "OPEN", "CLOSED"] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className="flex-1 rounded-lg py-2 font-vazir text-[12.5px]"
              style={{
                background: statusFilter === f ? "var(--accent-dim)" : "var(--surface-2)",
                color: statusFilter === f ? "var(--accent)" : "var(--muted)",
              }}
            >
              {f === "ALL" ? "همه" : f === "OPEN" ? "باز" : "بسته"}
            </button>
          ))}
        </div>

        <div className="rounded-card border" style={{ borderColor: "var(--surface-line)", background: "var(--surface-1)" }}>
          {filteredTrades.length === 0 ? (
            <div className="px-4 py-8 text-center font-vazir text-[13px]" style={{ color: "var(--muted)" }}>
              معامله‌ای ثبت نشده.
            </div>
          ) : (
            filteredTrades.map((t) => <TradeListRow key={t.id} trade={t} onClick={() => setSelectedTrade(t)} />)
          )}
        </div>
      </div>

      <button
        onClick={() => {
          void tapHaptic();
          setAddOpen(true);
        }}
        className="fixed z-30 flex items-center justify-center rounded-full shadow-lg"
        style={{
          width: 56,
          height: 56,
          insetInlineEnd: 20,
          bottom: "calc(52px + env(safe-area-inset-bottom) + 16px)",
          background: "var(--accent)",
        }}
        aria-label="ثبت معامله"
      >
        <Plus size={24} color="#04140d" />
      </button>

      <TradeFormSheet open={addOpen} onClose={() => setAddOpen(false)} accountId={account.id} />
      <TradeFormSheet
        open={!!editingTrade}
        onClose={() => setEditingTrade(null)}
        accountId={account.id}
        existing={editingTrade}
      />
      <TradeDetailSheet
        trade={selectedTrade}
        onClose={() => setSelectedTrade(null)}
        onEdit={(t) => {
          setSelectedTrade(null);
          setEditingTrade(t);
        }}
      />
      <AccountFormSheet open={editAccountOpen} onClose={() => setEditAccountOpen(false)} existing={account} />
    </div>
  );
}
