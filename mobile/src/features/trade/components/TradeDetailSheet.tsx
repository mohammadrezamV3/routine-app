import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import BottomSheet from "@/components/BottomSheet";
import { db, touch, type TradeEntryRow } from "../db";
import { DIRECTION_LABELS, RESULT_LABELS, STATUS_LABELS } from "../lib/types";
import { tapHaptic } from "@/lib/haptics";

interface Props {
  trade: TradeEntryRow | null;
  onClose: () => void;
  onEdit: (trade: TradeEntryRow) => void;
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="font-vazir text-[12.5px]" style={{ color: "var(--muted)" }}>
        {label}
      </span>
      <span className="font-vazir text-[13.5px] font-medium tabular-nums" style={{ color: "var(--text)" }}>
        {value}
      </span>
    </div>
  );
}

export default function TradeDetailSheet({ trade, onClose, onEdit }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!trade) return <BottomSheet open={false} onClose={onClose}><div /></BottomSheet>;

  async function handleDelete() {
    if (!trade) return;
    await db.trades.put(touch({ ...trade, deletedAt: new Date().toISOString() }));
    await tapHaptic();
    setConfirmDelete(false);
    onClose();
  }

  const win = trade.pnl > 0;

  return (
    <BottomSheet open={!!trade} onClose={onClose} title={trade.symbol}>
      <div className="flex flex-col gap-1">
        <div className="mb-2 flex items-center justify-between">
          <span
            className="font-vazir text-[22px] font-bold tabular-nums"
            style={{ color: win ? "var(--pnl-win)" : trade.pnl < 0 ? "var(--pnl-loss)" : "var(--muted)" }}
          >
            {win ? "+" : ""}
            {trade.pnl.toFixed(2)}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(trade)}
              className="flex items-center justify-center rounded-full"
              style={{ width: 40, height: 40, background: "var(--surface-2)" }}
              aria-label="ویرایش"
            >
              <Pencil size={17} color="var(--text)" />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center justify-center rounded-full"
              style={{ width: 40, height: 40, background: "var(--surface-2)" }}
              aria-label="حذف"
            >
              <Trash2 size={17} color="var(--pnl-loss)" />
            </button>
          </div>
        </div>

        <Row label="جهت" value={DIRECTION_LABELS[trade.direction]} />
        <Row label="وضعیت" value={STATUS_LABELS[trade.status]} />
        <Row label="نتیجه" value={RESULT_LABELS[trade.result]} />
        <Row label="ورود" value={fmtDateTime(trade.openedAt)} />
        {trade.closedAt && <Row label="خروج" value={fmtDateTime(trade.closedAt)} />}
        <Row label="حجم" value={`${trade.volume} ${trade.volumeUnit === "LOT" ? "لات" : "دلار"}`} />
        {trade.entryPrice != null && <Row label="قیمت ورود" value={String(trade.entryPrice)} />}
        {trade.exitPrice != null && <Row label="قیمت خروج" value={String(trade.exitPrice)} />}
        {trade.stopLoss != null && <Row label="حد ضرر" value={String(trade.stopLoss)} />}
        {trade.takeProfit != null && <Row label="حد سود" value={String(trade.takeProfit)} />}
        {trade.rMultiple != null && <Row label="R" value={`${trade.rMultiple > 0 ? "+" : ""}${trade.rMultiple}`} />}
        {trade.timeframe && <Row label="تایم‌فریم" value={trade.timeframe} />}

        {trade.checklistSnapshot && trade.checklistSnapshot.length > 0 && (
          <div className="mt-2 flex flex-col gap-1 rounded-lg border p-2" style={{ borderColor: "var(--surface-line)" }}>
            <span className="font-vazir text-[12px]" style={{ color: "var(--muted)" }}>
              چک‌لیست {trade.checklistName} (لحظه‌ی ثبت)
            </span>
            {trade.checklistSnapshot.map((it, i) => (
              <div key={i} className="flex items-center gap-2 py-0.5">
                <span
                  className="flex items-center justify-center rounded"
                  style={{
                    width: 16,
                    height: 16,
                    background: it.checked ? "var(--accent)" : "transparent",
                    border: it.checked ? "none" : "1.5px solid var(--muted)",
                  }}
                />
                <span
                  className="font-vazir text-[13px]"
                  style={{ color: it.checked ? "var(--text)" : "var(--muted)", textDecoration: it.checked ? "none" : "line-through" }}
                >
                  {it.text}
                </span>
              </div>
            ))}
          </div>
        )}

        {trade.note && (
          <div className="mt-2 rounded-lg border p-2.5" style={{ borderColor: "var(--surface-line)" }}>
            <p className="font-vazir text-[13px] leading-6" style={{ color: "var(--text)" }}>
              {trade.note}
            </p>
          </div>
        )}

        {confirmDelete && (
          <div className="mt-3 flex flex-col gap-2 rounded-lg border p-3" style={{ borderColor: "var(--pnl-loss)" }}>
            <span className="font-vazir text-[13px]" style={{ color: "var(--text)" }}>
              این معامله حذف شود؟
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-lg py-2.5 font-vazir text-[13px]"
                style={{ background: "var(--surface-2)", color: "var(--text)" }}
              >
                انصراف
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 rounded-lg py-2.5 font-vazir text-[13px] font-semibold"
                style={{ background: "var(--pnl-loss)", color: "#fff" }}
              >
                حذف شود
              </button>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
