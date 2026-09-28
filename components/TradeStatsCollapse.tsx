"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

// «جزئیاتِ بیشتر»: دستگیره‌ی پیکانِ اکسنت‌رنگ با نبضِ آرام که بقیه‌ی آمارها
// را نرم باز/بسته می‌کند — طبقِ درخواستِ صریح همان مدلِ قبلی برگشت، و حالا
// مشترک بینِ صفحه‌ی ژورنال‌نویسیِ یک حساب و جمعِ کلِ صفحه‌ی حساب‌ها.
//
// طبقِ درخواستِ صریح، روی دسکتاپ (۱۰۲۴+) همه‌ی آمارها از همان ابتدا
// دیده می‌شوند: نه دستگیره‌ای هست، نه کشویی بسته. CSSِ هم‌نامِ همین
// breakpoint (globals.css) پیش از hydrate هم همین را تضمین می‌کند تا پرشی نباشد.
const DESKTOP_QUERY = "(min-width:1024px)";

export function TradeStatsCollapse({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const expanded = desktop || open;

  return (
    <>
      {!desktop && (
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
      )}
      {/* باز شدن با grid-template-rows: 0fr → 1fr — به ارتفاعِ واقعیِ محتوا
          گره خورده، پس نه می‌پرد نه وسطِ راه قطع می‌شود. */}
      <div className={`trade-stats-collapse${expanded ? " open" : ""}`} aria-hidden={!expanded}>
        <div className="trade-stats-collapse-inner">{children}</div>
      </div>
    </>
  );
}
