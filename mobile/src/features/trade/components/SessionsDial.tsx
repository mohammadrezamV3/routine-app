import type { SessionArc } from "../lib/forexSessions";

interface Props {
  arcs: SessionArc[];
  now: Date;
  size?: number;
}

const COLORS: Record<string, string> = {
  SYDNEY: "#A855F7",
  TOKYO: "#EC4899",
  LONDON: "#3E7BFA",
  NEWYORK: "#16C79A",
};

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// کمان دونات‌شکل بین دو زاویه (درجه)؛ اگر تقریبا یک دور کامل باشد یک
// gap ریز می‌گذاریم چون SVG کمان ۳۶۰ درجه‌ی دقیق را رسم نمی‌کند.
function ringArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  let sweep = endDeg - startDeg;
  if (sweep <= 0) sweep += 360;
  if (sweep >= 359.9) sweep = 359.9;
  const end = startDeg + sweep;
  const large = sweep > 180 ? 1 : 0;
  const p1 = polar(cx, cy, r, startDeg);
  const p2 = polar(cx, cy, r, end);
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${large} 1 ${p2.x} ${p2.y}`;
}

/** ساعت فارکس آفلاین — دایره‌ی ۲۴ساعته با چهار کمان جلسه، بدون هیچ درخواست شبکه. */
export default function SessionsDial({ arcs, now, size = 260 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const ringR = size / 2 - 26;
  const nowDeg = ((now.getHours() * 60 + now.getMinutes()) / 1440) * 360;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" height={size}>
      <circle cx={cx} cy={cy} r={ringR} fill="none" stroke="var(--surface-line)" strokeWidth={14} />
      {arcs.map((a, i) => {
        const startDeg = (a.startMin / 1440) * 360;
        const endDeg = ((a.startMin + a.durationMin) / 1440) * 360;
        const r = ringR - i * 0; // همه روی یک شعاع، رنگ‌ها با opacity از هم جدا می‌شوند
        return (
          <path
            key={a.key}
            d={ringArc(cx, cy, r, startDeg, endDeg)}
            fill="none"
            stroke={COLORS[a.key]}
            strokeWidth={a.open ? 14 : 8}
            strokeLinecap="round"
            opacity={a.open ? 1 : 0.45}
          />
        );
      })}
      {/* عقربه‌ی «الان» */}
      <line
        x1={cx}
        y1={cy}
        x2={polar(cx, cy, ringR + 14, nowDeg).x}
        y2={polar(cx, cy, ringR + 14, nowDeg).y}
        stroke="var(--text)"
        strokeWidth={2}
      />
      <circle cx={cx} cy={cy} r={4} fill="var(--text)" />
      {/* اعداد ساعت اصلی */}
      {[0, 6, 12, 18].map((h) => {
        const p = polar(cx, cy, ringR + 24, (h / 24) * 360);
        return (
          <text
            key={h}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={11}
            fill="var(--muted)"
          >
            {String(h).padStart(2, "0")}
          </text>
        );
      })}
    </svg>
  );
}
