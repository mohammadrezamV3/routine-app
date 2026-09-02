"use client";

import { useMemo } from "react";
import { faNum } from "@/lib/jalali";
import {
  SESSION_LABELS, SESSION_OVERLAPS, SessionArc, SessionKey,
  isForexOpen, isSessionOpen, sessionArcs, upcomingSession, viewerMinutes,
} from "@/lib/forexSessions";

// ساعتِ ۲۴ساعته‌ی جلسه‌های فارکس.
//
// چرا به وقتِ محلیِ خودِ کاربر و نه UTC: سؤالِ واقعیِ تریدر «لندن ساعت چند
// به وقتِ من باز می‌شود» است، نه «۰۷:۰۰ UTC». همه‌ی کمان‌ها از همان موتورِ
// DST-آگاهِ `lib/forexSessions.ts` می‌آیند که برچسبِ جلسه‌ی هر معامله در
// ژورنال هم از آن ساخته می‌شود — پس آنچه این ساعت نشان می‌دهد هیچ‌وقت با
// آنچه به معامله برچسب می‌خورد فرق نمی‌کند.
//
// چرا فقط یک عقربه: روی صفحه‌ی ۲۴ساعته، عقربه‌ی دقیقه‌شمارِ ۶۰تایی معنا
// ندارد و فقط گمراه می‌کند (۳۰ دقیقه و ساعت ۱۲ هر دو یک زاویه می‌شوند).
// همین یک عقربه ساعت و دقیقه را با هم و دقیق نشان می‌دهد، چون پیوسته
// حرکت می‌کند (۰٫۲۵ درجه در هر دقیقه). ثانیه در مرکز، عددی.

const SIZE = 440;
const C = SIZE / 2;

// شعاعِ هر حلقه. نیویورک بیرونی‌ترین است چون بیشترین نگاه را می‌گیرد.
const RING: Record<SessionKey, number> = {
  NEWYORK: 158,
  LONDON: 140,
  TOKYO: 122,
  SYDNEY: 104,
};
const RING_W = 12;
const BAND_OUT = RING.NEWYORK + RING_W / 2;
const BAND_IN = RING.SYDNEY - RING_W / 2;

// رنگِ هر جلسه — چهار فامِ خویشتن‌دار که روی زمینه‌ی تیره از هم جدا می‌شوند.
// «باز/بسته» با پررنگی و درخشش نشان داده می‌شود نه با عوض‌کردنِ فام، وگرنه
// دیگر نمی‌شد فهمید کدام حلقه مالِ کدام جلسه است.
export const SESSION_HUE: Record<SessionKey, string> = {
  SYDNEY: "#4FC3A1",
  TOKYO: "#E0645C",
  LONDON: "#6E8FE0",
  NEWYORK: "#E0A452",
};

const TAU = Math.PI * 2;
/** دقیقه‌ی شبانه‌روز → زاویه، با نیم‌شب در بالا و چرخشِ ساعتگرد */
const angleOf = (min: number) => (min / 1440) * TAU - Math.PI / 2;
const pt = (min: number, r: number) => {
  const a = angleOf(min);
  return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) };
};
const f = (n: number) => n.toFixed(2);

/** کمانِ دایره‌ای بینِ دو دقیقه، روی شعاعِ مشخص */
function arcPath(fromMin: number, span: number, r: number) {
  // یک کمانِ ۳۶۰ درجه با یک A قابلِ رسم نیست — کمی کوتاهش می‌کنیم
  const s = Math.min(span, 1439.9);
  const a = pt(fromMin, r);
  const b = pt(fromMin + s, r);
  return `M ${f(a.x)} ${f(a.y)} A ${r} ${r} 0 ${s > 720 ? 1 : 0} 1 ${f(b.x)} ${f(b.y)}`;
}

/** گوه‌ی بینِ دو دقیقه، فقط در نوارِ حلقه‌ها (نه تا مرکز) */
function wedgePath(fromMin: number, toMin: number) {
  const span = toMin - fromMin;
  const large = span > 720 ? 1 : 0;
  const p1 = pt(fromMin, BAND_IN);
  const p2 = pt(fromMin, BAND_OUT);
  const p3 = pt(toMin, BAND_OUT);
  const p4 = pt(toMin, BAND_IN);
  return `M ${f(p1.x)} ${f(p1.y)} L ${f(p2.x)} ${f(p2.y)}
          A ${BAND_OUT} ${BAND_OUT} 0 ${large} 1 ${f(p3.x)} ${f(p3.y)}
          L ${f(p4.x)} ${f(p4.y)}
          A ${BAND_IN} ${BAND_IN} 0 ${large} 0 ${f(p1.x)} ${f(p1.y)} Z`;
}

/** بازه‌های همپوشانیِ دو جلسه در شبانه‌روز — با نمونه‌برداریِ دقیقه‌ای */
function overlapRanges(a: SessionArc, b: SessionArc): [number, number][] {
  const covers = (s: SessionArc, m: number) => (m - s.startMin + 2880) % 1440 < s.durationMin;
  const out: [number, number][] = [];
  let start: number | null = null;
  for (let m = 0; m <= 1440; m++) {
    const both = m < 1440 && covers(a, m) && covers(b, m);
    if (both && start === null) start = m;
    if (!both && start !== null) {
      if (m - start > 4) out.push([start, m]);
      start = null;
    }
  }
  return out;
}

export function ForexSessionsDial({ now }: { now: Date }) {
  const arcs = useMemo(() => sessionArcs(now), [now]);
  const marketOpen = isForexOpen(now);
  const nowMin = viewerMinutes(now);

  const byKey = useMemo(
    () => Object.fromEntries(arcs.map((a) => [a.key, a])) as Record<SessionKey, SessionArc>,
    [arcs]
  );

  const overlaps = useMemo(
    () =>
      SESSION_OVERLAPS.flatMap((o) =>
        overlapRanges(byKey[o.a], byKey[o.b]).map((range) => ({
          range,
          label: o.label,
          live: marketOpen && isSessionOpen(o.a, now) && isSessionOpen(o.b, now),
        }))
      ),
    [byKey, marketOpen, now]
  );

  const openNow = arcs.filter((a) => a.open);
  const liveOverlap = overlaps.find((o) => o.live);
  const next = useMemo(() => (marketOpen ? upcomingSession(now) : null), [now, marketOpen]);

  const clock = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const seconds = String(now.getSeconds()).padStart(2, "0");

  // عقربه‌ی ۲۴ساعته: از مرکز تا لبه‌ی داخلیِ نوارِ حلقه‌ها، به‌علاوه‌ی یک
  // وزنه‌ی کوتاه پشتش. عمداً از روی کمان‌ها رد نمی‌شود تا شلوغشان نکند؛
  // به‌جایش نشانگرِ «الان» جدا روی خودِ نوار کشیده می‌شود.
  const handTip = pt(nowMin, BAND_IN - 6);
  const handTail = pt(nowMin + 720, 15);
  const markIn = pt(nowMin, BAND_IN);
  const markOut = pt(nowMin, BAND_OUT);

  return (
    <div className="fx-dial-wrap">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="fx-dial" role="img"
           aria-label={`ساعت جلسه‌های فارکس، ${clock}`}>
        <defs>
          {(Object.keys(SESSION_HUE) as SessionKey[]).map((k) => (
            <filter key={k} id={`fx-glow-${k}`} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3.5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          ))}
          <radialGradient id="fx-core" cx="50%" cy="50%" r="50%">
            <stop offset="55%" stopColor="rgba(var(--accent-rgb),0)" />
            <stop offset="100%" stopColor="rgba(var(--accent-rgb),.07)" />
          </radialGradient>
        </defs>

        <circle cx={C} cy={C} r={BAND_IN - 10} fill="url(#fx-core)" />
        <circle cx={C} cy={C} r={196} className="fx-face" />
        <circle cx={C} cy={C} r={BAND_IN - 10} className="fx-face-inner" />

        {/* تیکِ هر ساعت، بلندتر هر ۳ ساعت */}
        {Array.from({ length: 24 }, (_, h) => {
          const major = h % 3 === 0;
          const a = pt(h * 60, major ? 188 : 192);
          const b = pt(h * 60, 196);
          return (
            <line key={h} x1={f(a.x)} y1={f(a.y)} x2={f(b.x)} y2={f(b.y)}
                  className={major ? "fx-tick major" : "fx-tick"} />
          );
        })}

        {/* عددِ ساعت‌های اصلی */}
        {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => {
          const p = pt(h * 60, 176);
          return (
            <text key={h} x={f(p.x)} y={f(p.y)} className="fx-hour-num"
                  textAnchor="middle" dominantBaseline="central">
              {faNum(String(h).padStart(2, "0"))}
            </text>
          );
        })}

        {/* گوه‌ی همپوشانی — پشتِ حلقه‌ها تا شلوغشان نکند */}
        {overlaps.map((o, i) => (
          <path key={i} className={`fx-overlap${o.live ? " live" : ""}`}
                d={wedgePath(o.range[0], o.range[1])} />
        ))}

        {/* شیارِ هر حلقه، بعد خودِ کمانِ جلسه */}
        {arcs.map((a) => (
          <circle key={`t-${a.key}`} cx={C} cy={C} r={RING[a.key]}
                  className="fx-ring-track" strokeWidth={RING_W} />
        ))}
        {arcs.map((a) => (
          <path
            key={a.key}
            d={arcPath(a.startMin, a.durationMin, RING[a.key])}
            className={`fx-arc${a.open ? " open" : ""}`}
            stroke={SESSION_HUE[a.key]}
            strokeWidth={RING_W}
            filter={a.open ? `url(#fx-glow-${a.key})` : undefined}
          />
        ))}

        {/* نشانگرِ «الان»: یک خطِ نازک که فقط نوارِ حلقه‌ها را قطع می‌کند —
            در یک نگاه می‌گوید این لحظه داخلِ کدام جلسه‌هاست */}
        <line x1={f(markIn.x)} y1={f(markIn.y)} x2={f(markOut.x)} y2={f(markOut.y)}
              className="fx-now-halo" />
        <line x1={f(markIn.x)} y1={f(markIn.y)} x2={f(markOut.x)} y2={f(markOut.y)}
              className="fx-now" />
        <circle cx={f(markOut.x)} cy={f(markOut.y)} r={2.6} className="fx-now-dot" />

        {/* عقربه‌ی ۲۴ساعته */}
        <line x1={f(handTail.x)} y1={f(handTail.y)} x2={f(handTip.x)} y2={f(handTip.y)}
              className="fx-hand" />
        <circle cx={C} cy={C} r={5} className="fx-hub" />
        <circle cx={C} cy={C} r={1.8} className="fx-hub-dot" />
      </svg>

      {/* مرکز — بیرون از SVG تا تایپوگرافی همان تایپوگرافیِ اپ باشد */}
      <div className="fx-center">
        <div className="fx-center-time mono">
          {faNum(clock)}
          <span className="fx-center-sec">{faNum(seconds)}</span>
        </div>
        <div className={`fx-center-state${openNow.length ? " live" : ""}`}>
          {!marketOpen
            ? "بازار بسته است"
            : liveOverlap
              ? liveOverlap.label
              : openNow.length
                ? openNow.map((s) => s.label).join(" · ")
                : "بین دو جلسه"}
        </div>
        {next && (
          <div className="fx-center-next">
            {SESSION_LABELS[next.key]} تا {faNum(untilLabel(next.at, now))} دیگر
          </div>
        )}
      </div>
    </div>
  );
}

function untilLabel(at: Date, now: Date): string {
  const mins = Math.max(0, Math.round((at.getTime() - now.getTime()) / 60_000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h} ساعت و ${m} دقیقه` : `${m} دقیقه`;
}
