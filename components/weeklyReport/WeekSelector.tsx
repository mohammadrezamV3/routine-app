"use client";

import { ChevronRight, ChevronLeft } from "lucide-react";
import { toJalali, J_MONTHS } from "@/lib/jalali";

function jalaliRangeLabel(weekStartIso: string, weekEndIso: string): string {
  const s = new Date(weekStartIso);
  const e = new Date(weekEndIso);
  const [sy, sm, sd] = toJalali(s.getFullYear(), s.getMonth() + 1, s.getDate());
  const [ey, em, ed] = toJalali(e.getFullYear(), e.getMonth() + 1, e.getDate());
  if (sy === ey && sm === em) return `${sd} تا ${ed} ${J_MONTHS[sm - 1]} ${sy}`;
  if (sy === ey) return `${sd} ${J_MONTHS[sm - 1]} تا ${ed} ${J_MONTHS[em - 1]} ${sy}`;
  return `${sd} ${J_MONTHS[sm - 1]} ${sy} تا ${ed} ${J_MONTHS[em - 1]} ${ey}`;
}

// ناوبری بین هفته‌ها — دکمه‌ی «هفته‌ی بعد» فقط تا offset=0 (هفته‌ی جاری)
// فعاله، هفته‌ی آینده قابل‌انتخاب نیست (طبق اسپک).
export function WeekSelector({
  weekStartIso, weekEndIso, offset, onChange,
}: { weekStartIso: string; weekEndIso: string; offset: number; onChange: (next: number) => void }) {
  return (
    <div className="wr-week-selector">
      <button type="button" className="wr-week-nav-btn" onClick={() => onChange(offset - 1)} aria-label="هفته‌ی قبل">
        <ChevronRight size={17} />
      </button>
      <div className="wr-week-label">
        <span className="wr-week-title">{offset === 0 ? "این هفته" : offset === -1 ? "هفته‌ی قبل" : `${jalaliRangeLabel(weekStartIso, weekEndIso)}`}</span>
        {offset !== 0 && <span className="wr-week-sub">{jalaliRangeLabel(weekStartIso, weekEndIso)}</span>}
      </div>
      <button type="button" className="wr-week-nav-btn" onClick={() => onChange(offset + 1)} disabled={offset >= 0} aria-label="هفته‌ی بعد">
        <ChevronLeft size={17} />
      </button>
    </div>
  );
}
