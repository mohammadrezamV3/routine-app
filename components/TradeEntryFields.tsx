"use client";

import { useState } from "react";
import { compressImageToDataUrl } from "@/lib/image";
import { computeTradePnl, TradeFormState } from "@/lib/tradeTypes";
import { faNum } from "@/lib/jalali";
import { SegmentedTabs } from "./SegmentedTabs";

// فیلدهای مشترک فرم معامله — هم فرم «ثبت معامله جدید» هم فرم «ویرایش معامله»
// از همین استفاده می‌کنن، تا استایل شیشه‌ای/رفتار عکس همه‌جا یکی بمونه.
export function TradeEntryFields({
  value,
  onChange,
}: {
  value: TradeFormState;
  onChange: (patch: Partial<TradeFormState>) => void;
}) {
  const [compressing, setCompressing] = useState(false);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);

  async function handleScreenshotChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setScreenshotError(null);
    setCompressing(true);
    try {
      onChange({ screenshotUrl: await compressImageToDataUrl(file) });
    } catch (err) {
      setScreenshotError(err instanceof Error ? err.message : "خطا در پردازش عکس");
    } finally {
      setCompressing(false);
    }
  }

  const pnl = computeTradePnl(
    value.direction,
    value.entryPrice ? +value.entryPrice : null,
    value.exitPrice ? +value.exitPrice : null,
    value.lotSize ? +value.lotSize : null
  );

  return (
    <>
      <label className="exercise-form-label" style={{ marginTop: 10 }}>جهت معامله</label>
      <SegmentedTabs
        active={value.direction}
        onChange={(v) => onChange({ direction: v })}
        options={[
          { value: "long", label: "Long" },
          { value: "short", label: "Short" },
        ]}
      />

      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 90px" }}>
          <label className="exercise-form-label">جفت‌ارز</label>
          <input className="wsearch-newform-name trade-glass-field" placeholder="EURUSD" value={value.pair} onChange={(e) => onChange({ pair: e.target.value })} />
        </div>
        <div style={{ flex: "1 1 90px" }}>
          <label className="exercise-form-label">قیمت ورود</label>
          <input type="number" className="wsearch-newform-name trade-glass-field" placeholder="1.0950" value={value.entryPrice} onChange={(e) => onChange({ entryPrice: e.target.value })} />
        </div>
        <div style={{ flex: "1 1 90px" }}>
          <label className="exercise-form-label">قیمت خروج</label>
          <input type="number" className="wsearch-newform-name trade-glass-field" placeholder="1.1020" value={value.exitPrice} onChange={(e) => onChange({ exitPrice: e.target.value })} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 90px" }}>
          <label className="exercise-form-label">لات</label>
          <input type="number" className="wsearch-newform-name trade-glass-field" placeholder="0.10" value={value.lotSize} onChange={(e) => onChange({ lotSize: e.target.value })} />
        </div>
        <div style={{ flex: "1 1 90px" }}>
          <label className="exercise-form-label">حجم معامله</label>
          <input type="number" className="wsearch-newform-name trade-glass-field" placeholder="1000" value={value.volume} onChange={(e) => onChange({ volume: e.target.value })} />
        </div>
        <div style={{ flex: "1 1 90px" }}>
          <label className="exercise-form-label">سود/زیان</label>
          <div className="trade-pnl-readout mono" style={{ color: pnl === null ? "var(--muted2)" : pnl >= 0 ? "var(--accent)" : "#E05252" }}>
            {pnl === null ? "—" : faNum(pnl.toFixed(1))}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 90px" }}>
          <label className="exercise-form-label">حد ضرر</label>
          <input type="number" className="wsearch-newform-name trade-glass-field" placeholder="1.0900" value={value.stopLoss} onChange={(e) => onChange({ stopLoss: e.target.value })} />
        </div>
        <div style={{ flex: "1 1 90px" }}>
          <label className="exercise-form-label">حد سود</label>
          <input type="number" className="wsearch-newform-name trade-glass-field" placeholder="1.1050" value={value.takeProfit} onChange={(e) => onChange({ takeProfit: e.target.value })} />
        </div>
        <div style={{ flex: "1 1 90px" }}>
          <label className="exercise-form-label">درصد ریسک</label>
          <input type="number" className="wsearch-newform-name trade-glass-field" placeholder="1" value={value.riskPercent} onChange={(e) => onChange({ riskPercent: e.target.value })} />
        </div>
      </div>

      <label className="exercise-form-label">استراتژی/ستاپ (اختیاری)</label>
      <input className="wsearch-newform-name trade-glass-field" placeholder="بریک‌اوت" value={value.strategy} onChange={(e) => onChange({ strategy: e.target.value })} />
      <label className="exercise-form-label">یادداشت (اختیاری)</label>
      <input className="wsearch-newform-name trade-glass-field" placeholder="نکات این معامله" value={value.notes} onChange={(e) => onChange({ notes: e.target.value })} />

      <div className="trade-shot-row">
        <label className="trade-shot-btn">
          <input type="file" accept="image/*" onChange={handleScreenshotChange} hidden />
          {compressing ? "در حال پردازش…" : value.screenshotUrl ? "تغییر عکس معامله" : "افزودن عکس معامله"}
        </label>
        {value.screenshotUrl && (
          <span className="trade-shot-preview-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value.screenshotUrl} alt="پیش‌نمایش عکس معامله" className="trade-shot-preview" />
            <button type="button" className="trade-shot-remove" onClick={() => onChange({ screenshotUrl: null })} aria-label="حذف عکس">×</button>
          </span>
        )}
      </div>
      {screenshotError && <div className="field-error-msg" style={{ display: "block", marginTop: 6 }}>{screenshotError}</div>}
    </>
  );
}
