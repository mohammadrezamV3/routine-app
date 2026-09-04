import { CustomOccurrence, getCustomOccurrences, setCustomOccurrences } from "@/lib/storage";
import { isoLocal } from "@/lib/jalali";
import { normalizeTimeToFa } from "@/lib/timeUtils";

export type RoadmapSchedule = {
  jsDays: number[];
  minutesPerDay: number;
  startTime: string; // "HH:MM"
};

export const ROADMAP_DAYS = [
  { jsDay: 6, label: "شنبه", short: "ش" },
  { jsDay: 0, label: "یکشنبه", short: "ی" },
  { jsDay: 1, label: "دوشنبه", short: "د" },
  { jsDay: 2, label: "سه‌شنبه", short: "س" },
  { jsDay: 3, label: "چهارشنبه", short: "چ" },
  { jsDay: 4, label: "پنجشنبه", short: "پ" },
  { jsDay: 5, label: "جمعه", short: "ج" },
];

/** "18:00" + ۹۰ دقیقه → "19:30" (بدونِ عبور از نیمه‌شب: سقفش ۲۳:۵۹ است) */
export function addMinutes(hhmm: string, minutes: number): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return hhmm;
  const total = Math.min(parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + minutes, 23 * 60 + 59);
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * جلسه‌های یک رودمپ را در «روتین من» می‌نشاند — یک برنامه‌ی هفتگی به‌ازای
 * هر روزِ انتخاب‌شده، از همین امروز به بعد.
 *
 * چرا از همان `customOccurrences` استفاده می‌کند و مخزنِ جدایی نمی‌سازد:
 * برنامه‌ی هفتگی، صفحه‌ی خانه، یادآوری‌ها و آمار همگی از همین یک مخزن
 * می‌خوانند. هر مخزنِ موازی یعنی رودمپ در نیمی از اپ نامرئی می‌ماند.
 */
export async function addRoadmapToRoutine(
  roadmapId: string,
  title: string,
  schedule: RoadmapSchedule
): Promise<void> {
  const existing = await getCustomOccurrences();
  // اگر همین رودمپ قبلاً نشانده شده، ردیف‌های قبلی‌اش جایگزین می‌شوند تا
  // ساختنِ دوباره‌ی برنامه، برنامه‌های تکراری نسازد.
  const kept = existing.filter((o) => o.roadmapId !== roadmapId);

  const start = normalizeTimeToFa(schedule.startTime);
  const end = normalizeTimeToFa(addMinutes(schedule.startTime, schedule.minutesPerDay));
  const today = isoLocal(new Date());

  const fresh: CustomOccurrence[] = schedule.jsDays.map((jsDay) => ({
    id: `rm-${roadmapId}-${jsDay}`,
    name: title,
    jsDay,
    time: `${start} – ${end}`,
    startDate: today,
    roadmapId,
  }));

  await setCustomOccurrences([...kept, ...fresh]);
}
