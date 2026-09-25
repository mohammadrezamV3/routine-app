import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ListChecks, CalendarDays, Clock, StickyNote, LineChart, Cable } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { db } from "../db";
import { useLiveQuery } from "../lib/useLiveQuery";
import { computeTradeStats } from "../lib/tradeAnalytics";
import AccountCard from "../components/AccountCard";
import AccountFormSheet from "../components/AccountFormSheet";
import ComingSoon from "../components/ComingSoon";
import { tradeRoutePaths } from "../paths";
import { tapHaptic } from "@/lib/haptics";

const TILES = [
  { to: tradeRoutePaths.checklists, label: "چک‌لیست‌ها", icon: ListChecks },
  { to: tradeRoutePaths.calendar, label: "تقویم", icon: CalendarDays },
  { to: tradeRoutePaths.clock, label: "ساعت فارکس", icon: Clock },
  { to: tradeRoutePaths.notes, label: "یادداشت‌ها", icon: StickyNote },
];

export default function TradeHub() {
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [showOnlineInfo, setShowOnlineInfo] = useState(false);

  const accounts =
    useLiveQuery(
      () => db.accounts.toArray().then((rows) => rows.filter((a) => !a.deletedAt && !a.archived).sort((a, b) => a.order - b.order)),
      [],
      [],
    ) ?? [];

  const trades = useLiveQuery(() => db.trades.toArray().then((rows) => rows.filter((t) => !t.deletedAt)), [], []) ?? [];

  const statsByAccount = useMemo(() => {
    const map: Record<string, ReturnType<typeof computeTradeStats>> = {};
    for (const acc of accounts) {
      const entries = trades.filter((t) => t.accountId === acc.id);
      map[acc.id] = computeTradeStats(entries, acc);
    }
    return map;
  }, [accounts, trades]);

  const overall = useMemo(() => {
    const netPnl = accounts.reduce((s, a) => s + (statsByAccount[a.id]?.netPnl ?? 0), 0);
    const total = accounts.reduce((s, a) => s + (statsByAccount[a.id]?.total ?? 0), 0);
    return { netPnl, total };
  }, [accounts, statsByAccount]);

  return (
    <div>
      <AppHeader title="ترید" />
      <div className="flex flex-col gap-4 px-4 py-4">
        <div
          className="flex items-center justify-between rounded-card border px-4 py-3.5"
          style={{ borderColor: "var(--surface-line)", background: "var(--surface-1)" }}
        >
          <div className="flex flex-col">
            <span className="font-vazir text-[11.5px]" style={{ color: "var(--muted)" }}>
              سود/زیان کل همه‌ی حساب‌ها
            </span>
            <span
              className="font-vazir text-[19px] font-bold tabular-nums"
              style={{ color: overall.netPnl >= 0 ? "var(--pnl-win)" : "var(--pnl-loss)" }}
            >
              {overall.netPnl >= 0 ? "+" : ""}
              {overall.netPnl.toFixed(2)}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="font-vazir text-[11.5px]" style={{ color: "var(--muted)" }}>
              تعداد معاملات
            </span>
            <span className="font-vazir text-[19px] font-bold tabular-nums" style={{ color: "var(--text)" }}>
              {overall.total}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-vazir text-[14px] font-semibold" style={{ color: "var(--text)" }}>
            حساب‌های معاملاتی
          </span>
          <button
            onClick={() => {
              void tapHaptic();
              setFormOpen(true);
            }}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 font-vazir text-[12.5px] font-semibold"
            style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
          >
            <Plus size={15} /> حساب جدید
          </button>
        </div>

        {accounts.length === 0 ? (
          <div
            className="flex flex-col items-center gap-2 rounded-card border px-4 py-8 text-center"
            style={{ borderColor: "var(--surface-line)", background: "var(--surface-1)" }}
          >
            <LineChart size={28} color="var(--muted)" />
            <span className="font-vazir text-[13.5px]" style={{ color: "var(--muted)" }}>
              هنوز هیچ حساب معاملاتی نساخته‌ای
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {accounts.map((acc) => (
              <AccountCard key={acc.id} account={acc} stats={statsByAccount[acc.id]} />
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          {TILES.map((tile) => (
            <button
              key={tile.to}
              onClick={() => {
                void tapHaptic();
                navigate(tile.to);
              }}
              className="flex flex-col items-start gap-2 rounded-card border px-3.5 py-3.5"
              style={{ borderColor: "var(--surface-line)", background: "var(--surface-1)", minHeight: 76 }}
            >
              <tile.icon size={20} color="var(--accent)" />
              <span className="font-vazir text-[13px] font-medium" style={{ color: "var(--text)" }}>
                {tile.label}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowOnlineInfo((v) => !v)}
          className="flex items-center gap-2 rounded-card border px-3.5 py-3"
          style={{ borderColor: "var(--surface-line)", background: "var(--surface-1)" }}
        >
          <Cable size={18} color="var(--muted)" />
          <span className="flex-1 text-start font-vazir text-[13px]" style={{ color: "var(--text)" }}>
            تقویم اقتصادی زنده و اتصال متاتریدر
          </span>
        </button>
        {showOnlineInfo && <ComingSoon title="تقویم اقتصادی و متاتریدر" note="این دو فقط با اینترنت کار می‌کنند؛ در نسخه‌ی بعدی اپ آفلاین اضافه می‌شوند." />}
      </div>

      <button
        onClick={() => {
          void tapHaptic();
          setFormOpen(true);
        }}
        className="fixed z-30 flex items-center justify-center rounded-full shadow-lg"
        style={{
          width: 56,
          height: 56,
          insetInlineEnd: 20,
          bottom: "calc(52px + env(safe-area-inset-bottom) + 16px)",
          background: "var(--accent)",
        }}
        aria-label="حساب جدید"
      >
        <Plus size={24} color="#04140d" />
      </button>

      <AccountFormSheet open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
