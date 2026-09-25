import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import type { TradeAccountRow } from "../db";
import type { TradeStats } from "../lib/tradeAnalytics";
import { ACCOUNT_TYPE_LABELS, currencySymbol } from "../lib/types";
import { tradeRoutePaths } from "../paths";

interface Props {
  account: TradeAccountRow;
  stats: TradeStats;
}

export default function AccountCard({ account, stats }: Props) {
  const navigate = useNavigate();
  const pnlPositive = stats.netPnl >= 0;

  return (
    <button
      onClick={() => navigate(tradeRoutePaths.account(account.id))}
      className="flex w-full flex-col gap-2.5 rounded-card border px-4 py-3.5 text-start"
      style={{ borderColor: "var(--surface-line)", background: "var(--surface-1)" }}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="rounded-full"
          style={{ width: 10, height: 10, background: account.color }}
        />
        <span className="flex-1 truncate font-vazir text-[15px] font-semibold" style={{ color: "var(--text)" }}>
          {account.name}
        </span>
        <span
          className="rounded-full px-2 py-0.5 font-vazir text-[11px]"
          style={{ background: "var(--surface-2)", color: "var(--muted)" }}
        >
          {ACCOUNT_TYPE_LABELS[account.type]}
        </span>
        <ChevronLeft size={18} color="var(--muted)" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-vazir text-[11px]" style={{ color: "var(--muted)" }}>
            بالانس
          </span>
          <span className="font-vazir text-[16px] font-bold tabular-nums" style={{ color: "var(--text)" }}>
            {currencySymbol(account.currency)} {stats.balance.toFixed(2)}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-vazir text-[11px]" style={{ color: "var(--muted)" }}>
            سود/زیان کل
          </span>
          <span
            className="font-vazir text-[16px] font-bold tabular-nums"
            style={{ color: pnlPositive ? "var(--pnl-win)" : "var(--pnl-loss)" }}
          >
            {pnlPositive ? "+" : ""}
            {stats.netPnl.toFixed(2)}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-vazir text-[11px]" style={{ color: "var(--muted)" }}>
            نرخ برد
          </span>
          <span className="font-vazir text-[16px] font-bold tabular-nums" style={{ color: "var(--text)" }}>
            {stats.winRate === null ? "—" : `${stats.winRate}٪`}
          </span>
        </div>
      </div>
    </button>
  );
}
