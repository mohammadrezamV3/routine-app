import { useEffect, useState } from "react";
import BottomSheet from "@/components/BottomSheet";
import { db, baseRow, touch, type TradeAccountRow } from "../db";
import { ACCOUNT_CURRENCIES, ACCOUNT_TYPE_LABELS, type TradeAccountType, type TradeGoalType } from "../lib/types";
import { tapHaptic } from "@/lib/haptics";

interface Props {
  open: boolean;
  onClose: () => void;
  existing?: TradeAccountRow | null;
}

const ACCOUNT_COLORS = ["#00A86B", "#3E7BFA", "#EC4899", "#F5B841", "#A855F7", "#EF4444"];

const segBtn = (active: boolean) => ({
  background: active ? "var(--accent-dim)" : "var(--surface-2)",
  color: active ? "var(--accent)" : "var(--muted)",
});

export default function AccountFormSheet({ open, onClose, existing }: Props) {
  const [name, setName] = useState(existing?.name ?? "");
  const [broker, setBroker] = useState(existing?.broker ?? "");
  const [type, setType] = useState<TradeAccountType>(existing?.type ?? "REAL");
  const [currency, setCurrency] = useState(existing?.currency ?? "USD");
  const [initialBalance, setInitialBalance] = useState(existing ? String(existing.initialBalance) : "");
  const [color, setColor] = useState(existing?.color ?? ACCOUNT_COLORS[0]);
  const [goalType, setGoalType] = useState<TradeGoalType>(existing?.goalType ?? "AMOUNT");
  const [goalValue, setGoalValue] = useState(existing ? String(existing.goalValue) : "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(existing?.name ?? "");
    setBroker(existing?.broker ?? "");
    setType(existing?.type ?? "REAL");
    setCurrency(existing?.currency ?? "USD");
    setInitialBalance(existing ? String(existing.initialBalance) : "");
    setColor(existing?.color ?? ACCOUNT_COLORS[0]);
    setGoalType(existing?.goalType ?? "AMOUNT");
    setGoalValue(existing ? String(existing.goalValue) : "");
  }, [open, existing]);

  async function handleSubmit() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const row: TradeAccountRow = {
        ...(existing ? touch(existing) : (baseRow() as any)),
        name: name.trim(),
        broker: broker.trim() || null,
        type,
        currency,
        initialBalance: initialBalance.trim() === "" ? 0 : Number(initialBalance),
        leverage: existing?.leverage ?? null,
        color,
        note: existing?.note ?? null,
        goalType,
        goalValue: goalValue.trim() === "" ? 0 : Number(goalValue),
        archived: existing?.archived ?? false,
        archivedAt: existing?.archivedAt ?? null,
        order: existing?.order ?? 0,
        tagIds: existing?.tagIds ?? [],
      };
      await db.accounts.put(row);
      await tapHaptic();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={existing ? "ویرایش حساب" : "حساب جدید"}>
      <div className="flex flex-col gap-3 pt-1">
        <label className="flex flex-col gap-1">
          <span className="font-vazir text-[12px]" style={{ color: "var(--muted)" }}>
            نام حساب
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثلا حساب اصلی پراپ"
            className="rounded-lg border px-3 font-vazir text-[14px]"
            style={{ height: 44, borderColor: "var(--surface-line)", background: "var(--input-bg)", color: "var(--text)" }}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-vazir text-[12px]" style={{ color: "var(--muted)" }}>
            بروکر (اختیاری)
          </span>
          <input
            value={broker}
            onChange={(e) => setBroker(e.target.value)}
            className="rounded-lg border px-3 font-vazir text-[14px]"
            style={{ height: 44, borderColor: "var(--surface-line)", background: "var(--input-bg)", color: "var(--text)" }}
          />
        </label>

        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(ACCOUNT_TYPE_LABELS) as TradeAccountType[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className="rounded-full px-3 py-1.5 font-vazir text-[12.5px]"
              style={segBtn(type === t)}
            >
              {ACCOUNT_TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <label className="flex flex-1 flex-col gap-1">
            <span className="font-vazir text-[12px]" style={{ color: "var(--muted)" }}>
              ارز حساب
            </span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="rounded-lg border px-3 font-vazir text-[14px]"
              style={{ height: 44, borderColor: "var(--surface-line)", background: "var(--input-bg)", color: "var(--text)" }}
            >
              {ACCOUNT_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1">
            <span className="font-vazir text-[12px]" style={{ color: "var(--muted)" }}>
              بالانس اولیه
            </span>
            <input
              inputMode="decimal"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              className="rounded-lg border px-3 font-vazir text-[14px]"
              style={{ height: 44, borderColor: "var(--surface-line)", background: "var(--input-bg)", color: "var(--text)" }}
            />
          </label>
        </div>

        <div className="flex gap-2">
          <label className="flex flex-1 flex-col gap-1">
            <span className="font-vazir text-[12px]" style={{ color: "var(--muted)" }}>
              نوع هدف
            </span>
            <div className="flex gap-1.5">
              {(["AMOUNT", "PERCENT"] as TradeGoalType[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setGoalType(g)}
                  className="flex-1 rounded-lg py-2.5 font-vazir text-[13px]"
                  style={segBtn(goalType === g)}
                >
                  {g === "AMOUNT" ? "مبلغ" : "درصد"}
                </button>
              ))}
            </div>
          </label>
          <label className="flex flex-1 flex-col gap-1">
            <span className="font-vazir text-[12px]" style={{ color: "var(--muted)" }}>
              مقدار هدف
            </span>
            <input
              inputMode="decimal"
              value={goalValue}
              onChange={(e) => setGoalValue(e.target.value)}
              className="rounded-lg border px-3 font-vazir text-[14px]"
              style={{ height: 44, borderColor: "var(--surface-line)", background: "var(--input-bg)", color: "var(--text)" }}
            />
          </label>
        </div>

        <div className="flex flex-col gap-1">
          <span className="font-vazir text-[12px]" style={{ color: "var(--muted)" }}>
            رنگ
          </span>
          <div className="flex gap-2">
            {ACCOUNT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="rounded-full"
                style={{ width: 32, height: 32, background: c, outline: color === c ? "2px solid var(--text)" : "none", outlineOffset: 2 }}
                aria-label={c}
              />
            ))}
          </div>
        </div>

        <button
          disabled={saving || !name.trim()}
          onClick={handleSubmit}
          className="mt-1 rounded-lg py-3.5 font-vazir text-[14.5px] font-semibold"
          style={{ background: "var(--accent)", color: "#04140d", minHeight: 48, opacity: saving ? 0.6 : 1 }}
        >
          {existing ? "ذخیره‌ی تغییرات" : "ساخت حساب"}
        </button>
      </div>
    </BottomSheet>
  );
}
