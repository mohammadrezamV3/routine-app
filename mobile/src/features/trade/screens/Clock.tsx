import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import SessionsDial from "../components/SessionsDial";
import { FOREX_SESSIONS, sessionArcs, isForexOpen, upcomingSession, cityTime } from "../lib/forexSessions";

function fmtCountdown(ms: number): string {
  if (ms <= 0) return "اکنون";
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h} ساعت و ${m} دقیقه` : `${m} دقیقه`;
}

export default function Clock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const arcs = sessionArcs(now);
  const marketOpen = isForexOpen(now);
  const upcoming = upcomingSession(now);

  return (
    <div>
      <AppHeader title="ساعت فارکس" showBack />
      <div className="flex flex-col items-center gap-4 px-4 py-4">
        <div
          className="flex items-center gap-2 self-stretch rounded-card border px-4 py-2.5"
          style={{
            borderColor: "var(--surface-line)",
            background: marketOpen ? "var(--accent-dim)" : "rgba(224,82,82,0.14)",
          }}
        >
          <span
            className="rounded-full"
            style={{ width: 8, height: 8, background: marketOpen ? "var(--pnl-win)" : "var(--pnl-loss)" }}
          />
          <span className="font-vazir text-[13px] font-semibold" style={{ color: marketOpen ? "var(--pnl-win)" : "var(--pnl-loss)" }}>
            بازار فارکس هم‌اکنون {marketOpen ? "باز" : "بسته"} است
          </span>
        </div>

        <SessionsDial arcs={arcs} now={now} />

        <div className="grid w-full grid-cols-2 gap-2.5">
          {FOREX_SESSIONS.map((s) => {
            const arc = arcs.find((a) => a.key === s.key)!;
            return (
              <div
                key={s.key}
                className="flex flex-col gap-1 rounded-card border px-3.5 py-3"
                style={{ borderColor: "var(--surface-line)", background: "var(--surface-1)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-vazir text-[13px] font-semibold" style={{ color: "var(--text)" }}>
                    {s.flag} {s.label}
                  </span>
                  <span
                    className="rounded-full px-1.5 py-[1px] font-vazir text-[10px]"
                    style={{
                      background: arc.open ? "var(--accent-dim)" : "var(--surface-2)",
                      color: arc.open ? "var(--accent)" : "var(--muted)",
                    }}
                  >
                    {arc.open ? "باز" : "بسته"}
                  </span>
                </div>
                <span className="font-vazir text-[11.5px] tabular-nums" style={{ color: "var(--muted)" }}>
                  {cityTime(now, s.tz)} محلی · {arc.openLabel}–{arc.closeLabel}
                </span>
              </div>
            );
          })}
        </div>

        {upcoming && (
          <div className="w-full rounded-card border px-4 py-3" style={{ borderColor: "var(--surface-line)", background: "var(--surface-1)" }}>
            <span className="font-vazir text-[13px]" style={{ color: "var(--text)" }}>
              بازشدنِ بعدی: {FOREX_SESSIONS.find((s) => s.key === upcoming.key)?.label} — {fmtCountdown(upcoming.at.getTime() - now.getTime())} دیگر
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
