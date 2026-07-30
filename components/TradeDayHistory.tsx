"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { faNum } from "@/lib/jalali";
import { TradeEntry, TradeFormState, tradeEntryToFormState } from "@/lib/tradeTypes";
import { TradeEntryFields } from "./TradeEntryFields";

// تاریخچه‌ی معاملاتِ یک روزِ انتخاب‌شده، درست زیر تقویم — قبلاً یک مودالِ
// جدا بود که فقط با کلیک روی روزهای دارای معامله باز می‌شد؛ حالا هر روزی
// قابل‌انتخابه (حتی خالی) و نتیجه همیشه همین‌جا، زیر تقویم، دیده می‌شه.
export function TradeDayHistory({
  title,
  entries,
  onDelete,
  onUpdate,
}: {
  title: string;
  entries: TradeEntry[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, value: TradeFormState) => Promise<string | null>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<TradeFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  function startEdit(e: TradeEntry) {
    setEditingId(e.id);
    setEditValue(tradeEntryToFormState(e));
    setSaveError(null);
  }
  function cancelEdit() {
    setEditingId(null);
    setEditValue(null);
    setSaveError(null);
  }
  async function handleSave(id: string) {
    if (!editValue) return;
    setSaving(true);
    setSaveError(null);
    const err = await onUpdate(id, editValue);
    setSaving(false);
    if (err) { setSaveError(err); return; }
    setEditingId(null);
    setEditValue(null);
  }

  return (
    <div className="tm-extra">
      <div className="domain-sub">تاریخچه معاملات — {title}</div>

      {entries.length ? (
        entries.map((e) => {
          if (editingId === e.id && editValue) {
            return (
              <div key={e.id} className="trade-day-card">
                <TradeEntryFields value={editValue} onChange={(patch) => setEditValue((v) => (v ? { ...v, ...patch } : v))} />
                {saveError && <div className="field-error-msg" style={{ display: "block", marginTop: 6 }}>{saveError}</div>}
                <div className="trade-day-actions">
                  <button type="button" className="small trade-day-save" disabled={saving} onClick={() => handleSave(e.id)}>
                    {saving ? "در حال ذخیره…" : "ذخیره تغییرات"}
                  </button>
                  <button type="button" className="small trade-day-cancel" onClick={cancelEdit} disabled={saving}>انصراف</button>
                </div>
              </div>
            );
          }

          return (
            <div key={e.id} className="trade-day-card">
              <div className="trade-day-card-head">
                <span className="name">
                  {e.pair}{" "}
                  <span className="mono" style={{ color: "var(--muted2)" }}>
                    ({e.direction === "long" ? "Long" : "Short"})
                  </span>
                </span>
                {e.pnl !== null && (
                  <span className="trade-day-pnl-wrap">
                    <span className="trade-day-pnl-label">سود/زیان</span>
                    <span className="mono trade-day-pnl" style={{ color: e.pnl >= 0 ? "var(--accent)" : "#E05252" }}>
                      {faNum(e.pnl)}
                    </span>
                  </span>
                )}
              </div>

              {e.screenshotUrl && (
                <button type="button" className="trade-day-photo-btn" onClick={() => setLightboxUrl(e.screenshotUrl)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={e.screenshotUrl} alt="" className="trade-day-photo-thumb" />
                  <span className="trade-day-photo-btn-label">
                    <svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" /><path d="M20 20l-4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
                    مشاهده عکس معامله
                  </span>
                </button>
              )}

              <div className="trade-day-fields">
                <div className="trade-day-field"><span>قیمت ورود</span><span className="mono">{faNum(e.entryPrice)}</span></div>
                {e.exitPrice !== null && (
                  <div className="trade-day-field"><span>قیمت خروج</span><span className="mono">{faNum(e.exitPrice)}</span></div>
                )}
                <div className="trade-day-field"><span>لات</span><span className="mono">{faNum(e.lotSize)}</span></div>
                {e.volume !== null && (
                  <div className="trade-day-field"><span>حجم معامله</span><span className="mono">{faNum(e.volume)}</span></div>
                )}
                {e.stopLoss !== null && (
                  <div className="trade-day-field"><span>حد ضرر</span><span className="mono">{faNum(e.stopLoss)}</span></div>
                )}
                {e.takeProfit !== null && (
                  <div className="trade-day-field"><span>حد سود</span><span className="mono">{faNum(e.takeProfit)}</span></div>
                )}
                {e.riskPercent !== null && (
                  <div className="trade-day-field"><span>درصد ریسک</span><span className="mono">{faNum(e.riskPercent)}٪</span></div>
                )}
                {e.strategy && (
                  <div className="trade-day-field"><span>استراتژی</span><span>{e.strategy}</span></div>
                )}
              </div>

              {e.notes && <div className="trade-day-notes">{e.notes}</div>}

              <div className="trade-day-actions">
                <button type="button" className="small trade-day-edit" onClick={() => startEdit(e)}>ویرایش این معامله</button>
                <button type="button" className="small trade-day-delete" onClick={() => onDelete(e.id)}>حذف این معامله</button>
              </div>
            </div>
          );
        })
      ) : (
        <div className="item-line empty">معامله‌ای برای این روز ثبت نشده</div>
      )}

      {/* پورتال به body — چون .wrap توی layout یک stacking context جدا با
          z-index خودشو داره، z-index بالا این‌جا کافی نیست تا مطمئناً
          روی هدر ثابت (position:fixed) بشینه */}
      {lightboxUrl && typeof document !== "undefined" && createPortal(
        <div className="photo-lightbox" onClick={() => setLightboxUrl(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightboxUrl} alt="عکس معامله" className="photo-lightbox-img" onClick={(e) => e.stopPropagation()} />
          <button type="button" className="photo-lightbox-close" onClick={() => setLightboxUrl(null)} aria-label="بستن">×</button>
        </div>,
        document.body
      )}
    </div>
  );
}
