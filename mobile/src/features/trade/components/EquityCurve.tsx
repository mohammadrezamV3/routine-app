interface Props {
  points: number[]; // بالانس تجمعی، به ترتیب زمان
  height?: number;
}

// منحنی equity به‌صورت یک SVG خطی سبک — بدون هیچ کتابخانه‌ی چارت (که در
// mobile/package.json موجود نیست)، فقط یک polyline نرمال‌شده به viewBox.
export default function EquityCurve({ points, height = 96 }: Props) {
  if (points.length < 2) {
    return (
      <div
        className="flex items-center justify-center rounded-card border"
        style={{ height, borderColor: "var(--surface-line)", background: "var(--surface-1)" }}
      >
        <span className="font-vazir text-[12.5px]" style={{ color: "var(--muted)" }}>
          برای رسم منحنی حداقل ۲ معامله‌ی بسته لازم است
        </span>
      </div>
    );
  }

  const width = 320;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);
  const y = (v: number) => height - 8 - ((v - min) / range) * (height - 16);

  const path = points.map((v, i) => `${i === 0 ? "M" : "L"} ${(i * stepX).toFixed(2)} ${y(v).toFixed(2)}`).join(" ");
  const last = points[points.length - 1];
  const first = points[0];
  const up = last >= first;
  const areaPath = `${path} L ${width} ${height} L 0 ${height} Z`;
  const color = up ? "var(--pnl-win)" : "var(--pnl-loss)";

  return (
    <div
      className="rounded-card border px-1 py-2"
      style={{ borderColor: "var(--surface-line)", background: "var(--surface-1)" }}
    >
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none">
        <path d={areaPath} fill={color} opacity={0.12} />
        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  );
}
