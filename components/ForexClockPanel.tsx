"use client";

import { useEffect, useState } from "react";
import { faNum } from "@/lib/jalali";
import {
  FOREX_SESSIONS, SESSION_OVERLAPS, cityTime, isForexOpen, isSessionOpen,
} from "@/lib/forexSessions";

// ساعتِ فارکس. کلِ منطقِ ساعت/DST از همان `lib/forexSessions.ts` می‌آید که
// برچسبِ جلسه‌ی هر معامله در ژورنال هم از آن ساخته می‌شود — پس هیچ‌وقت
// «چیزی که ساعت نشان می‌دهد» با «چیزی که به معامله برچسب می‌خورد» فرق
// نمی‌کند. تیکِ هر ثانیه فقط رندر را تازه می‌کند؛ هیچ درخواستی نمی‌رود.
export function ForexClockPanel() {
  const [now, setNow] = useState<Date | null>(null);

  // مقدارِ اولیه عمداً بعد از mount ست می‌شود: ساعتِ سرور و مرورگر یکی
  // نیستند و رندرِ سمتِ سرور با ساعتِ سرور، هیدریت را mismatch می‌کند.
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!now) return null;

  const marketOpen = isForexOpen(now);
  const openSessions = FOREX_SESSIONS.filter((s) => isSessionOpen(s.key, now));
  const activeOverlaps = SESSION_OVERLAPS.filter(
    (o) => isSessionOpen(o.a, now) && isSessionOpen(o.b, now)
  );

  return (
    <div>
      <div className={`forex-market-state${marketOpen ? " open" : ""}`}>
        <span className="forex-dot" />
        {marketOpen ? "بازار باز است" : "بازار بسته است (آخر هفته)"}
      </div>

      <div className="forex-grid">
        {FOREX_SESSIONS.map((s) => {
          const open = isSessionOpen(s.key, now);
          return (
            <div key={s.key} className={`trade-surface forex-card${open ? " open" : ""}`}>
              <div className="forex-card-head">
                <span className="forex-flag">{s.flag}</span>
                <span className="forex-city">{s.label}</span>
              </div>
              <div className="forex-time mono">{faNum(cityTime(now, s.tz))}</div>
              <div className="forex-status">
                <span className="forex-dot" />
                {open ? "باز" : "بسته"}
              </div>
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

      <div className="item-line" style={{ marginTop: 18 }}>
        {openSessions.length
          ? <>جلسه‌های باز: <b>{openSessions.map((s) => s.label).join("، ")}</b></>
          : "الان هیچ جلسه‌ی اصلی‌ای باز نیست."}
      </div>
      <div className="item-line empty" style={{ marginTop: 6 }}>
        ساعت‌ها به وقت محلی هر شهر و با احتساب ساعت تابستانی همان کشور محاسبه می‌شوند.
      </div>
    </div>
  );
}
