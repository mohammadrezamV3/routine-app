import { useEffect, useMemo, useState } from "react";
import BottomSheet from "@/components/BottomSheet";
import { db, baseRow, touch, type TradeEntryRow } from "../db";
import type { TradeDirection, TradeResult, TradeStatus, VolumeUnit } from "../lib/types";
import { signedPnl } from "../lib/types";
import { TRADE_PAIRS, TIMEFRAMES } from "../lib/tradePairs";
import { useLiveQuery } from "../lib/useLiveQuery";
import { sessionsAt } from "../lib/forexSessions";
import { tapHaptic } from "@/lib/haptics";

interface Props {
  open: boolean;
  onClose: () => void;
  accountId: string;
  existing?: TradeEntryRow | null;
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function nowLocalInput(): string {
  return toLocalInput(new Date().toISOString());
}

function localInputToUtcIso(local: string): string {
  // input[type=datetime-local] یک رشته‌ی بدون تایم‌زون می‌دهد؛ new Date آن
  // را محلی تفسیر می‌کند و toISOString خودش UTC می‌سازد.
  return new Date(local).toISOString();
}

const segBtn = (active: boolean) => ({
  background: active ? "var(--accent-dim)" : "var(--surface-2)",
  color: active ? "var(--accent)" : "var(--muted)",
});

/** ورودی ساده‌ی متن/عدد با استایل مشترک فرم ترید */
function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-1 flex-col gap-1">
      <span className="font-vazir text-[12px]" style={{ color: "var(--muted)" }}>
        {label}
      </span>
      <input
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border px-3 font-vazir text-[14px]"
        style={{ height: 44, borderColor: "var(--surface-line)", background: "var(--input-bg)", color: "var(--text)" }}
      />
    </label>
  );
}

export default function TradeFormSheet({ open, onClose, accountId, existing }: Props) {
  const checklists =
    useLiveQuery(() => db.checklists.toArray().then((rows) => rows.filter((c) => !c.archived)), [], []) ?? [];
  const checklistItems = useLiveQuery(() => db.checklistItems.toArray(), [], []) ?? [];
  const tags = useLiveQuery(() => db.tags.toArray(), [], []) ?? [];

  const [symbol, setSymbol] = useState(existing?.symbol ?? "");
  const [direction, setDirection] = useState<TradeDirection>(existing?.direction ?? "BUY");
  const [timeframe, setTimeframe] = useState(existing?.timeframe ?? "1h");
  const [openedAt, setOpenedAt] = useState(existing ? toLocalInput(existing.openedAt) : nowLocalInput());
  const [closedAt, setClosedAt] = useState(existing?.closedAt ? toLocalInput(existing.closedAt) : "");
  const [volume, setVolume] = useState(existing ? String(existing.volume) : "");
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>(existing?.volumeUnit ?? "LOT");
  const [status, setStatus] = useState<TradeStatus>(existing?.status ?? "CLOSED");
  const [result, setResult] = useState<TradeResult>(existing?.result ?? "PROFIT");
  const [pnlAmount, setPnlAmount] = useState(existing ? String(Math.abs(existing.pnl)) : "");
  const [entryPrice, setEntryPrice] = useState(existing?.entryPrice != null ? String(existing.entryPrice) : "");
  const [exitPrice, setExitPrice] = useState(existing?.exitPrice != null ? String(existing.exitPrice) : "");
  const [stopLoss, setStopLoss] = useState(existing?.stopLoss != null ? String(existing.stopLoss) : "");
  const [takeProfit, setTakeProfit] = useState(existing?.takeProfit != null ? String(existing.takeProfit) : "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [tagIds, setTagIds] = useState<string[]>(existing?.tagIds ?? []);
  const [checklistId, setChecklistId] = useState<string | null>(existing?.checklistId ?? null);
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSymbol(existing?.symbol ?? "");
    setDirection(existing?.direction ?? "BUY");
    setTimeframe(existing?.timeframe ?? "1h");
    setOpenedAt(existing ? toLocalInput(existing.openedAt) : nowLocalInput());
    setClosedAt(existing?.closedAt ? toLocalInput(existing.closedAt) : "");
    setVolume(existing ? String(existing.volume) : "");
    setVolumeUnit(existing?.volumeUnit ?? "LOT");
    setStatus(existing?.status ?? "CLOSED");
    setResult(existing?.result ?? "PROFIT");
    setPnlAmount(existing ? String(Math.abs(existing.pnl)) : "");
    setEntryPrice(existing?.entryPrice != null ? String(existing.entryPrice) : "");
    setExitPrice(existing?.exitPrice != null ? String(existing.exitPrice) : "");
    setStopLoss(existing?.stopLoss != null ? String(existing.stopLoss) : "");
    setTakeProfit(existing?.takeProfit != null ? String(existing.takeProfit) : "");
    setNote(existing?.note ?? "");
    setTagIds(existing?.tagIds ?? []);
    setChecklistId(existing?.checklistId ?? null);
    setChecklistState({});
  }, [open, existing]);

  const activeChecklistItems = useMemo(
    () => checklistItems.filter((i) => i.checklistId === checklistId).sort((a, b) => a.order - b.order),
    [checklistItems, checklistId],
  );

  async function handleSubmit() {
    if (!symbol.trim() || !volume.trim()) return;
    setSaving(true);
    try {
      const openedIso = localInputToUtcIso(openedAt);
      const closedIso = closedAt ? localInputToUtcIso(closedAt) : null;
      const pnl = signedPnl(result, pnlAmount.trim() === "" ? null : Number(pnlAmount));
      const riskAmountNum = null;
      const rMultiple = riskAmountNum ? Math.round((pnl / riskAmountNum) * 100) / 100 : null;
      const checklist = checklists.find((c) => c.id === checklistId) || null;
      const snapshot = checklist
        ? activeChecklistItems.map((i) => ({ text: i.text, checked: !!checklistState[i.id] }))
        : null;

      const row: TradeEntryRow = {
        ...(existing ? touch(existing) : (baseRow() as any)),
        accountId,
        symbol: symbol.trim().toUpperCase(),
        direction,
        timeframe: timeframe || null,
        openedAt: openedIso,
        closedAt: closedIso,
        volume: Number(volume),
        volumeUnit,
        result,
        pnl,
        riskFree: existing?.riskFree ?? false,
        status,
        entryPrice: entryPrice.trim() === "" ? null : Number(entryPrice),
        exitPrice: exitPrice.trim() === "" ? null : Number(exitPrice),
        stopLoss: stopLoss.trim() === "" ? null : Number(stopLoss),
        takeProfit: takeProfit.trim() === "" ? null : Number(takeProfit),
        commission: existing?.commission ?? null,
        swap: existing?.swap ?? null,
        riskAmount: existing?.riskAmount ?? null,
        rMultiple,
        sessions: sessionsAt(new Date(openedIso)),
        setup: existing?.setup ?? null,
        entryReasonNote: existing?.entryReasonNote ?? null,
        exitReasonNote: existing?.exitReasonNote ?? null,
        note: note.trim() || null,
        emotionBefore: existing?.emotionBefore ?? null,
        emotionAfter: existing?.emotionAfter ?? null,
        confidence: existing?.confidence ?? null,
        followedPlan: existing?.followedPlan ?? null,
        checklistId: checklist?.id ?? null,
        checklistName: checklist?.name ?? null,
        checklistSnapshot: snapshot,
        tagIds,
        images: existing?.images ?? [],
      };

      await db.trades.put(row);
      await tapHaptic();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={existing ? "ویرایش معامله" : "ثبت معامله"}>
      <div className="flex flex-col gap-3 pt-1">
        <div className="flex gap-2">
          <Field label="نماد" value={symbol} onChange={setSymbol} placeholder="EURUSD" />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {TRADE_PAIRS.slice(0, 8).map((p) => (
            <button
              key={p.code}
              onClick={() => setSymbol(p.code)}
              className="shrink-0 rounded-full px-3 py-1.5 font-vazir text-[12px]"
              style={segBtn(symbol.toUpperCase() === p.code)}
            >
              {p.code}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {(["BUY", "SELL"] as TradeDirection[]).map((d) => (
            <button
              key={d}
              onClick={() => setDirection(d)}
              className="flex-1 rounded-lg py-2.5 font-vazir text-[13.5px] font-semibold"
              style={segBtn(direction === d)}
            >
              {d === "BUY" ? "خرید" : "فروش"}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className="shrink-0 rounded-full px-3 py-1.5 font-vazir text-[12px]"
              style={segBtn(timeframe === tf)}
            >
              {tf}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Field label="ساعت ورود" value={openedAt} onChange={setOpenedAt} type="datetime-local" />
          <Field label="ساعت خروج" value={closedAt} onChange={setClosedAt} type="datetime-local" />
        </div>

        <div className="flex gap-2">
          <Field label="حجم" value={volume} onChange={setVolume} type="number" placeholder="0.01" />
          <label className="flex flex-1 flex-col gap-1">
            <span className="font-vazir text-[12px]" style={{ color: "var(--muted)" }}>
              واحد حجم
            </span>
            <div className="flex gap-1.5">
              {(["LOT", "USD"] as VolumeUnit[]).map((u) => (
                <button
                  key={u}
                  onClick={() => setVolumeUnit(u)}
                  className="flex-1 rounded-lg py-2.5 font-vazir text-[13px]"
                  style={segBtn(volumeUnit === u)}
                >
                  {u === "LOT" ? "لات" : "دلار"}
                </button>
              ))}
            </div>
          </label>
        </div>

        <div className="flex gap-2">
          {(["OPEN", "CLOSED", "CANCELED"] as TradeStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className="flex-1 rounded-lg py-2 font-vazir text-[12.5px]"
              style={segBtn(status === s)}
            >
              {s === "OPEN" ? "باز" : s === "CLOSED" ? "بسته" : "لغو"}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {(["PROFIT", "LOSS", "BREAKEVEN"] as TradeResult[]).map((r) => (
            <button
              key={r}
              onClick={() => setResult(r)}
              className="flex-1 rounded-lg py-2 font-vazir text-[12.5px]"
              style={segBtn(result === r)}
            >
              {r === "PROFIT" ? "سود" : r === "LOSS" ? "ضرر" : "سربه‌سر"}
            </button>
          ))}
        </div>

        <Field label="مقدار سود/زیان (همیشه مثبت)" value={pnlAmount} onChange={setPnlAmount} type="number" placeholder="0.00" />

        <div className="flex gap-2">
          <Field label="قیمت ورود" value={entryPrice} onChange={setEntryPrice} type="number" />
          <Field label="قیمت خروج" value={exitPrice} onChange={setExitPrice} type="number" />
        </div>
        <div className="flex gap-2">
          <Field label="حد ضرر" value={stopLoss} onChange={setStopLoss} type="number" />
          <Field label="حد سود" value={takeProfit} onChange={setTakeProfit} type="number" />
        </div>

        {tags.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="font-vazir text-[12px]" style={{ color: "var(--muted)" }}>
              برچسب‌ها
            </span>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => {
                const active = tagIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => setTagIds((ids) => (active ? ids.filter((i) => i !== t.id) : [...ids, t.id]))}
                    className="rounded-full px-2.5 py-1 font-vazir text-[12px]"
                    style={{ background: active ? t.color : "var(--surface-2)", color: active ? "#0e1011" : "var(--muted)" }}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {checklists.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="font-vazir text-[12px]" style={{ color: "var(--muted)" }}>
              چک‌لیست (اختیاری — ناقص‌بودنش مانع ثبت نمی‌شود)
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setChecklistId(null)}
                className="rounded-full px-2.5 py-1 font-vazir text-[12px]"
                style={segBtn(checklistId === null)}
              >
                بدون چک‌لیست
              </button>
              {checklists.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setChecklistId(c.id)}
                  className="rounded-full px-2.5 py-1 font-vazir text-[12px]"
                  style={segBtn(checklistId === c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
            {checklistId && (
              <div className="flex flex-col gap-1 rounded-lg border p-2" style={{ borderColor: "var(--surface-line)" }}>
                {activeChecklistItems.map((i) => (
                  <label key={i.id} className="flex items-center gap-2 py-1" style={{ minHeight: 32 }}>
                    <input
                      type="checkbox"
                      checked={!!checklistState[i.id]}
                      onChange={(e) => setChecklistState((s) => ({ ...s, [i.id]: e.target.checked }))}
                      style={{ width: 18, height: 18 }}
                    />
                    <span className="font-vazir text-[13px]" style={{ color: "var(--text)" }}>
                      {i.text}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <label className="flex flex-col gap-1">
          <span className="font-vazir text-[12px]" style={{ color: "var(--muted)" }}>
            یادداشت
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="rounded-lg border px-3 py-2 font-vazir text-[14px]"
            style={{ borderColor: "var(--surface-line)", background: "var(--input-bg)", color: "var(--text)" }}
          />
        </label>

        <button
          disabled={saving || !symbol.trim() || !volume.trim()}
          onClick={handleSubmit}
          className="mt-1 rounded-lg py-3.5 font-vazir text-[14.5px] font-semibold"
          style={{ background: "var(--accent)", color: "#04140d", minHeight: 48, opacity: saving ? 0.6 : 1 }}
        >
          {existing ? "ذخیره‌ی تغییرات" : "ثبت معامله"}
        </button>
      </div>
    </BottomSheet>
  );
}
