import type { TradeEntryRow } from "../db";

interface Props {
  trade: TradeEntryRow;
  onClick: () => void;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function TradeListRow({ trade, onClick }: Props) {
  const win = trade.pnl > 0;
  const loss = trade.pnl < 0;
  const closed = trade.status === "CLOSED";

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b px-4 py-2.5 text-start"
      style={{ borderColor: "var(--surface-line)", minHeight: 64 }}
    >
      <div
        className="flex items-center justify-center rounded-full font-vazir text-[10.5px] font-bold"
        style={{
          width: 34,
          height: 34,
          background: trade.direction === "BUY" ? "var(--accent-dim)" : "rgba(224,82,82,0.14)",
          color: trade.direction === "BUY" ? "var(--pnl-win)" : "var(--pnl-loss)",
        }}
      >
        {trade.direction === "BUY" ? "خرید" : "فروش"}
      </div>
      <div className="flex flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className="font-vazir text-[14px] font-semibold" style={{ color: "var(--text)" }}>
            {trade.symbol}
          </span>
          {!closed && (
            <span
              className="rounded-full px-1.5 py-[1px] font-vazir text-[10px]"
              style={{ background: "var(--secondary-dim)", color: "var(--secondary)" }}
            >
              باز
            </span>
          )}
        </div>
        <span className="font-vazir text-[11.5px]" style={{ color: "var(--muted)" }}>
          {fmtTime(trade.openedAt)} · {trade.volume} {trade.volumeUnit === "LOT" ? "لات" : "دلار"}
          {trade.rMultiple != null ? ` · ${trade.rMultiple > 0 ? "+" : ""}${trade.rMultiple}R` : ""}
        </span>
      </div>
      <span
        className="font-vazir text-[15px] font-bold tabular-nums"
        style={{ color: win ? "var(--pnl-win)" : loss ? "var(--pnl-loss)" : "var(--muted)" }}
      >
        {win ? "+" : ""}
        {trade.pnl.toFixed(2)}
      </span>
    </button>
  );
}
