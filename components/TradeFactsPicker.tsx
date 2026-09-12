"use client";

import {
  MAX_VISIBLE_TRADE_FACTS, TRADE_FACT_LABELS, TRADE_FACT_ORDER, TradeFactKey,
} from "@/lib/tradeTypes";
import { faNum } from "@/lib/jalali";
import { ToggleSwitch } from "./ToggleSwitch";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";

// انتخابِ اینکه کدام جزئیاتِ ترید بدونِ باز کردنِ کارتِ جزئیات، همان‌جا توی
// ردیفِ ترید دیده شوند. سقف دارد (هشت‌تا) چون ردیف روی دسکتاپ تک‌خطی‌ست و
// بیشتر از این جا نمی‌شود — وقتی به سقف رسیدیم، تاگل‌های خاموش غیرفعال
// می‌شوند تا کاربر به‌جای خطا گرفتن، خودش ببیند چرا نمی‌تواند اضافه کند.
export function TradeFactsPicker({
  visible,
  onToggle,
  onClose,
}: {
  visible: TradeFactKey[];
  onToggle: (key: TradeFactKey) => void;
  onClose: () => void;
}) {
  useLockBodyScroll();
  const atMax = visible.length >= MAX_VISIBLE_TRADE_FACTS;

  return (
    <>
      <div className="modal-overlay open" onClick={onClose} />
      <div className="modal-panel open">
        <div className="modal-head">
          <div className="modal-title">جزئیات ترید در لیست</div>
          <button className="nav-close" onClick={onClose} aria-label="بستن">×</button>
        </div>
        <div className="modal-body">
          <div className="section-note" style={{ marginTop: 0 }}>
            کدوم جزئیات هر ترید توی لیست نشون داده بشه رو انتخاب کن — حداکثر
            {` ${faNum(MAX_VISIBLE_TRADE_FACTS)} `}مورد.
            {atMax && " به سقف رسیدی؛ برای اضافه‌کردن یکی رو خاموش کن."}
          </div>
          <div className="tm-extra" style={{ marginTop: 10 }}>
            {TRADE_FACT_ORDER.map((key) => {
              const on = visible.includes(key);
              return (
                <div key={key} className={`stat-toggle-row${!on && atMax ? " is-disabled" : ""}`}>
                  <span className="stat-toggle-label">{TRADE_FACT_LABELS[key]}</span>
                  <ToggleSwitch
                    checked={on}
                    disabled={!on && atMax}
                    onChange={() => onToggle(key)}
                    label={TRADE_FACT_LABELS[key]}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
