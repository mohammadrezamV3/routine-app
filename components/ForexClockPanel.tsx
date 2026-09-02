"use client";

import { useEffect, useState } from "react";
import { faNum } from "@/lib/jalali";
import {
  FOREX_SESSIONS, SESSION_OVERLAPS, cityTime, isForexOpen, isSessionOpen,
  nextSessionOpen, sessionArcs,
} from "@/lib/forexSessions";
import { ForexSessionsDial, SESSION_HUE } from "./ForexSessionsDial";

// ساعتِ فارکس. کلِ منطقِ ساعت/DST از همان `lib/forexSessions.ts` می‌آید که
// برچسبِ جلسه‌ی هر معامله در ژورنال هم از آن ساخته می‌شود — پس هیچ‌وقت
// «چیزی که ساعت نشان می‌دهد» با «چیزی که به معامله برچسب می‌خورد» فرق
// نمی‌کند. تیکِ هر ثانیه فقط رندر را تازه می‌کند؛ هیچ درخواستی نمی‌رود.

function remaining(target: Date, now: Date): string {
  const mins = Math.max(0, Math.round((target.getTime() - now.getTime()) / 60_000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${faNum(h)}س ${faNum(String(m).padStart(2, "0"))}د` : `${faNum(m)}د`;
}

export function ForexClockPanel() {
  const [now, setNow] = useState<Date | null>(null);

  // مقدارِ اولیه عمداً بعد از mount ست می‌شود: ساعتِ سرور و مرورگر یکی
  // نیستند و رندرِ سمتِ سرور با ساعتِ سرور، هیدریت را mismatch می‌کند.
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!now) return <div className="fx-dial-wrap" aria-hidden="true" />;

  const marketOpen = isForexOpen(now);
  const arcs = sessionArcs(now);
  const activeOverlaps = SESSION_OVERLAPS.filter(
    (o) => isSessionOpen(o.a, now) && isSessionOpen(o.b, now)
  );

  return (
    <div>
      <div className={`forex-market-state${marketOpen ? " open" : ""}`}>
        <span className="forex-dot" />
        {marketOpen ? "بازار باز است" : "بازار بسته است (آخر هفته)"}
      </div>

      <ForexSessionsDial now={now} />

      <div className="fx-legend">
        {arcs.map((a) => {
          const def = FOREX_SESSIONS.find((s) => s.key === a.key)!;
          // برای جلسه‌ی باز «تا بسته شدن»، برای بسته «تا باز شدن»
          const nextOpen = a.open ? null : nextSessionOpen(a.key, now);
          return (
            <div key={a.key} className={`fx-legend-row${a.open ? " open" : ""}`}>
              <span className="fx-legend-key" style={{ background: SESSION_HUE[a.key] }} />
              <span className="fx-legend-main">
                <span className="fx-legend-name">{a.label}</span>
                <span className="fx-legend-hours">
                  {faNum(a.openLabel)} تا {faNum(a.closeLabel)}
                  <span style={{ opacity: 0.7 }}> · محلی {faNum(cityTime(now, def.tz))}</span>
                </span>
              </span>
              <span className="fx-legend-state">
                <span className="fx-legend-badge">
                  {!marketOpen ? "تعطیل" : a.open ? "تا بسته شدن" : "تا باز شدن"}
                </span>
                <div className="fx-legend-count">
                  {!marketOpen ? "—" : a.open ? remaining(a.closeAt, now) : nextOpen ? remaining(nextOpen, now) : "—"}
                </div>
              </span>
            </div>
          );
        })}
      </div>

      {!!activeOverlaps.length && (
        <div className="forex-overlap">
          {activeOverlaps.map((o) => (
            <div key={o.label} className="forex-overlap-row">
              <span className="forex-overlap-title">{o.label}</span>
              <span className="forex-overlap-badge">نقدینگی بالا</span>
            </div>
          ))}
        </div>
      )}

      <div className="item-line empty" style={{ marginTop: 14 }}>
        عقربه‌ها و کمان‌ها به وقت محلی خودت‌اند؛ ساعت باز و بسته شدن هر جلسه با
        احتساب ساعت تابستانی همان کشور حساب می‌شود.
      </div>
    </div>
  );
}
