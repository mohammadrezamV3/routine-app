import { useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { db } from "../db";
import { useLiveQuery } from "../lib/useLiveQuery";
import { dailyPnl } from "../lib/tradeAnalytics";
import { isoLocal, toJalali } from "../lib/jalali";
import MonthHeatmap from "../components/MonthHeatmap";
import TradeListRow from "../components/TradeListRow";
import TradeDetailSheet from "../components/TradeDetailSheet";
import TradeFormSheet from "../components/TradeFormSheet";
import type { TradeEntryRow } from "../db";

type CalSystem = "jalali" | "gregorian";

export default function Calendar() {
  const [system, setSystem] = useState<CalSystem>("jalali");
  const today = new Date();
  const [gy, setGy] = useState(today.getFullYear());
  const [gm, setGm] = useState(today.getMonth() + 1);
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<TradeEntryRow | null>(null);
  const [editingTrade, setEditingTrade] = useState<TradeEntryRow | null>(null);

  const trades = useLiveQuery(() => db.trades.toArray().then((rows) => rows.filter((t) => !t.deletedAt)), [], []) ?? [];

  const [jy, jm] = useMemo(() => {
    const j = toJalali(gy, gm, 15);
    return [j[0], j[1]];
  }, [gy, gm]);

  const pnlByIso = useMemo(() => dailyPnl(trades, (d) => isoLocal(d)), [trades]);

  function shiftMonth(delta: number) {
    let newM = gm + delta;
    let newY = gy;
    if (newM > 12) {
      newM = 1;
      newY++;
    } else if (newM < 1) {
      newM = 12;
      newY--;
    }
    setGm(newM);
    setGy(newY);
    setSelectedIso(null);
  }

  const dayTrades = useMemo(
    () => (selectedIso ? trades.filter((t) => isoLocal(new Date(t.openedAt)) === selectedIso) : []),
    [trades, selectedIso],
  );

  return (
    <div>
      <AppHeader title="تقویم ترید" showBack />
      <div className="flex flex-col gap-3 px-4 py-4">
        <div className="flex items-center justify-between">
          <button onClick={() => shiftMonth(-1)} className="rounded-lg px-3 py-2 font-vazir text-[13px]" style={{ background: "var(--surface-2)", color: "var(--text)" }}>
            ماه قبل
          </button>
          <div className="flex gap-1.5">
            {(["jalali", "gregorian"] as CalSystem[]).map((s) => (
              <button
                key={s}
                onClick={() => setSystem(s)}
                className="rounded-full px-3 py-1.5 font-vazir text-[12px]"
                style={{ background: system === s ? "var(--accent-dim)" : "var(--surface-2)", color: system === s ? "var(--accent)" : "var(--muted)" }}
              >
                {s === "jalali" ? "شمسی" : "میلادی"}
              </button>
            ))}
          </div>
          <button onClick={() => shiftMonth(1)} className="rounded-lg px-3 py-2 font-vazir text-[13px]" style={{ background: "var(--surface-2)", color: "var(--text)" }}>
            ماه بعد
          </button>
        </div>

        <div className="rounded-card border px-3 py-3" style={{ borderColor: "var(--surface-line)", background: "var(--surface-1)" }}>
          <MonthHeatmap
            jalaliYear={jy}
            jalaliMonth={jm}
            gregorianYear={gy}
            gregorianMonth={gm}
            system={system}
            pnlByIso={pnlByIso}
            selectedIso={selectedIso}
            onSelectIso={(iso) => setSelectedIso((cur) => (cur === iso ? null : iso))}
          />
        </div>

        {selectedIso && (
          <div className="rounded-card border" style={{ borderColor: "var(--surface-line)", background: "var(--surface-1)" }}>
            <div className="flex items-center justify-between border-b px-4 py-2.5" style={{ borderColor: "var(--surface-line)" }}>
              <span className="font-vazir text-[13px] font-semibold" style={{ color: "var(--text)" }}>
                معاملات {selectedIso}
              </span>
              <span
                className="font-vazir text-[13px] font-bold tabular-nums"
                style={{ color: (pnlByIso[selectedIso] ?? 0) >= 0 ? "var(--pnl-win)" : "var(--pnl-loss)" }}
              >
                {(pnlByIso[selectedIso] ?? 0).toFixed(2)}
              </span>
            </div>
            {dayTrades.length === 0 ? (
              <div className="px-4 py-6 text-center font-vazir text-[13px]" style={{ color: "var(--muted)" }}>
                معامله‌ای این روز نبوده.
              </div>
            ) : (
              dayTrades.map((t) => <TradeListRow key={t.id} trade={t} onClick={() => setSelectedTrade(t)} />)
            )}
          </div>
        )}
      </div>

      <TradeDetailSheet
        trade={selectedTrade}
        onClose={() => setSelectedTrade(null)}
        onEdit={(t) => {
          setSelectedTrade(null);
          setEditingTrade(t);
        }}
      />
      {editingTrade && <TradeFormSheet open={!!editingTrade} onClose={() => setEditingTrade(null)} accountId={editingTrade.accountId} existing={editingTrade} />}
    </div>
  );
}
