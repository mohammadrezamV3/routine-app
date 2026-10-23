import type { CSSProperties } from "react";
import { currentLocale, dirOf, tr } from "@/lib/i18n";

/*
  Decorative mosaic for the split login page (gallery style, tiles bleed off
  the edges). Static markup only: server compatible, no hooks, no images.
  Styles live in app/_area/auth.css (auth-showcase block).
*/

type Variant = "panel" | "strip";

const HEAT_CELLS = Array.from({ length: 126 }, (_, i) => {
  const v = (Math.sin(i * 1.7) + Math.cos(i * 0.37) + 2) / 4;
  return i % 11 === 0 ? 0.08 : Number((0.15 + v * 0.85).toFixed(2));
});

const EQUITY_LINE =
  "M0 196 C40 190 70 176 110 180 C150 184 170 150 210 148 C250 146 270 160 300 138 C330 116 360 120 390 104 C420 88 450 96 480 76 C510 56 540 66 570 44 L608 36";
const EQUITY_AREA = `${EQUITY_LINE} L608 220 L0 220 Z`;
const FLAME_OUTER =
  "M39 4 C46 26 70 36 70 62 C70 82 56 94 39 94 C22 94 8 82 8 62 C8 46 18 38 24 28 C26 42 32 46 36 46 C30 30 34 16 39 4 Z";
const FLAME_INNER =
  "M39 46 C44 58 56 62 56 74 C56 86 48 92 39 92 C30 92 22 86 22 74 C22 66 28 62 31 56 C33 64 37 66 39 66 C37 58 37 52 39 46 Z";

/* ring arc drawn with pathLength=100 so the draw-in only needs one keyframe */
function Arc({ cx, cy, r, w, len, cls, delay = 0 }: { cx: number; cy: number; r: number; w: number; len: number; cls: string; delay?: number }) {
  return (
    <circle
      className={`as-arc ${cls}`}
      cx={cx}
      cy={cy}
      r={r}
      fill="none"
      strokeWidth={w}
      strokeLinecap="round"
      pathLength={100}
      strokeDasharray={`${len} 100`}
      transform={`rotate(-90 ${cx} ${cy})`}
      style={{ "--as-len": len, "--as-delay": `${delay}ms` } as CSSProperties}
    />
  );
}

function Track({ cx, cy, r, w, cls }: { cx: number; cy: number; r: number; w: number; cls: string }) {
  return <circle className={cls} cx={cx} cy={cy} r={r} fill="none" strokeWidth={w} />;
}

function Cap({ title, sub, side = "end" }: { title: string; sub: string; side?: "start" | "end" }) {
  return (
    <div className={`as-cap as-cap-${side}`}>
      <div dir={dirOf(currentLocale())}>
        <b>{title}</b>
        {sub}
      </div>
    </div>
  );
}

function Panel() {
  return (
    <div className="as-mosaic as-mosaic-panel" dir="ltr">
      <div className="as-tile as-heat">
        <Cap side="start" title={tr("نقشه‌ی ثبات", "Consistency map")} sub={tr("روتین من · 13 هفته", "My routine · 13 weeks")} />
        <div className="as-heat-grid">
          {HEAT_CELLS.map((a, i) => (
            <i key={i} style={{ background: `rgba(139,124,255,${a})` }} />
          ))}
        </div>
      </div>

      <div className="as-tile as-flame">
        <Cap title={tr("استریک", "Streak")} sub={tr("روز پشت روز", "Day after day")} />
        <svg width="78" height="96" viewBox="0 0 78 96">
          <path d={FLAME_OUTER} fill="#FF8A3D" />
          <path d={FLAME_INNER} fill="#FFD27A" />
        </svg>
        <span className="as-num as-flame-num">12</span>
      </div>

      <div className="as-tile as-rings">
        <Cap title={tr("حلقه‌های امروز", "Today's rings")} sub={tr("روتین · تمرین · کالری", "Routine · workout · calories")} />
        <svg width="230" height="230" viewBox="0 0 230 230">
          <Track cx={115} cy={115} r={98} w={20} cls="as-t-violet" />
          <Arc cx={115} cy={115} r={98} w={20} len={82.8} cls="as-s-violet" />
          <Track cx={115} cy={115} r={72} w={20} cls="as-t-green" />
          <Arc cx={115} cy={115} r={72} w={20} len={75.2} cls="as-s-green" delay={120} />
          <Track cx={115} cy={115} r={46} w={20} cls="as-t-coral" />
          <Arc cx={115} cy={115} r={46} w={20} len={79.6} cls="as-s-coral" delay={240} />
        </svg>
        <div className="as-ring-legend as-num">
          <span style={{ color: "#A99CFF" }}>83%</span>
          <span style={{ color: "#5BE3A8" }}>4/5</span>
          <span style={{ color: "#FF9C74" }}>1820</span>
        </div>
      </div>

      <div className="as-tile as-equity">
        <Cap title={tr("منحنی هفته", "Weekly curve")} sub={tr("ترید · ژورنال", "Trade · journal")} />
        <span className="as-num as-equity-val">+$2,810</span>
        <svg className="as-equity-svg" width="608" height="220" viewBox="0 0 608 220">
          <path className="as-fade" d={EQUITY_AREA} fill="rgba(46,168,255,0.16)" />
          <path className="as-line" d={EQUITY_LINE} fill="none" stroke="#2EA8FF" strokeWidth="3" pathLength={100} strokeDasharray="100" />
          <circle className="as-fade as-fade-late" cx="570" cy="44" r="6" fill="#2EA8FF" />
        </svg>
      </div>

      <div className="as-tile as-sleep">
        <Cap title={tr("خواب دیشب", "Last night's sleep")} sub={tr("7 ساعت و 22 دقیقه", "7h 22m")} />
        <svg width="170" height="170" viewBox="0 0 170 170">
          <circle cx="85" cy="85" r="70" fill="#0E1434" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
          <g fill="#fff">
            <circle cx="50" cy="52" r="1.6" />
            <circle cx="118" cy="46" r="1.2" />
            <circle cx="64" cy="118" r="1.2" />
            <circle cx="120" cy="112" r="1.8" />
            <circle cx="96" cy="70" r="1" />
            <circle cx="72" cy="84" r="1" />
          </g>
          <path className="as-arc as-s-indigo" d="M85 15 A70 70 0 0 1 152 104" fill="none" strokeWidth="10" strokeLinecap="round" pathLength={100} strokeDasharray="100 100" style={{ "--as-len": 100 } as CSSProperties} />
          <text className="as-svg-num" x="85" y="94" textAnchor="middle" fontSize="26" fill="#E3E8FF">86</text>
        </svg>
      </div>

      <div className="as-tile as-fx">
        <Cap title={tr("سشن‌ها", "Sessions")} sub={tr("ساعت فارکس", "Forex clock")} />
        {[
          { w: 40, m: 4, c: "#2EA8FF" },
          { w: 38, m: 30, c: "#5CC2FF" },
          { w: 36, m: 52, c: "#8FD6FF" },
          { w: 30, m: 66, c: "#3EE0A1" },
        ].map((b, i) => (
          <div className="as-bar" key={i}>
            <i style={{ width: `${b.w}%`, marginInlineStart: `${b.m}%`, background: b.c, animationDelay: `${i * 90}ms` }} />
          </div>
        ))}
      </div>

      <div className="as-tile as-gym">
        <Cap title={tr("تمرین هفته", "Weekly workout")} sub={tr("پایین‌تنه B", "Lower body B")} />
        <svg width="190" height="190" viewBox="0 0 190 190">
          <Track cx={95} cy={95} r={78} w={18} cls="as-t-red" />
          <Arc cx={95} cy={95} r={78} w={18} len={100} cls="as-s-red" />
          <text className="as-svg-num" x="95" y="104" textAnchor="middle" fontSize="34" fill="#FFE1E4">4/4</text>
        </svg>
        <div className="as-dots">
          {[1, 1, 0, 1, 0, 1].map((on, i) => (
            <span key={i} className={on ? "is-on" : undefined} />
          ))}
        </div>
      </div>

      <div className="as-tile as-macro">
        <Cap title={tr("سوخت امروز", "Today's fuel")} sub={tr("پروتئین · کربو · چربی", "Protein · carbs · fat")} />
        <svg width="250" height="90" viewBox="0 0 250 90">
          <Track cx={45} cy={45} r={34} w={9} cls="as-t-white" />
          <Arc cx={45} cy={45} r={34} w={9} len={84.1} cls="as-s-rose" />
          <Track cx={125} cy={45} r={34} w={9} cls="as-t-white" />
          <Arc cx={125} cy={45} r={34} w={9} len={60.7} cls="as-s-silver" delay={100} />
          <Track cx={205} cy={45} r={34} w={9} cls="as-t-white" />
          <Arc cx={205} cy={45} r={34} w={9} len={93.5} cls="as-s-salmon" delay={200} />
        </svg>
        <div className="as-num as-macro-val">
          1,659<small> / 2,400</small>
        </div>
      </div>

      <div className="as-tile as-letter" dir={dirOf(currentLocale())}>
        <Cap title={tr("آنالیز هفتگی", "Weekly analysis")} sub={tr("هفته‌نامه‌ی زنده", "The live weekly letter")} />
        <span className="as-num as-grade">A</span>
        <span className="as-headline">{tr("3 از 4 جلسه تمرین کردی و کالریت داخل هدف بود", "You trained 3 of 4 sessions and your calories stayed on target")}</span>
      </div>
    </div>
  );
}

function Strip() {
  return (
    <div className="as-mosaic as-mosaic-strip" dir="ltr">
      <div className="as-tile as-m-rings">
        <svg width="96" height="96" viewBox="0 0 230 230">
          <Arc cx={115} cy={115} r={98} w={22} len={82.8} cls="as-s-violet" />
          <Arc cx={115} cy={115} r={72} w={22} len={75.2} cls="as-s-green" delay={120} />
          <Arc cx={115} cy={115} r={46} w={22} len={79.6} cls="as-s-coral" delay={240} />
        </svg>
      </div>
      <div className="as-tile as-m-equity">
        <svg width="100%" height="100%" viewBox="0 0 608 220" preserveAspectRatio="none">
          <path className="as-fade" d={EQUITY_AREA} fill="rgba(46,168,255,0.18)" />
          <path className="as-line" d={EQUITY_LINE} fill="none" stroke="#2EA8FF" strokeWidth="6" vectorEffect="non-scaling-stroke" pathLength={100} strokeDasharray="100" />
        </svg>
      </div>
      <div className="as-tile as-m-gym">
        <svg width="84" height="84" viewBox="0 0 190 190">
          <Arc cx={95} cy={95} r={78} w={20} len={100} cls="as-s-red" />
          <text className="as-svg-num" x="95" y="108" textAnchor="middle" fontSize="40" fill="#FFE1E4">4/4</text>
        </svg>
      </div>
      <div className="as-tile as-m-flame">
        <svg width="34" height="42" viewBox="0 0 78 96">
          <path d={FLAME_OUTER} fill="#FF8A3D" />
        </svg>
        <span className="as-num as-m-flame-num">12</span>
      </div>
      <div className="as-tile as-m-sleep">
        <svg width="86" height="86" viewBox="0 0 170 170">
          <circle cx="85" cy="85" r="70" fill="#0E1434" />
          <path className="as-arc as-s-indigo" d="M85 15 A70 70 0 0 1 152 104" fill="none" strokeWidth="12" strokeLinecap="round" pathLength={100} strokeDasharray="100 100" style={{ "--as-len": 100 } as CSSProperties} />
          <circle cx="60" cy="60" r="2" fill="#fff" />
          <circle cx="110" cy="112" r="2" fill="#fff" />
        </svg>
      </div>
      <div className="as-tile as-m-letter">
        <span className="as-num as-m-grade">A</span>
      </div>
    </div>
  );
}

export default function AuthShowcase({ variant }: { variant: Variant }) {
  return (
    <div className={`as-root as-${variant}`} aria-hidden="true">
      {variant === "panel" ? <Panel /> : <Strip />}
    </div>
  );
}

export { AuthShowcase };
