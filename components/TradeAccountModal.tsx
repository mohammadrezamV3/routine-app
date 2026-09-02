"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import { LockBodyScroll } from "./LockBodyScroll";
import { SegmentedTabs } from "./SegmentedTabs";
import { TradeTagField } from "./TradeTagField";
import {
  ACCOUNT_TYPE_LABELS, TAG_COLORS, TradeAccount, TradeAccountType,
  TradeGoalType, TradeTag,
} from "@/lib/tradeTypes";
import { NumberInput } from "./NumberInput";

// ساخت/ویرایش حساب معاملاتی. همان یک فرم برای هر دو حالت است — تفاوتشان
// فقط در متد درخواست (POST یا PATCH) و عنوان پاپ‌آپ است.
export function TradeAccountModal({
  account,
  tags,
  onTagCreated,
  onClose,
  onSaved,
}: {
  account: TradeAccount | null;
  tags: TradeTag[];
  onTagCreated: (t: TradeTag) => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(account?.name || "");
  const [broker, setBroker] = useState(account?.broker || "");
  const [type, setType] = useState<TradeAccountType>(account?.type || "REAL");
  const [currency, setCurrency] = useState(account?.currency || "USD");
  const [initialBalance, setInitialBalance] = useState(account ? String(account.initialBalance || "") : "");
  const [leverage, setLeverage] = useState(account?.leverage ? String(account.leverage) : "");
  const [color, setColor] = useState(account?.color || TAG_COLORS[7]);
  const [note, setNote] = useState(account?.note || "");
  const [goalType, setGoalType] = useState<TradeGoalType>(account?.goalType || "AMOUNT");
  const [goalValue, setGoalValue] = useState(account?.goalValue ? String(account.goalValue) : "");
  const [tagIds, setTagIds] = useState<string[]>(account?.tags.map((t) => t.id) || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  async function save() {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    const body = {
      id: account?.id,
      name: name.trim(),
      broker: broker.trim() || null,
      type,
      currency: currency.trim().toUpperCase() || "USD",
      initialBalance: num(initialBalance),
      leverage: num(leverage),
      color,
      note: note.trim() || null,
      goalType,
      goalValue: num(goalValue),
      tagIds,
    };
    try {
      const res = await fetch("/api/trade/accounts", {
        method: account ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError(data?.error || "خطا در ذخیره حساب"); return; }
      onSaved();
    } catch {
      setError("ارتباط با سرور برقرار نشد — دوباره تلاش کن");
    } finally {
      setSaving(false);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <LockBodyScroll />
      <div className="modal-overlay open" onClick={onClose} />
      <div className="modal-panel open" role="dialog" aria-modal="true">
        <div className="modal-head">
          <div className="modal-title">{account ? "ویرایش حساب" : "حساب جدید"}</div>
          <button type="button" className="trade-icon-btn" onClick={onClose} aria-label="بستن"><X size={16} /></button>
        </div>

        <label className="exercise-form-label">نام حساب</label>
        <input className="wsearch-newform-name trade-glass-field" autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="مثلا حساب اصلی" />

        <label className="exercise-form-label">نوع حساب</label>
        <SegmentedTabs
          active={type}
          onChange={setType}
          options={(Object.keys(ACCOUNT_TYPE_LABELS) as TradeAccountType[]).map((k) => ({ value: k, label: ACCOUNT_TYPE_LABELS[k] }))}
        />

        <div className="trade-field-row">
          <div>
            <label className="exercise-form-label">بروکر</label>
            <input className="wsearch-newform-name trade-glass-field" value={broker} onChange={(e) => setBroker(e.target.value)} maxLength={60} placeholder="اختیاری" />
          </div>
          <div>
            <label className="exercise-form-label">ارز حساب</label>
            <input className="wsearch-newform-name trade-glass-field" value={currency} onChange={(e) => setCurrency(e.target.value)} maxLength={8} placeholder="USD" />
          </div>
        </div>

        <div className="trade-field-row">
          <div>
            <label className="exercise-form-label">بالانس اولیه</label>
            <NumberInput decimal className="wsearch-newform-name trade-glass-field" value={initialBalance} onChange={(v) => setInitialBalance(v)} placeholder="0" />
          </div>
          <div>
            <label className="exercise-form-label">اهرم</label>
            <NumberInput className="wsearch-newform-name trade-glass-field" value={leverage} onChange={(v) => setLeverage(v)} placeholder="اختیاری" />
          </div>
        </div>

        <label className="exercise-form-label">هدف سود</label>
        <SegmentedTabs
          active={goalType}
          onChange={setGoalType}
          options={[{ value: "AMOUNT" as const, label: "مبلغ" }, { value: "PERCENT" as const, label: "درصد بالانس" }]}
        />
        <NumberInput decimal className="wsearch-newform-name trade-glass-field" value={goalValue} onChange={(v) => setGoalValue(v)}
          placeholder={goalType === "PERCENT" ? "مثلا 5 (یعنی 5%)" : "مثلا 500"} style={{ marginTop: 8 }}
        />

        <label className="exercise-form-label">رنگ حساب</label>
        <div className="trade-color-row">
          {TAG_COLORS.map((c) => (
            <button key={c} type="button" className={`trade-color-dot${c === color ? " active" : ""}`} style={{ background: c }} onClick={() => setColor(c)} aria-label={c} />
          ))}
        </div>

        <label className="exercise-form-label">برچسب‌ها</label>
        <TradeTagField tags={tags} value={tagIds} onChange={setTagIds} onCreated={onTagCreated} />

        <label className="exercise-form-label">توضیح</label>
        <textarea className="wsearch-newform-name trade-glass-field" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} placeholder="اختیاری" />

        {error && <div className="trade-form-error">{error}</div>}

        <div className="trade-modal-actions">
          <button type="button" className="account-outline-btn" onClick={onClose}>لغو</button>
          <button type="button" className="trade-primary-btn" onClick={save} disabled={!name.trim() || saving}>
            {saving ? <><Loader2 size={15} className="trade-spin" /> در حال ذخیره…</> : account ? "ذخیره" : "ایجاد حساب"}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
