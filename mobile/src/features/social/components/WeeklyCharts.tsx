// نمودارهای سبکِ SVG برای گزارش هفتگی — بدون کتابخانه‌ی چارت.
// امتیازها همه ۰..۱۰۰اند؛ null یعنی «داده‌ای ثبت نشده» (با صفر فرق داره و
// به‌صورت میله‌ی خط‌چینِ کم‌رنگ نشون داده می‌شه، نه میله‌ی صفر).
import { faNum } from "@/lib/jalali";
import {
  SOCIAL_WEEKLY_DOMAIN_LABELS,
  type SocialWeeklyComparison,
  type SocialWeeklyDay,
  type SocialWeeklyDomain,
  type SocialWeeklyDomainScore,
} from "@/lib/social-contract";
import { barHeight, dayAverage, deltaOf, scoreColor } from "../logic";

/** نمودارِ میله‌ای روزانه (شنبه..جمعه) — میانگینِ دامنه‌های فعالِ هر روز */
export function DailyBarChart({ days }: { days: SocialWeeklyDay[] }) {
  const W = 320;
  const H = 140;
  const chartH = 100;
  const top = 12;
  const slot = W / Math.max(1, days.length);
  const barW = Math.min(26, slot * 0.55);
  const avgs = days.map(dayAverage);
  const summary = days
    .map((d, i) => `${d.weekday}: ${avgs[i] == null ? "بدون داده" : `${avgs[i]}٪`}`)
    .join("، ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`عملکرد روزانه — ${summary}`} style={{ direction: "ltr" }}>
      {[0, 50, 100].map((g) => {
        const y = top + chartH - (g / 100) * chartH;
        return <line key={g} x1={0} x2={W} y1={y} y2={y} stroke="var(--surface-line)" strokeWidth={1} strokeDasharray={g === 0 ? undefined : "3 4"} />;
      })}
      {/* راست‌به‌چپ: شنبه سمتِ راست */}
      {days.map((d, i) => {
        const x = W - (i + 0.5) * slot;
        const v = avgs[i];
        const h = barHeight(v, chartH);
        return (
          <g key={d.date}>
            {v == null ? (
              <rect x={x - barW / 2} y={top + chartH - 6} width={barW} height={6} rx={3} fill="none" stroke="var(--muted2)" strokeDasharray="2 2" />
            ) : (
              <rect x={x - barW / 2} y={top + chartH - Math.max(h, 3)} width={barW} height={Math.max(h, 3)} rx={5} fill={scoreColor(v)} />
            )}
            {v != null && (
              <text x={x} y={top + chartH - Math.max(h, 3) - 4} textAnchor="middle" fontSize={10} fill="var(--muted)" fontFamily="var(--font-vazir)">
                {faNum(v)}
              </text>
            )}
            <text x={x} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--muted)" fontFamily="var(--font-vazir)">
              {d.weekday.slice(0, 1)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** میله‌های افقیِ امتیازِ هر دامنه + مقایسه با هفته‌ی قبل */
export function DomainBars({
  domains,
  scores,
  comparison,
}: {
  domains: SocialWeeklyDomain[];
  scores: Record<SocialWeeklyDomain, SocialWeeklyDomainScore>;
  comparison: Record<SocialWeeklyDomain, SocialWeeklyComparison>;
}) {
  const rows = domains.filter((d) => scores[d]?.active);
  if (!rows.length) return null;
  return (
    <div className="flex flex-col gap-3">
      {rows.map((d) => {
        const s = scores[d];
        const delta = deltaOf(s.score, comparison?.[d]?.previousWeek ?? null);
        const pct = s.score == null ? 0 : Math.max(0, Math.min(100, s.score));
        return (
          <div key={d}>
            <div className="mb-1 flex items-center justify-between font-vazir text-[12.5px]">
              <span style={{ color: "var(--text)" }}>{SOCIAL_WEEKLY_DOMAIN_LABELS[d]}</span>
              <span style={{ color: "var(--muted)" }}>
                {s.score == null ? "بدون داده" : `${faNum(s.score)}٪`}
                {delta != null && delta !== 0 && (
                  <span style={{ color: delta > 0 ? "var(--pnl-win)" : "var(--pnl-loss)", marginInlineStart: 6 }}>
                    {delta > 0 ? "▲" : "▼"} {faNum(Math.abs(delta))}
                  </span>
                )}
              </span>
            </div>
            <svg viewBox="0 0 100 6" width="100%" height={8} preserveAspectRatio="none" aria-hidden="true">
              <rect x={0} y={0} width={100} height={6} rx={3} fill="var(--surface-line)" />
              {/* پر شدن از راست (RTL) */}
              <rect x={100 - pct} y={0} width={pct} height={6} rx={3} fill={scoreColor(s.score)} />
            </svg>
          </div>
        );
      })}
    </div>
  );
}
