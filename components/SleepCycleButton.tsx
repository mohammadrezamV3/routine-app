"use client";

import "./sleep-cycle.css";
import { memo } from "react";
import { Repeat2 } from "lucide-react";
import { tr } from "@/lib/i18n";

// تنها ورودی «چرخه‌های خواب» روی کارت صفحه‌ی ساعت — چیپ کوچک بی‌بک‌گراند.
// خود پنجره (SleepCycleSheet) با next/dynamic فقط بعد از زدن این دکمه لود می‌شه.
export const SleepCycleButton = memo(function SleepCycleButton({ onClick, onPreload }: { onClick: () => void; onPreload?: () => void }) {
  return (
    <button type="button" className="slc-chip" onClick={onClick} onPointerEnter={onPreload} onFocus={onPreload}>
      <Repeat2 aria-hidden />
      {tr("چرخه‌های خواب", "Sleep cycles")}
    </button>
  );
});
