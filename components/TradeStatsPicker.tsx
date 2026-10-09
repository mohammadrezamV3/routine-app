"use client";

import { TRADE_STAT_LABELS, TRADE_STAT_ORDER, TradeStatKey } from "@/lib/tradeTypes";
import { ToggleSwitch } from "./ToggleSwitch";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { tr } from "@/lib/i18n";

// صفحه‌ی انتخاب آمارهای قابل‌نمایش توی صفحه‌ی ترید — از پنل کاربری با دکمه‌ی
// «تغییر» باز می‌شه؛ هر ردیف یک تاگل لیکوئید گلس سبک iOS داره.
// generic روی نوع کلید: همین پاپ‌آپ هم برای آمارهای صفحه‌ی یک حساب
// (پیش‌فرض) و هم برای جمع کل صفحه‌ی حساب‌ها استفاده می‌شه.
export function TradeStatsPicker<K extends string = TradeStatKey>({
  visible,
  onToggle,
  onClose,
  title,
  note,
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
          <div className="modal-title">{title ?? tr("آمارهای صفحه ترید", "Trading page stats")}</div>
          <button className="nav-close" onClick={onClose} aria-label={tr("بستن", "Close")}>×</button>
        </div>
        <div className="modal-body">
          <div className="section-note" style={{ marginTop: 0 }}>
            {note ?? tr("کدوم آمارها توی صفحه‌ی ترید نشون داده بشن رو انتخاب کن.", "Choose which stats show on the trading page.")}
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
