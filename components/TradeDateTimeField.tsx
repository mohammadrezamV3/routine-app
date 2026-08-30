"use client";

import { useState } from "react";
import { CalendarDays, X } from "lucide-react";
import { JalaliDatePicker } from "./JalaliDatePicker";
import { formatTimeDigits } from "@/lib/timeUtils";
import { isoLocal, jalaliToGregorianApprox, toJalali, faNum, J_MONTHS } from "@/lib/jalali";
import { G_MONTHS } from "@/lib/gregorian";
import { joinLocalInput, splitLocalInput } from "@/lib/tradeDateTime";
import type { CalSystem } from "@/lib/tradeTypes";

// فیلدِ «تاریخ و ساعت». عمداً تاریخ و ساعت با هم‌اند و ساعت اختیاری نیست:
// آمارِ جلسه‌ی معاملاتی (لندن/نیویورک/…) بدونِ ساعتِ واقعی اصلاً معنی ندارد،
// و نسخه‌ی قبلیِ ژورنال دقیقاً به همین دلیل همه‌ی معاملات را ساعتِ ۱۲:۰۰
// ثبت می‌کرد.
export function TradeDateTimeField({
  value,
  onChange,
  calSystem,
  allowClear = false,
  placeholder = "انتخاب تاریخ",
}: {
  value: string;                    // "YYYY-MM-DDTHH:mm" یا ""
  onChange: (v: string) => void;
  calSystem: CalSystem;
  allowClear?: boolean;
  placeholder?: string;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const { date, time } = splitLocalInput(value);

  function label(): string {
    if (!date) return placeholder;
    const [y, m, d] = date.split("-").map(Number);
    if (calSystem === "jalali") {
      const j = toJalali(y, m, d);
      return `${faNum(j[0])}/${faNum(String(j[1]).padStart(2, "0"))}/${faNum(String(j[2]).padStart(2, "0"))}`;
    }
    return `${faNum(d)} ${G_MONTHS[m - 1]} ${faNum(y)}`;
  }

  const initialJalali = date
    ? toJalali(+date.slice(0, 4), +date.slice(5, 7), +date.slice(8, 10))
    : null;

  return (
    <>
      <div className="trade-datetime-field">
        <button type="button" className="trade-datetime-btn" onClick={() => setPickerOpen(true)}>
          <CalendarDays size={15} />
          <span>{label()}</span>
        </button>
        <input
          className="trade-time-input mono"
          value={faNum(time)}
          onChange={(e) => onChange(joinLocalInput(date || isoLocal(new Date()), formatTimeDigits(e.target.value)))}
          placeholder="00:00"
          inputMode="numeric"
          aria-label="ساعت"
        />
        {allowClear && !!value && (
          <button type="button" className="trade-icon-btn" onClick={() => onChange("")} aria-label="پاک‌کردن"><X size={15} /></button>
        )}
      </div>

      {pickerOpen && (
        <JalaliDatePicker
          initial={initialJalali}
          title="تاریخ معامله"
          disableFuture
          onPick={(j) => {
            // JalaliDatePicker همیشه تاریخِ شمسی می‌دهد (حتی وقتی نمایشِ
            // بقیه‌ی صفحه میلادی است)، پس تبدیل همیشه از شمسی انجام می‌شود.
            const g = jalaliToGregorianApprox(j[0], j[1], j[2]);
            onChange(joinLocalInput(isoLocal(g), time || "00:00"));
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  );
}
