"use client";

import { TRADE_STAT_LABELS, TRADE_STAT_ORDER, TradeStatKey } from "@/lib/tradeTypes";
import { ToggleSwitch } from "./ToggleSwitch";

// صفحه‌ی انتخاب آمارهای قابل‌نمایش توی صفحه‌ی ترید — از پنل کاربری با دکمه‌ی
// «تغییر» باز می‌شه؛ هر ردیف یک تاگل لیکوئید گلسِ سبک iOS داره.
export function TradeStatsPicker({
  visible,
  onToggle,
  onClose,
}: {
  visible: TradeStatKey[];
  onToggle: (key: TradeStatKey) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="modal-overlay open" onClick={onClose} />
      <div className="modal-panel open">
        <div className="modal-head">
          <div className="modal-title">آمارهای صفحه ترید</div>
          <button className="nav-close" onClick={onClose} aria-label="بستن">×</button>
        </div>
        <div className="modal-body">
          <div className="section-note" style={{ marginTop: 0 }}>
            کدوم آمارها توی صفحه‌ی ترید نشون داده بشن رو انتخاب کن.
          </div>
          <div className="tm-extra" style={{ marginTop: 10 }}>
            {TRADE_STAT_ORDER.map((key) => (
              <div key={key} className="stat-toggle-row">
                <span className="stat-toggle-label">{TRADE_STAT_LABELS[key]}</span>
                <ToggleSwitch checked={visible.includes(key)} onChange={() => onToggle(key)} label={TRADE_STAT_LABELS[key]} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
