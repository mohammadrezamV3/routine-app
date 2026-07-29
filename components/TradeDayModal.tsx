"use client";

import { faNum } from "@/lib/jalali";
import { TradeEntry } from "@/lib/tradeTypes";

// با کلیک روی یک روزِ تقویم باز می‌شه — و عمداً فقط همین رو نشون می‌ده:
// مشخصات معاملات همون روز + عکس معامله. هیچ آمار/فرم/داده‌ی دیگه‌ای اینجا نیست.
export function TradeDayModal({
  title,
  entries,
  onClose,
  onDelete,
}: {
  title: string;
  entries: TradeEntry[];
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      <div className="modal-overlay open" onClick={onClose} />
      <div className="modal-panel open trade-day-modal">
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <button className="nav-close" onClick={onClose} aria-label="بستن">×</button>
        </div>

        <div className="modal-body">
          {entries.length ? (
            entries.map((e) => (
              <div key={e.id} className="trade-day-card">
                <div className="trade-day-card-head">
                  <span className="name">
                    {e.pair}{" "}
                    <span className="mono" style={{ color: "var(--muted2)" }}>
                      ({e.direction === "long" ? "خرید" : "فروش"})
                    </span>
                  </span>
                  {e.pnl !== null && (
                    <span className="mono trade-day-pnl" style={{ color: e.pnl >= 0 ? "var(--accent)" : "#E05252" }}>
                      {faNum(e.pnl)}
                    </span>
                  )}
                </div>

                {e.screenshotUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.screenshotUrl} alt={`عکس معامله ${e.pair}`} className="trade-day-shot" />
                )}

                <div className="trade-day-fields">
                  <div className="trade-day-field"><span>قیمت ورود</span><span className="mono">{faNum(e.entryPrice)}</span></div>
                  {e.exitPrice !== null && (
                    <div className="trade-day-field"><span>قیمت خروج</span><span className="mono">{faNum(e.exitPrice)}</span></div>
                  )}
                  <div className="trade-day-field"><span>لات</span><span className="mono">{faNum(e.lotSize)}</span></div>
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

                <button type="button" className="small trade-day-delete" onClick={() => onDelete(e.id)}>
                  حذف این معامله
                </button>
              </div>
            ))
          ) : (
            <div className="item-line empty">معامله‌ای برای این روز ثبت نشده</div>
          )}
        </div>
      </div>
    </>
  );
}
