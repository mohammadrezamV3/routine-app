"use client";

import "./sleep-log.css";
import { useMemo, useState } from "react";
import { History, Star, Tag } from "lucide-react";
import { FA_WEEKDAY, J_MONTHS, faNum, toJalali } from "@/lib/jalali";
import { clockOf, durationLabel, scoreBand, sleepMinutes, type SleepInsights, type SleepRecord } from "@/lib/sleep";

// فهرست شب‌های ثبت‌شده: تازه‌ترین بالا، هفت‌تا هفت‌تا باز می‌شه؛ کلیک روی هر
// ردیف همون شب رو برای ویرایش باز می‌کنه. ردیف‌ها دکمه‌ی بی‌بک‌گراندن.

export type SleepHistoryListProps = {
  /** مرتب‌شده بر اساس تاریخ (قدیمی → جدید) */
  entries: SleepRecord[];
  insights: SleepInsights;
  onEdit: (rec: SleepRecord) => void;
};

const PAGE = 7;

function jalaliLabel(iso: string): { day: string; weekday: string } {
  const [y, m, d] = iso.split("-").map(Number);
  const [, jm, jd] = toJalali(y, m, d);
  return { day: `${faNum(jd)} ${J_MONTHS[jm - 1]}`, weekday: FA_WEEKDAY[new Date(y, m - 1, d).getDay()] };
}

export function SleepHistoryList({ entries, insights, onEdit }: SleepHistoryListProps) {
  const [shown, setShown] = useState(PAGE);
  const scoreByDate = useMemo(() => {
    const m = new Map<string, number>();
    insights.scores.forEach((s) => m.set(s.date, s.score));
    return m;
  }, [insights.scores]);
  const rows = useMemo(() => entries.slice().reverse(), [entries]);
  const visible = rows.slice(0, shown);

  return (
    <section className="sl-card sleep-scope slh">
      <div className="sl-head-row">
        <h3 className="sl-card-title"><History aria-hidden /> شب‌های اخیر</h3>
        {rows.length > 0 && <span className="sl-sub">{faNum(rows.length)} شب</span>}
      </div>

      {rows.length === 0 ? (
        <p className="sl-sub slh-empty">هنوز شبی ثبت نشده؛ اولین خوابت رو ثبت کن.</p>
      ) : (
        <div className="slh-list">
          {visible.map((rec) => {
            const lbl = jalaliLabel(rec.date);
            const score = scoreByDate.get(rec.date);
            const band = score != null ? scoreBand(score) : null;
            const tagCount = rec.tags?.length ?? 0;
            return (
              <button type="button" key={rec.date} className="slh-row" onClick={() => onEdit(rec)}>
                <span className="slh-date">
                  <b>{lbl.day}</b>
                  <small>{lbl.weekday}</small>
                </span>
                <span className="slh-mid">
                  <span className="slh-clocks">{faNum(clockOf(rec.sleptAt))} ← {faNum(clockOf(rec.wokeAt))}</span>
                  <span className="slh-meta">
                    <span>{durationLabel(sleepMinutes(rec))}</span>
                    {rec.quality ? <span className="slh-ic" title="کیفیت"><Star size={12} aria-hidden />{faNum(rec.quality)}</span> : null}
                    {tagCount > 0 ? <span className="slh-ic" title="عوامل"><Tag size={12} aria-hidden />{faNum(tagCount)}</span> : null}
                  </span>
                </span>
                <span className={`slh-score${band ? ` slp-c-${band}` : ""}`}>{score != null ? faNum(score) : "-"}</span>
              </button>
            );
          })}
        </div>
      )}

      {rows.length > shown && (
        <button type="button" className="account-outline-btn slh-more" onClick={() => setShown((n) => n + PAGE)}>
          بیشتر
        </button>
      )}
    </section>
  );
}
