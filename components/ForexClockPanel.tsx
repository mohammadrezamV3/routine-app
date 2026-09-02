"use client";

import { useEffect, useState } from "react";
import { FA_WEEKDAY, J_MONTHS, faNum, toJalali } from "@/lib/jalali";
import { arcForDef, isForexOpen, nextOpenForDef } from "@/lib/forexSessions";
import { CLOCK_SESSIONS } from "@/lib/forexClockSessions";
import { ForexSessionsDial } from "./ForexSessionsDial";
import { FlagCircle } from "./FlagCircle";

// ساعتِ بازارِ فارکس. کلِ منطقِ ساعت/DST از همان `lib/forexSessions.ts`
// می‌آید که برچسبِ جلسه‌ی هر معامله در ژورنال هم از آن ساخته می‌شود — پس
// «چیزی که ساعت نشان می‌دهد» با «چیزی که به معامله برچسب می‌خورد» فرق
// نمی‌کند. تیکِ هر ثانیه فقط رندر را تازه می‌کند؛ هیچ درخواستی نمی‌رود.

function durationLabel(target: Date, now: Date): string {
  const mins = Math.max(0, Math.round((target.getTime() - now.getTime()) / 60_000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  // همیشه ساعت:دقیقه — حتی وقتی کمتر از یک ساعت است («۰:۳۰»)، وگرنه
  // ردیف‌ها با هم هم‌شکل نمی‌مانند.
  return `${faNum(h)}:${faNum(String(m).padStart(2, "0"))}`;
}

function jalaliLabel(d: Date): string {
  const [, jm, jd] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${FA_WEEKDAY[d.getDay()]}، ${faNum(jd)} ${J_MONTHS[jm - 1]}`;
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
  const clock =
    `${String(now.getHours()).padStart(2, "0")}:` +
    `${String(now.getMinutes()).padStart(2, "0")}:` +
    `${String(now.getSeconds()).padStart(2, "0")}`;

  // بازها اول، و داخلِ هر گروه آنکه زودتر بسته/باز می‌شود بالاتر — همان
  // ترتیبی که مرجع دارد و همان چیزی که تریدر لازم دارد.
  const rows = CLOCK_SESSIONS.map((s) => {
    const arc = arcForDef(s, now);
    const open = arc.open && marketOpen;
    // چه وسطِ هفته و چه آخرِ هفته، همیشه یک زمانِ واقعی نشان می‌دهیم:
    // `nextOpenForDef` خودش شنبه/یکشنبه و بسته‌بودنِ بازار را رد می‌کند،
    // پس در تعطیلات هم عددِ درست (مثلاً ۵۰:۱۵ تا دوشنبه) درمی‌آید.
    const target = open ? arc.closeAt : nextOpenForDef(s, now);
    return { s, arc, open, target };
  }).sort((a, b) => {
    if (a.open !== b.open) return a.open ? -1 : 1;
    return (a.target?.getTime() ?? Infinity) - (b.target?.getTime() ?? Infinity);
  });

  return (
    <div className="fx-clock">
      <ForexSessionsDial now={now} />

      <div className="fx-meta">
        <span className="fx-meta-date">{jalaliLabel(now)}</span>
        <span className="fx-meta-time mono">{faNum(clock)}</span>
      </div>

      {!marketOpen && (
        <div className="fx-market-closed">بازار تعطیل است — آخر هفته</div>
      )}

      <div className="fx-cards">
        {rows.map(({ s, arc, open, target }) => (
          <div key={s.key} className={`fx-card${open ? " open" : ""}`}>
            <span className="fx-card-flag"><FlagCircle code={s.flagCode} /></span>

            <span className="fx-card-main">
              <span className="fx-card-city">
                {s.label}
                {s.displayOnly && <span className="fx-card-note">نمایشی</span>}
              </span>
              <span className="fx-card-hours mono">
                <bdi>{faNum(arc.openLabel)}</bdi> تا <bdi>{faNum(arc.closeLabel)}</bdi>
              </span>
            </span>

            <span className="fx-card-state">
              <span className="fx-card-label">{open ? "تا بسته شدن" : "تا باز شدن"}</span>
              <span className={`fx-card-value${open ? " open" : ""}`}>
                {target ? durationLabel(target, now) : "—"}
              </span>
            </span>
          </div>
        ))}
      </div>

      <div className="item-line empty" style={{ marginTop: 14 }}>
        ساعت‌ها به وقت محلی خودت است و باز و بسته شدن هر جلسه با احتساب ساعت
        تابستانی همان کشور حساب می‌شود.
      </div>
    </div>
  );
}
