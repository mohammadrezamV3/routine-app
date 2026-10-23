"use client";

import { memo } from "react";
import { ChevronLeft, Repeat2 } from "lucide-react";
import { tr } from "@/lib/i18n";
import type { CycleTile } from "@/lib/sleepDialHints";

// باکس هوشمند «چرخه‌های خواب» زیر ساعت هدف (کنار باکس هدف خواب): ساعت بیداری
// پیشنهادی رو زنده نشون می‌ده و با زدنش پنجره‌ی SleepCycleSheet باز می‌شه. خود
// پنجره با next/dynamic فقط بعد از اولین hover/فوکوس/لمس (onPreload) یا کلیک لود می‌شه.
// استایل باکس‌ها در components/sleep-dial.css (.sld-tile).
export const SleepCycleButton = memo(function SleepCycleButton({
  onClick, onPreload, info, bedtime,
}: {
  onClick: () => void;
  onPreload?: () => void;
  info: CycleTile | null;
  bedtime: string;
}) {
  return (
    <button
      type="button"
      className="sld-tile is-cycles"
      onClick={onClick}
      onPointerEnter={onPreload}
      onFocus={onPreload}
      onTouchStart={onPreload}
    >
      <span className="sld-tile-ico" aria-hidden><Repeat2 /></span>
      <ChevronLeft className="sld-tile-go dir-flip" aria-hidden />
      <span className="sld-tile-txt">
        <small>{tr("چرخه‌های خواب", "Sleep cycles")}</small>
        <b>{info ? info.clock : "--:--"}</b>
        <em>
          {info?.mode === "bed"
            ? tr(`اگه ${bedtime} بخوابی`, `If you sleep at ${bedtime}`)
            : info?.mode === "tracked"
              ? tr("بیداری مناسب برای خوابت", "Good time to wake up")
              : tr("اگه الان بخوابی", "If you sleep now")}
        </em>
      </span>
    </button>
  );
});
