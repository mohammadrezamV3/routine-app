"use client";

// سوییچ روز/شب — مشترک بین کشوی همبرگری و هدر دسکتاپ.
// یک آیکون واحد: خورشید با پرتوهایی که می‌چرخن و جمع می‌شن و به ماه تبدیل می‌شه
// (ماسک)، به‌علاوه ستاره‌هایی که در حالت شب توی مسیر ظاهر می‌شن.
// استایل و انیمیشن در globals.css (.theme-switch)، فقط transform/opacity.
import { useId } from "react";
import { useTheme } from "./ThemeProvider";
import { tr } from "@/lib/i18n";

const RAYS = [0, 45, 90, 135, 180, 225, 270, 315];

export default function ThemeSwitch() {
  const { toggle } = useTheme();
  const mid = useId().replace(/:/g, "");
  return (
    <button onClick={toggle} className="theme-switch" aria-label={tr("تغییر حالت نمایش", "Toggle theme")}>
      <span className="ts-stars" aria-hidden="true">
        <i className="ts-star s1" /><i className="ts-star s2" /><i className="ts-star s3" />
      </span>
      <span className="ts-knob">
        <svg className="ts-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <defs>
            <mask id={`ts-m-${mid}`}>
              <rect x="0" y="0" width="24" height="24" fill="#fff" />
              <circle className="ts-cut" cx="17" cy="7" r="6" fill="#000" />
            </mask>
          </defs>
          <g className="ts-rays" stroke="var(--sun)" strokeWidth="2" strokeLinecap="round">
            {RAYS.map((a) => (
              <line key={a} x1="12" y1="2.2" x2="12" y2="4.2" transform={`rotate(${a} 12 12)`} />
            ))}
          </g>
          <circle className="ts-core" cx="12" cy="12" r="5" fill="var(--sun)" mask={`url(#ts-m-${mid})`} />
        </svg>
      </span>
    </button>
  );
}
