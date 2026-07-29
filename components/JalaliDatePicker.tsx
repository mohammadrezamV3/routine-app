"use client";

import { useState } from "react";
import {
  FA_WEEKDAY_SHORT,
  CAL_WEEK_ORDER,
  J_MONTHS,
  faNum,
  jalaliMonthLength,
  jalaliToGregorianApprox,
  toJalali,
  JalaliDate,
} from "@/lib/jalali";

export function JalaliDatePicker({
  initial,
  onPick,
  onClose,
  disableFuture = false,
}: {
  initial: JalaliDate | null;
  onPick: (d: JalaliDate) => void;
  onClose: () => void;
  /** روزهای بعد از امروز رو غیرفعال می‌کنه — پیش‌فرض خاموشه چون این کامپوننت جاهای دیگه (تولد، بازه‌ی جست‌وجو) هم استفاده می‌شه */
  disableFuture?: boolean;
}) {
  const now = new Date();
  const jNow = toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const [view, setView] = useState<{ jy: number; jm: number }>(
    initial ? { jy: initial[0], jm: initial[1] } : { jy: jNow[0], jm: jNow[1] }
  );

  const monthLen = jalaliMonthLength(view.jm);
  const firstGDate = jalaliToGregorianApprox(view.jy, view.jm, 1);
  const firstJsDay = firstGDate.getDay();
  const leading = CAL_WEEK_ORDER.indexOf(firstJsDay);

  function isFuture(d: number): boolean {
    if (!disableFuture) return false;
    if (view.jy !== jNow[0]) return view.jy > jNow[0];
    if (view.jm !== jNow[1]) return view.jm > jNow[1];
    return d > jNow[2];
  }

  // انتخاب مستقیم سال/ماه — تا برای تاریخ‌های دور (مثل سال تولد) لازم نباشه
  // ده‌ها بار روی فلش «ماه قبل» کلیک بشه.
  const yearOptions: number[] = [];
  for (let y = jNow[0] + 5; y >= jNow[0] - 100; y--) yearOptions.push(y);

  const cells: JSX.Element[] = [];
  for (let i = 0; i < leading; i++) cells.push(<div key={"e" + i} className="jdate-cell empty" />);
  for (let d = 1; d <= monthLen; d++) {
    const isToday = view.jy === jNow[0] && view.jm === jNow[1] && d === jNow[2];
    const isSelected = initial && initial[0] === view.jy && initial[1] === view.jm && initial[2] === d;
    const future = isFuture(d);
    cells.push(
      <div
        key={d}
        className={`jdate-cell${isToday ? " today" : ""}${isSelected ? " selected" : ""}${future ? " disabled" : ""}`}
        onClick={() => !future && onPick([view.jy, view.jm, d])}
      >
        {d}
      </div>
    );
  }

  return (
    <>
      <div className="jdate-overlay open" onClick={onClose} />
      <div className="jdate-popup open">
        <div className="jdate-popup-head">
          <button type="button" className="jdate-popup-close" onClick={onClose} aria-label="بستن">×</button>
          <div className="jdate-popup-title-nav">
            <select
              className="jdate-select"
              value={view.jm}
              onChange={(e) => setView((v) => ({ ...v, jm: Number(e.target.value) }))}
              aria-label="ماه"
            >
              {J_MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select
              className="jdate-select"
              value={view.jy}
              onChange={(e) => setView((v) => ({ ...v, jy: Number(e.target.value) }))}
              aria-label="سال"
            >
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <div className="jdate-weekdays">
          {CAL_WEEK_ORDER.map((d) => <div key={d} className="jdate-weekday">{FA_WEEKDAY_SHORT[d]}</div>)}
        </div>
        <div className="jdate-grid">{cells}</div>
      </div>
    </>
  );
}
