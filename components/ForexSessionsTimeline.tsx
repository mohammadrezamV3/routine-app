"use client";

import { useEffect, useState } from "react";
import { FOREX_SESSIONS, wallClockIn } from "@/lib/forexSessions";
import { toFaDigits } from "@/lib/schedule";

// چارتِ خطی (Gantt-مانند) سشن‌های فارکس رویِ محورِ ۲۴ساعته‌ی واحدِ «وقتِ
// ایران» — مکملِ ForexClockPanel که ساعتِ محلیِ خودِ هر شهر رو جدا جدا نشون
// می‌ده؛ این‌جا هدف مقایسه‌ی هم‌زمانِ چهار سشن رو یه محورِ مشترکه (دقیقاً
// طبقِ عکسِ مرجعِ کاربر)، با یه خطِ عمودیِ زنده برایِ موقعیتِ همین‌الان.
//
// بازه‌ی باز/بسته‌ی هر سشن از همون lib/forexSessions.ts (منبعِ واحدِ حقیقتِ
// DST، هم‌قاعده‌ی ForexClockPanel و برچسبِ جلسه‌ی ژورنال) میاد — فقط اینجا
// معکوسِ wallClockIn لازمه: «امروز، فلان دقیقه به‌وقتِ شهرِ X دقیقاً کدوم
// لحظه‌ی واقعیه؟» تا بشه همون لحظه رو به وقتِ ایران خوند.

function ymdInTz(date: Date, tz: string): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(date)
    .reduce((acc, p) => { if (p.type !== "literal") acc[p.type] = p.value; return acc; }, {} as Record<string, string>);
  return { y: +parts.year, m: +parts.month, d: +parts.day };
}

function tzOffsetMsAt(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(date).reduce((acc, p) => { if (p.type !== "literal") acc[p.type] = p.value; return acc; }, {} as Record<string, string>);
  const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour === 24 ? 0 : +parts.hour, +parts.minute, +parts.second);
  return asUTC - date.getTime();
}

/** «امروز، دقیقه‌ی minuteOfDay به‌وقتِ محلیِ tz» به یه Date واقعی (UTC) تبدیل می‌شه. */
function zonedTodayMinuteToUtc(baseDate: Date, tz: string, minuteOfDay: number): Date {
  const { y, m, d } = ymdInTz(baseDate, tz);
  const guess = new Date(Date.UTC(y, m - 1, d, Math.floor(minuteOfDay / 60), minuteOfDay % 60, 0));
  return new Date(guess.getTime() - tzOffsetMsAt(guess, tz));
}

const IRAN_TZ = "Asia/Tehran";
const SESSION_COLORS: Record<string, string> = {
  SYDNEY: "#55606B",
  TOKYO: "#8E9BAE",
  LONDON: "#E0566B",
  NEWYORK: "#3FAE6B",
};

function fmtHM(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return toFaDigits(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
}

const AXIS_HOURS = [0, 3, 6, 9, 12, 15, 18, 21];

export function ForexSessionsTimeline() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (!now) return null;

  const nowMin = wallClockIn(now, IRAN_TZ).minutes;

  const sessions = FOREX_SESSIONS.map((s) => {
    const startMin = wallClockIn(zonedTodayMinuteToUtc(now, s.tz, s.openMin), IRAN_TZ).minutes;
    const endMin = wallClockIn(zonedTodayMinuteToUtc(now, s.tz, s.closeMin), IRAN_TZ).minutes;
    return { key: s.key, label: s.label, color: SESSION_COLORS[s.key], startMin, endMin, wraps: endMin <= startMin };
  });

  return (
    <div className="trade-surface forex-timeline-card">
      <div className="forex-timeline-head">
        <span className="forex-timeline-title">مقایسه‌ی سشن‌ها روی محورِ زمانِ ایران</span>
        <span className="forex-timeline-now">الان: {fmtHM(nowMin)}</span>
      </div>

      <div className="forex-timeline-chart" dir="ltr">
        <div className="forex-timeline-axis">
          {AXIS_HOURS.map((h) => (
            <span key={h} className="forex-timeline-tick" style={{ left: `${(h / 24) * 100}%` }}>
              {toFaDigits(String(h).padStart(2, "0"))}
            </span>
          ))}
        </div>

        <div className="forex-timeline-body">
          {sessions.map((s) => (
            <div key={s.key} className="forex-timeline-row">
              <span className="forex-timeline-row-label" style={{ color: s.color }}>{s.label}</span>
              <div className="forex-timeline-track">
                {s.wraps ? (
                  <>
                    <div className="forex-timeline-bar" style={{ left: `${(s.startMin / 1440) * 100}%`, width: `${((1440 - s.startMin) / 1440) * 100}%`, background: s.color }} />
                    <div className="forex-timeline-bar" style={{ left: 0, width: `${(s.endMin / 1440) * 100}%`, background: s.color }} />
                  </>
                ) : (
                  <div className="forex-timeline-bar" style={{ left: `${(s.startMin / 1440) * 100}%`, width: `${((s.endMin - s.startMin) / 1440) * 100}%`, background: s.color }} />
                )}
              </div>
            </div>
          ))}

          <div className="forex-timeline-nowline" style={{ left: `${(nowMin / 1440) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
