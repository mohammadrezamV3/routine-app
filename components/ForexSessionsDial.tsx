"use client";

import { useMemo } from "react";
import { faNum } from "@/lib/jalali";
import { arcForDef, isForexOpen } from "@/lib/forexSessions";
import { CLOCK_SESSIONS, ClockSessionKey } from "@/lib/forexClockSessions";

// صفحه‌ی ساعتِ بازارِ فارکس — بازسازیِ همان چیدمانِ مرجع، راست‌چین.
//
// ساختار از بیرون به داخل:
//   حلقه‌ی سرمه‌ای با اعدادِ ۱ تا ۲۴ → صفحه‌ی روشن → مقیاسِ دقیقه (۵ تا ۶۰)
//   → پره‌های شعاعی → پنج نوارِ جلسه با نامِ منحنی روی خودشان → عقربه‌ها.
//
// نکته‌ی مهم: خودِ صفحه **آینه نمی‌شود**. راست‌چین‌کردن به چیدمانِ متن و
// کارت‌ها مربوط است، نه به جهتِ چرخشِ ساعت؛ ساعتِ پادساعتگرد اشتباه است.
// اعداد فارسی‌اند و کلِ بخشِ زیرِ ساعت راست‌چین است.

const SIZE = 600;
const C = SIZE / 2;

const R_BEZEL_OUT = 292;
const R_BEZEL_IN = 252;
const R_HOUR_NUM = 272;
const R_MIN_NUM = 226;

/** شعاعِ نوارِ هر جلسه — از داخل به بیرون، همان ترتیبِ CLOCK_SESSIONS */
const RING_R: Record<ClockSessionKey, number> = {
  SYDNEY: 97,
  TOKYO: 124,
  FRANKFURT: 151,
  LONDON: 178,
  NEWYORK: 205,
};
const RING_W = 21;

const TAU = Math.PI * 2;
const f = (n: number) => n.toFixed(2);
/** دقیقه‌ی شبانه‌روز (از ۱۴۴۰) → زاویه، نیم‌شب بالا، چرخشِ ساعتگرد */
const angle24 = (min: number) => (min / 1440) * TAU - Math.PI / 2;
/** مقیاسِ ۶۰تایی (دقیقه/ثانیه) */
const angle60 = (v: number) => (v / 60) * TAU - Math.PI / 2;

const at = (a: number, r: number) => ({ x: C + r * Math.cos(a), y: C + r * Math.sin(a) });

function arcPath(fromMin: number, span: number, r: number) {
  const s = Math.min(span, 1439.9);
  const a = at(angle24(fromMin), r);
  const b = at(angle24(fromMin + s), r);
  return `M ${f(a.x)} ${f(a.y)} A ${r} ${r} 0 ${s > 720 ? 1 : 0} 1 ${f(b.x)} ${f(b.y)}`;
}

/**
 * مسیرِ خطِ کرسیِ نامِ جلسه. اگر وسطِ کمان در نیمه‌ی پایین باشد، مسیر
 * برعکس کشیده می‌شود وگرنه حروف وارونه می‌افتند.
 */
function labelPath(midMin: number, r: number) {
  const mid = angle24(midMin);
  const upsideDown = Math.sin(mid) > 0.06; // نیمه‌ی پایینِ صفحه
  const half = (55 / 360) * TAU;
  const a1 = at(mid - half, r);
  const a2 = at(mid + half, r);
  return upsideDown
    ? `M ${f(a2.x)} ${f(a2.y)} A ${r} ${r} 0 0 0 ${f(a1.x)} ${f(a1.y)}`
    : `M ${f(a1.x)} ${f(a1.y)} A ${r} ${r} 0 0 1 ${f(a2.x)} ${f(a2.y)}`;
}

export function ForexSessionsDial({ now }: { now: Date }) {
  const marketOpen = isForexOpen(now);

  const rings = useMemo(
    () => CLOCK_SESSIONS.map((s) => ({ session: s, arc: arcForDef(s, now) })),
    [now]
  );

  const h = now.getHours();
  const m = now.getMinutes();
  const sec = now.getSeconds();

  // عقربه‌ها روی سه مقیاسِ متفاوت، دقیقاً مثلِ مرجع:
  // ساعت روی حلقه‌ی ۲۴تایی، دقیقه و ثانیه روی مقیاسِ ۶۰تاییِ داخلی.
  const hourHand = at(angle24(h * 60 + m + sec / 60), 152);
  const minHand = at(angle60(m + sec / 60), 214);
  const secHand = at(angle60(sec), 228);
  const secTail = at(angle60(sec) + Math.PI, 42);

  return (
    <div className="fx-dial-wrap">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="fx-dial" role="img"
           aria-label={`ساعت بازار فارکس، ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`}>

        {/* حلقه‌ی بیرونیِ سرمه‌ای */}
        <circle cx={C} cy={C} r={(R_BEZEL_OUT + R_BEZEL_IN) / 2}
                className="fx-bezel" strokeWidth={R_BEZEL_OUT - R_BEZEL_IN} />

        {/* صفحه‌ی داخلی */}
        <circle cx={C} cy={C} r={R_BEZEL_IN} className="fx-face" />

        {/* اعدادِ ۱ تا ۲۴ روی حلقه */}
        {Array.from({ length: 24 }, (_, i) => {
          const hour = i + 1;
          const p = at(angle24(hour * 60), R_HOUR_NUM);
          return (
            <text key={hour} x={f(p.x)} y={f(p.y)} className="fx-hour-num"
                  textAnchor="middle" dominantBaseline="central">
              {faNum(hour)}
            </text>
          );
        })}

        {/* تیکِ ریزِ لبه‌ی داخلیِ حلقه */}
        {Array.from({ length: 24 }, (_, i) => {
          const a = angle24((i + 0.5) * 60);
          const p1 = at(a, R_BEZEL_IN + 3);
          const p2 = at(a, R_BEZEL_IN + 9);
          return <line key={i} x1={f(p1.x)} y1={f(p1.y)} x2={f(p2.x)} y2={f(p2.y)} className="fx-bezel-tick" />;
        })}

        {/* پره‌های شعاعی */}
        {Array.from({ length: 60 }, (_, i) => {
          const a = angle60(i);
          const p1 = at(a, 52);
          const p2 = at(a, R_BEZEL_IN - 42);
          return <line key={i} x1={f(p1.x)} y1={f(p1.y)} x2={f(p2.x)} y2={f(p2.y)}
                       className={i % 5 === 0 ? "fx-spoke major" : "fx-spoke"} />;
        })}

        {/* مقیاسِ دقیقه */}
        {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60].map((v) => {
          const p = at(angle60(v), R_MIN_NUM);
          return (
            <text key={v} x={f(p.x)} y={f(p.y)} className="fx-min-num"
                  textAnchor="middle" dominantBaseline="central">
              {faNum(v)}
            </text>
          );
        })}

        {/* نوارِ جلسه‌ها + نامِ منحنی روی خودشان */}
        <defs>
          {rings.map(({ session, arc }) => (
            <path key={session.key} id={`fx-lbl-${session.key}`}
                  d={labelPath(arc.startMin + arc.durationMin / 2, RING_R[session.key])} />
          ))}
        </defs>

        {rings.map(({ session, arc }) => (
          <g key={session.key}>
            <path
              d={arcPath(arc.startMin, arc.durationMin, RING_R[session.key])}
              className={`fx-band${arc.open && marketOpen ? " open" : ""}`}
              strokeWidth={RING_W}
            />
            {/* dominantBaseline:central روی متنِ ساده (اعدادِ ساعت/دقیقه)
                درست کار می‌کند، ولی برای متنِ سوارشده روی یک <textPath>
                نادیده گرفته می‌شود (تأییدشده با اندازه‌گیریِ واقعیِ
                getBoundingClientRect) — این‌جا لیبل کاملاً بالای خودِ
                منحنی می‌نشست، نه رویش. dy=".35em" (معادلِ نصفِ x-height،
                ترفندِ استانداردِ centeringِ عمودیِ متنِ SVG وقتی
                dominant-baseline در دسترس نیست) واقعاً رویِ خودِ منحنی
                می‌نشاندش. */}
            <text className="fx-band-label" dy=".35em">
              <textPath href={`#fx-lbl-${session.key}`} startOffset="50%" textAnchor="middle">
                {session.latin}
              </textPath>
            </text>
          </g>
        ))}

        {/* عقربه‌ها */}
        <line x1={C} y1={C} x2={f(hourHand.x)} y2={f(hourHand.y)} className="fx-hand-hour" />
        <line x1={C} y1={C} x2={f(minHand.x)} y2={f(minHand.y)} className="fx-hand-min" />
        <line x1={f(secTail.x)} y1={f(secTail.y)} x2={f(secHand.x)} y2={f(secHand.y)} className="fx-hand-sec" />
        <circle cx={C} cy={C} r={11} className="fx-hub" />
        <circle cx={C} cy={C} r={4} className="fx-hub-dot" />
      </svg>
    </div>
  );
}
