"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

// «جزئیاتِ بیشتر»: دستگیره‌ی پیکانِ اکسنت‌رنگ با نبضِ آرام که بقیه‌ی آمارها
// را نرم باز/بسته می‌کند — طبقِ درخواستِ صریح همان مدلِ قبلی برگشت، و حالا
// مشترک بینِ صفحه‌ی ژورنال‌نویسیِ یک حساب و جمعِ کلِ صفحه‌ی حساب‌ها.
export function TradeStatsCollapse({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={`trade-stats-handle${open ? " open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "بستن جزئیات" : "جزئیات بیشتر"}
      >
        <span className="trade-stats-handle-text">{open ? "بستن جزئیات" : "جزئیات بیشتر"}</span>
        <ChevronDown size={18} aria-hidden="true" />
      </button>
      {/* باز شدن با grid-template-rows: 0fr → 1fr — به ارتفاعِ واقعیِ محتوا
          گره خورده، پس نه می‌پرد نه وسطِ راه قطع می‌شود. */}
      <div className={`trade-stats-collapse${open ? " open" : ""}`} aria-hidden={!open}>
        <div className="trade-stats-collapse-inner">{children}</div>
      </div>
    </>
  );
}
