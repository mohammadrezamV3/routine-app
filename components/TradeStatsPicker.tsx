"use client";

import { TRADE_STAT_LABELS, TRADE_STAT_ORDER, TradeStatKey } from "@/lib/tradeTypes";
import { ToggleSwitch } from "./ToggleSwitch";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";

// صفحه‌ی انتخاب آمارهای قابل‌نمایش توی صفحه‌ی ترید — از پنل کاربری با دکمه‌ی
// «تغییر» باز می‌شه؛ هر ردیف یک تاگل لیکوئید گلس سبک iOS داره.
// generic روی نوعِ کلید: همین پاپ‌آپ هم برای آمارهای صفحه‌ی یک حساب
// (پیش‌فرض) و هم برای جمعِ کلِ صفحه‌ی حساب‌ها استفاده می‌شه.
export function TradeStatsPicker<K extends string = TradeStatKey>({
  visible,
  onToggle,
  onClose,
  title = "آمارهای صفحه ترید",
  note = "کدوم آمارها توی صفحه‌ی ترید نشون داده بشن رو انتخاب کن.",
  order = TRADE_STAT_ORDER as unknown as K[],
  labels = TRADE_STAT_LABELS as unknown as Record<K, string>,
}: {
  visible: K[];
  onToggle: (key: K) => void;
  onClose: () => void;
  title?: string;
  note?: string;
  order?: K[];
  labels?: Record<K, string>;
}) {
  useLockBodyScroll();
  return (
    <>
      <div className="modal-overlay open" onClick={onClose} />
      <div className="modal-panel open">
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <button className="nav-close" onClick={onClose} aria-label="بستن">×</button>
        </div>
        <div className="modal-body">
          <div className="section-note" style={{ marginTop: 0 }}>
            {note}
          </div>
          <div className="tm-extra" style={{ marginTop: 10 }}>
            {order.map((key) => (
              <div key={key} className="stat-toggle-row">
                <span className="stat-toggle-label">{labels[key]}</span>
                <ToggleSwitch checked={visible.includes(key)} onChange={() => onToggle(key)} label={labels[key]} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
