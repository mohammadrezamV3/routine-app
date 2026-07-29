"use client";

import { useState } from "react";
import { compressImageToDataUrl } from "@/lib/image";
import { TradeFormState } from "@/lib/tradeTypes";

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

  return (
    <>
      <div className="day-picker" style={{ marginTop: 10 }}>
        <span className={`day-pill${value.direction === "long" ? " on" : ""}`} onClick={() => onChange({ direction: "long" })}>Long</span>
        <span className={`day-pill${value.direction === "short" ? " on" : ""}`} onClick={() => onChange({ direction: "short" })}>Short</span>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <input className="wsearch-newform-name trade-glass-field" style={{ flex: "1 1 90px" }} placeholder="جفت‌ارز" value={value.pair} onChange={(e) => onChange({ pair: e.target.value })} />
        <input type="number" className="wsearch-newform-name trade-glass-field" style={{ flex: "1 1 90px" }} placeholder="قیمت ورود" value={value.entryPrice} onChange={(e) => onChange({ entryPrice: e.target.value })} />
        <input type="number" className="wsearch-newform-name trade-glass-field" style={{ flex: "1 1 90px" }} placeholder="قیمت خروج" value={value.exitPrice} onChange={(e) => onChange({ exitPrice: e.target.value })} />
        <input type="number" className="wsearch-newform-name trade-glass-field" style={{ flex: "1 1 70px" }} placeholder="لات" value={value.lotSize} onChange={(e) => onChange({ lotSize: e.target.value })} />
        <input type="number" className="wsearch-newform-name trade-glass-field" style={{ flex: "1 1 90px" }} placeholder="سود/زیان" value={value.pnl} onChange={(e) => onChange({ pnl: e.target.value })} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <input type="number" className="wsearch-newform-name trade-glass-field" style={{ flex: "1 1 90px" }} placeholder="حد ضرر" value={value.stopLoss} onChange={(e) => onChange({ stopLoss: e.target.value })} />
        <input type="number" className="wsearch-newform-name trade-glass-field" style={{ flex: "1 1 90px" }} placeholder="حد سود" value={value.takeProfit} onChange={(e) => onChange({ takeProfit: e.target.value })} />
        <input type="number" className="wsearch-newform-name trade-glass-field" style={{ flex: "1 1 90px" }} placeholder="درصد ریسک" value={value.riskPercent} onChange={(e) => onChange({ riskPercent: e.target.value })} />
      </div>
      <input className="wsearch-newform-name trade-glass-field" style={{ marginTop: 8 }} placeholder="استراتژی/ستاپ (اختیاری)" value={value.strategy} onChange={(e) => onChange({ strategy: e.target.value })} />
      <input className="wsearch-newform-name trade-glass-field" style={{ marginTop: 8 }} placeholder="یادداشت (اختیاری)" value={value.notes} onChange={(e) => onChange({ notes: e.target.value })} />

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
