// منطقِ خالصِ محاسبه‌ی startDate/endDate یک occurrence — پورت از
// AddProgramForm.tsx (ساختِ جدید: هفتگی/تک‌روزه/دوره) و EditOccurrenceForm.tsx
// (ویرایش: حفظِ نوعِ برنامه‌ی موجود به‌جای ریست‌کردنِ startDate به امروز) وب.
// جدا از AddOccurrenceSheet نگه داشته شده تا بدونِ رندرِ کامپوننت تست بشه.

export type OccurrenceDates = { startDate: string; endDate?: string };

/** startDate/endDate برای یک occurrence *تازه* — دقیقا سه حالتِ وب:
 *  تک‌روزه (startDate=endDate=همون روز)، دوره (بازه‌ی انتخاب‌شده)، یا
 *  هفتگی (فقط startDate=امروز، بدونِ endDate — تکرارِ نامحدود). */
export function datesForNewOccurrence(opts: {
  today: string;
  isOnce: boolean;
  onceIso: string;
  isPeriod: boolean;
  periodStartIso: string | null;
  periodEndIso: string | null;
}): OccurrenceDates {
  if (opts.isOnce) return { startDate: opts.onceIso, endDate: opts.onceIso };
  if (opts.isPeriod && opts.periodStartIso && opts.periodEndIso) {
    return { startDate: opts.periodStartIso, endDate: opts.periodEndIso };
  }
  return { startDate: opts.today };
}

/** startDate/endDate برای یک occurrence موجود که *ویرایش* می‌شه — نوعِ
 *  اصلی‌اش (تک‌روزه/دوره/هفتگی) از رویِ خودش (`orig`) نگه داشته می‌شه، نه
 *  این‌که به امروز ریست بشه:
 *  - تک‌روزه (orig.startDate === orig.endDate): همون روزِ هفته‌ی جدید ولی
 *    داخلِ همون هفته‌ی شنبه‌شروعِ orig.startDate (sameWeekIso).
 *  - دوره‌ای که تمام شده (endDate < today): دست‌نخورده می‌مونه.
 *  - وگرنه (هفتگی یا دوره‌ی جاری/آینده): startDate از امروز جلوتر نمی‌ره
 *    (چهارشنبه‌های گذشته نباید یهو برگردن)، endDate (اگه بوده) حفظ می‌شه. */
export function datesForEditedOccurrence(opts: {
  today: string;
  jsDay: number;
  orig: { startDate?: string; endDate?: string } | undefined;
  sameWeekIso: (iso: string, jsDay: number) => string;
}): OccurrenceDates {
  const { today, jsDay, orig, sameWeekIso } = opts;
  const isOneOff = !!orig?.startDate && orig.startDate === orig.endDate;
  if (isOneOff) {
    const iso = sameWeekIso(orig!.startDate!, jsDay);
    return { startDate: iso, endDate: iso };
  }
  if (orig?.endDate && orig.endDate < today) {
    return { startDate: orig.startDate ?? today, endDate: orig.endDate };
  }
  return {
    startDate: orig?.startDate && orig.startDate > today ? orig.startDate : today,
    ...(orig?.endDate ? { endDate: orig.endDate } : {}),
  };
}

/** اولین وقوعِ واقعیِ یک روزِ هفته داخلِ بازه‌ی [dates.startDate, dates.endDate] —
 *  عینِ firstOccurrence در AddProgramForm وب. برمی‌گردونه null اگه اون
 *  روزِ هفته اصلا داخلِ بازه (قبل از پایانش) اتفاق نمی‌افته. */
export function firstOccurrenceIso(
  jsDay: number,
  dates: OccurrenceDates,
  today: string,
  isoOfDate: (d: Date) => string
): string | null {
  const from = dates.startDate > today ? dates.startDate : today;
  const d = new Date(from + "T00:00:00");
  d.setDate(d.getDate() + ((jsDay - d.getDay() + 7) % 7));
  const iso = isoOfDate(d);
  if (dates.endDate && iso > dates.endDate) return null;
  return iso;
}
