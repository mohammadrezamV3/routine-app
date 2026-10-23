"use client";

import { useState } from "react";
import { AnimatePresence, m as motion } from "framer-motion";
import { tr } from "@/lib/i18n";

export type QuickPanelItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  /** محتوای باکس زیر ردیف؛ فقط برای آیتم انتخاب‌شده صدا زده می‌شه */
  render: () => React.ReactNode;
  /** با انتخاب این باکس (کلیک کاربر) یک بار صدا زده می‌شه */
  onSelect?: () => void;
};

// ردیف باکس‌های کوچیک فقط‌آیکون (`dash-quick-tile`) + یک باکس محتوا زیرش که با
// انیمیشن عوض می‌شه. مشترک بین DashQuickPanels (روتین من) و بخش‌های
// تمرین/تغذیه‌ی داشبورد ورزش — همان نشانه‌گذاری و همان انیمیشن.
export function QuickPanels({
  items,
  ariaLabel,
  className,
  hideTabs = false,
}: {
  items: QuickPanelItem[];
  ariaLabel?: string;
  className?: string;
  /** ردیف باکس‌ها نشون داده نشه (مثلا وسط جلسه‌ی تمرین)؛ محتوا ریمانت نمی‌شه */
  hideTabs?: boolean;
}) {
  const [active, setActive] = useState<string | null>(null);
  const keys = items.map((i) => i.key);
  const current = active && keys.includes(active) ? active : keys[0] ?? null;

  if (items.length === 0 || !current) return null;
  const currentItem = items.find((i) => i.key === current)!;

  return (
    <div className={`dash-quick-panels flex flex-col gap-4 sm:gap-6${className ? ` ${className}` : ""}`}>
      {/* باکس‌های کوچیک فقط‌آیکون؛ انتخاب‌شده بزرگ‌تر می‌شه و اسمش ظاهر می‌شه. */}
      {!hideTabs && (
        <div className="flex items-end justify-center gap-2.5 sm:gap-3.5" role="tablist" aria-label={ariaLabel ?? tr("بخش‌ها", "Sections")}>
          {items.map((item) => {
            const on = item.key === current;
            return (
              // دکمه‌ی ساده + ترنزیشن CSS (نه framer layout): layout روی بچه‌ها
              // scale می‌انداخت و اسم موقع رفتن اول بزرگ می‌شد بعد محو.
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={on}
                aria-label={item.label}
                title={item.label}
                onClick={() => { setActive(item.key); if (!on) item.onSelect?.(); }}
                className={`dash-quick-tile rounded-dash border bg-dash-card backdrop-blur-xl${on ? " is-on" : ""}`}
              >
                <span className="dash-quick-tile-icon">{item.icon}</span>
                <span className="dash-quick-tile-label" aria-hidden={!on}>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={current}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          {currentItem.render()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
