// ست آیکونِ اختصاصیِ داشبورد — هم‌خانواده با ICONSِ منو (viewBox 24، خطِ
// ۱.۷، سرِ گرد) ولی هرکدام یک «جزءِ زنده» دارند که با کلاسِ .dbi-* در
// app/dashboard/dashboard.css حرکت می‌کند: شعاع‌های خورشید می‌چرخند، دمبل
// بالا می‌رود، شمع‌ها رشد می‌کنند، زنگ تکان می‌خورد، … . حرکت‌ها فقط وقتی
// کارتِ والد hover/focus می‌شود (یا یک‌بار موقعِ ورود) اجرا می‌شوند، نه
// دائمی — هم برای آرامشِ صفحه هم برای باتری. همه‌ی حرکت‌ها transform/opacity
// هستند (بدونِ layout) و با prefers-reduced-motion کلا خاموش می‌شوند.

import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = { viewBox: "0 0 24 24", fill: "none", "aria-hidden": true } as const;
const s = { stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const DI = {
  // ── زمانِ روز (سلامِ هیرو) ─────────────────────────────
  sunrise: (p: P) => (
    <svg {...base} {...p}>
      <g className="dbi-rise">
        <path d="M7 16a5 5 0 0 1 10 0" {...s} />
        <g className="dbi-rays">
          <path d="M12 6.5V8.3M5.3 9.3l1.3 1.3M18.7 9.3l-1.3 1.3M3 15.5h1.8M19.2 15.5H21" {...s} />
        </g>
      </g>
      <path d="M3 19.5h18" {...s} />
    </svg>
  ),
  sun: (p: P) => (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="4" {...s} />
      <g className="dbi-rays dbi-spin">
        <path d="M12 3v1.8M12 19.2V21M3 12h1.8M19.2 12H21M5.6 5.6l1.3 1.3M17.1 17.1l1.3 1.3M5.6 18.4l1.3-1.3M17.1 6.9l1.3-1.3" {...s} />
      </g>
    </svg>
  ),
  sunset: (p: P) => (
    <svg {...base} {...p}>
      <g className="dbi-set">
        <path d="M7 16a5 5 0 0 1 10 0" {...s} />
        <path d="M12 5.2v3.3m0 0-1.6-1.6M12 8.5l1.6-1.6" {...s} />
      </g>
      <path d="M3 19.5h18M5.5 16H4M20 16h-1.5" {...s} />
    </svg>
  ),
  moon: (p: P) => (
    <svg {...base} {...p}>
      <path d="M19.5 14.6A7.8 7.8 0 1 1 9.4 4.5a6.2 6.2 0 0 0 10.1 10.1Z" {...s} />
      <path className="dbi-twinkle" d="M16.5 3.5v2.6M15.2 4.8h2.6" {...s} strokeWidth={1.4} />
      <path className="dbi-twinkle dbi-d2" d="M20 8.2v1.6M19.2 9h1.6" {...s} strokeWidth={1.3} />
    </svg>
  ),

  // ── ماژول‌ها ───────────────────────────────────────────
  routine: (p: P) => (
    <svg {...base} {...p}>
      <rect x="3.5" y="4.5" width="17" height="15.5" rx="3" {...s} />
      <path d="M3.5 9h17M8 2.8v3.4M16 2.8v3.4" {...s} />
      <path className="dbi-check" pathLength={1} d="m8.6 14.3 2.3 2.2 4.6-4.6" {...s} />
    </svg>
  ),
  dumbbell: (p: P) => (
    <svg {...base} {...p}>
      <g className="dbi-lift">
        <path d="M6.5 8v8M17.5 8v8M3.6 10v4M20.4 10v4M6.5 12h11" {...s} />
      </g>
      <path d="M7 20.5h10" {...s} opacity={0.45} />
    </svg>
  ),
  apple: (p: P) => (
    <svg {...base} {...p}>
      <path d="M12 8.3c-2.7-2.5-6.4-1.5-7.7 1.1-1.7 3.3-.4 8.3 2.5 10.4 1.3 1 2.7 1 3.9.3.6-.3 1.1-.3 1.7 0 1.2.7 2.6.7 3.9-.3 2.9-2.1 4.2-7.1 2.5-10.4-1.3-2.6-5-3.6-7.7-1.1Z" {...s} />
      <g className="dbi-leaf">
        <path d="M12 8.3c0-1.9.8-3.4 2.2-4.3" {...s} />
        <path d="M14.2 4c1.4-.4 2.7 0 3.4.9-1.2.8-2.5.9-3.4-.9Z" {...s} strokeWidth={1.4} />
      </g>
    </svg>
  ),
  candles: (p: P) => (
    <svg {...base} {...p}>
      <g className="dbi-candle">
        <path d="M6.5 4.5v3M6.5 15.5v3" {...s} />
        <rect x="4.6" y="7.5" width="3.8" height="8" rx="1.1" {...s} />
      </g>
      <g className="dbi-candle dbi-d1">
        <path d="M12 3v4M12 13v3.5" {...s} />
        <rect x="10.1" y="7" width="3.8" height="6" rx="1.1" {...s} />
      </g>
      <g className="dbi-candle dbi-d2">
        <path d="M17.5 7.5v2.5M17.5 17v3" {...s} />
        <rect x="15.6" y="10" width="3.8" height="7" rx="1.1" {...s} />
      </g>
    </svg>
  ),
  calendarBolt: (p: P) => (
    <svg {...base} {...p}>
      <rect x="3.5" y="5" width="17" height="15" rx="2.6" {...s} />
      <path d="M3.5 9.5h17M8 3v3.4M16 3v3.4" {...s} />
      <path className="dbi-zap" d="m12.8 11.3-2.6 3.6h3.2l-2.4 3.4" {...s} />
    </svg>
  ),
  globeClock: (p: P) => (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="8.5" {...s} />
      <path d="M3.5 12h17M12 3.5c2.4 2.4 3.4 5.2 3.4 8.5s-1 6.1-3.4 8.5c-2.4-2.4-3.4-5.2-3.4-8.5s1-6.1 3.4-8.5Z" {...s} opacity={0.5} />
      <g className="dbi-hand">
        <path d="M12 12V7.6" {...s} strokeWidth={2} />
      </g>
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </svg>
  ),
  mentors: (p: P) => (
    <svg {...base} {...p}>
      <circle cx="9" cy="7.5" r="3.2" {...s} />
      <path d="M3 19.5c1-3.3 3.3-5 6-5s5 1.7 6 5" {...s} />
      <g className="dbi-nod">
        <circle cx="17.2" cy="10" r="2.3" {...s} strokeWidth={1.6} />
        <path d="M16.3 14.6c2.2-.2 3.9 1.1 4.7 3.4" {...s} strokeWidth={1.6} />
      </g>
    </svg>
  ),
  roadmap: (p: P) => (
    <svg {...base} {...p}>
      <path className="dbi-trail" pathLength={1} d="M5 20c0-3 2.5-4 5-4s5-1 5-4-2.5-4-5-4" {...s} strokeDasharray="0.06 0.05" />
      <circle cx="5" cy="20" r="1.3" fill="currentColor" />
      <g className="dbi-flag">
        <path d="M15 3.5v8" {...s} />
        <path d="M15 4h4.6l-1.4 1.9 1.4 1.9H15" {...s} />
      </g>
    </svg>
  ),
  analysis: (p: P) => (
    <svg {...base} {...p}>
      <path className="dbi-bar" d="M5 20v-6" {...s} strokeWidth={2} />
      <path className="dbi-bar dbi-d1" d="M10 20V9" {...s} strokeWidth={2} />
      <path className="dbi-bar dbi-d2" d="M15 20v-8" {...s} strokeWidth={2} />
      <path className="dbi-spark" d="M19.5 3.5v3M18 5h3" {...s} strokeWidth={1.4} />
    </svg>
  ),
  journal: (p: P) => (
    <svg {...base} {...p}>
      <rect x="5" y="3.5" width="14" height="17" rx="2" {...s} />
      <path className="dbi-write" pathLength={1} d="M9 8h6M9 12h6M9 16h3.5" {...s} />
    </svg>
  ),
  checklist: (p: P) => (
    <svg {...base} {...p}>
      <rect x="3.5" y="4.5" width="4.2" height="4.2" rx="1.1" {...s} strokeWidth={1.6} />
      <path className="dbi-check" pathLength={1} d="m4.4 6.6.9.9 1.6-1.8" {...s} strokeWidth={1.5} />
      <rect x="3.5" y="14" width="4.2" height="4.2" rx="1.1" {...s} strokeWidth={1.6} />
      <path className="dbi-check dbi-d1" pathLength={1} d="m4.4 16.1.9.9 1.6-1.8" {...s} strokeWidth={1.5} />
      <path d="M11 6.6h9.5M11 16.1h9.5" {...s} />
    </svg>
  ),
  notes: (p: P) => (
    <svg {...base} {...p}>
      <path d="M5 4.5h10.5L19 8v11.5H5Z" {...s} />
      <path d="M15.5 4.5V8H19" {...s} />
      <g className="dbi-pen">
        <path d="m9 15.5 5.4-5.4 1.5 1.5-5.4 5.4H9Z" {...s} strokeWidth={1.5} />
      </g>
    </svg>
  ),
  link: (p: P) => (
    <svg {...base} {...p}>
      <g className="dbi-link-a">
        <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.2 1.2" {...s} />
      </g>
      <g className="dbi-link-b">
        <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.2-1.2" {...s} />
      </g>
    </svg>
  ),
  chart: (p: P) => (
    <svg {...base} {...p}>
      <path d="M4 4v16h16" {...s} />
      <path className="dbi-line" pathLength={1} d="m7.5 15 3.5-4 3 2.5 5-6" {...s} />
    </svg>
  ),

  // ── عمومی ─────────────────────────────────────────────
  flame: (p: P) => (
    <svg {...base} {...p}>
      <path className="dbi-flicker" d="M12 2.8c1.1 3.1-2.6 4.7-2.6 8.3a2.6 2.6 0 0 0 5.2 0c0-1.1-.5-1.6-.5-2.7 1.6.9 2.7 2.7 2.7 4.8a4.8 4.8 0 0 1-9.6 0c0-4.3 3.2-6.4 4.8-10.4Z" fill="currentColor" />
    </svg>
  ),
  target: (p: P) => (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="8.5" {...s} />
      <circle cx="12" cy="12" r="4.8" {...s} opacity={0.6} />
      <g className="dbi-arrow">
        <path d="m12 12 7.5-7.5M16.6 4.2h3.2v3.2" {...s} />
      </g>
    </svg>
  ),
  bell: (p: P) => (
    <svg {...base} {...p}>
      <g className="dbi-ring">
        <path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5H5Z" {...s} />
      </g>
      <path d="M10 20.5a2.2 2.2 0 0 0 4 0" {...s} />
    </svg>
  ),
  chat: (p: P) => (
    <svg {...base} {...p}>
      <path d="M4.5 18.5V7a2.5 2.5 0 0 1 2.5-2.5h10A2.5 2.5 0 0 1 19.5 7v7a2.5 2.5 0 0 1-2.5 2.5H8.3Z" {...s} />
      <circle className="dbi-dot" cx="8.8" cy="10.6" r="1" fill="currentColor" />
      <circle className="dbi-dot dbi-d1" cx="12" cy="10.6" r="1" fill="currentColor" />
      <circle className="dbi-dot dbi-d2" cx="15.2" cy="10.6" r="1" fill="currentColor" />
    </svg>
  ),
  spark: (p: P) => (
    <svg {...base} {...p}>
      <path className="dbi-pulse" d="M12 3.5c.6 3.7 1.8 5 5.5 5.6-3.7.6-4.9 1.9-5.5 5.6-.6-3.7-1.8-5-5.5-5.6 3.7-.6 4.9-1.9 5.5-5.6Z" {...s} />
      <path className="dbi-twinkle" d="M18.5 15v4M16.5 17h4" {...s} strokeWidth={1.4} />
      <path className="dbi-twinkle dbi-d2" d="M6 16.5v2.4M4.8 17.7h2.4" {...s} strokeWidth={1.3} />
    </svg>
  ),
  command: (p: P) => (
    <svg {...base} {...p}>
      <circle cx="10.8" cy="10.8" r="6.3" {...s} />
      <path className="dbi-seek" d="m15.5 15.5 4 4" {...s} strokeWidth={2} />
    </svg>
  ),
  plus: (p: P) => (
    <svg {...base} {...p}>
      <path className="dbi-spin-q" d="M12 5v14M5 12h14" {...s} strokeWidth={2} />
    </svg>
  ),
  arrow: (p: P) => (
    <svg {...base} {...p}>
      <path className="dbi-nudge" d="M14.5 6 8.5 12l6 6" {...s} strokeWidth={1.9} />
    </svg>
  ),
  bed: (p: P) => (
    <svg {...base} {...p}>
      <path d="M3 18.5V6M3 14h18v4.5M21 14v-2.2A2.8 2.8 0 0 0 18.2 9H11v5" {...s} />
      <circle cx="7" cy="11" r="1.8" {...s} />
      <path className="dbi-z" d="M15 3.5h3l-3 3h3" {...s} strokeWidth={1.4} />
    </svg>
  ),
  trophy: (p: P) => (
    <svg {...base} {...p}>
      <path d="M8 4.5h8v5a4 4 0 0 1-8 0Z" {...s} />
      <path d="M8 6.5H5.2a2.8 2.8 0 0 0 3.2 4.2M16 6.5h2.8a2.8 2.8 0 0 1-3.2 4.2M12 13.5v3.5M8.5 20h7M9.8 17h4.4" {...s} />
      <path className="dbi-twinkle" d="M12 6.6v2" {...s} strokeWidth={1.4} />
    </svg>
  ),
  lock: (p: P) => (
    <svg {...base} {...p}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.2" {...s} />
      <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" {...s} />
    </svg>
  ),
  user: (p: P) => (
    <svg {...base} {...p}>
      <circle cx="12" cy="8" r="3.3" {...s} />
      <path d="M5 19.5c1.3-3.3 4-5 7-5s5.7 1.7 7 5" {...s} />
    </svg>
  ),
  card: (p: P) => (
    <svg {...base} {...p}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" {...s} />
      <path d="M3.5 9.5h17M7 14h5" {...s} />
    </svg>
  ),
  shield: (p: P) => (
    <svg {...base} {...p}>
      <path d="M12 3.5 5 6.3v5.4c0 4.4 3 8.3 7 9.3 4-1 7-4.9 7-9.3V6.3l-7-2.8Z" {...s} />
      <path className="dbi-check" pathLength={1} d="M9 12.2 11.2 14.4 15.3 10" {...s} />
    </svg>
  ),
  water: (p: P) => (
    <svg {...base} {...p}>
      <path d="M12 3.5c3.3 4 5.5 7 5.5 10a5.5 5.5 0 0 1-11 0c0-3 2.2-6 5.5-10Z" {...s} />
      <path className="dbi-wave" d="M9 14.5c1 .8 2 .8 3 0s2-.8 3 0" {...s} strokeWidth={1.5} />
    </svg>
  ),
} as const;

export type DashIconName = keyof typeof DI;

export function DashIcon({ name, className, ...rest }: { name: DashIconName } & P) {
  const Cmp = DI[name];
  return <Cmp className={className ? `dbi ${className}` : "dbi"} {...rest} />;
}
