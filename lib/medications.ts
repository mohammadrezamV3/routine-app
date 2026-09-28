import { getSetting, setSetting, setSettingChecked } from "./storage";
import { SETTING_KEYS } from "./userSettingKeys";

// یادآوری دارو.
//
// عمدا مدل Prisma جدا نگرفت و مثل `customOccurrences` روی همون
// UserSetting کلید/مقدار می‌شینه (`lib/storage.ts`) — یعنی قرارداد
// persistence پروژه بدون هیچ کار اضافه رعایت می‌شه: مهمان → localStorage،
// کاربر لاگین‌کرده → دیتابیس، و هیچ کامپوننتی نمی‌دونه داده از کجا میاد.

export type { Medication } from "./medicationSchedule";
export {
  MIN_TIMES_PER_DAY, MAX_TIMES_PER_DAY, doseTimeToMinutes, minutesToDoseTime, doseMinutesOfDay,
  doseIntervalHours, medicationEndDate, isMedicationActiveOn,
} from "./medicationSchedule";
import type { Medication } from "./medicationSchedule";
import { medicationEndDate } from "./medicationSchedule";

export const MEDICATIONS_KEY = SETTING_KEYS.medications;

export const MAX_MEDICATIONS = 20;
export const MAX_DURATION_DAYS = 365;

export async function getMedications(): Promise<Medication[]> {
  const list = await getSetting<Medication[]>(MEDICATIONS_KEY, []);
  return Array.isArray(list) ? list : [];
}

export async function setMedications(list: Medication[]): Promise<void> {
  return setSetting(MEDICATIONS_KEY, list.slice(0, MAX_MEDICATIONS));
}

/** نسخه‌ی موفقیتِ واقعی — برای فرمی که باید بداند ثبت واقعاً انجام شده یا نه. */
export async function setMedicationsChecked(list: Medication[]): Promise<{ ok: true } | { ok: false; error: string }> {
  return setSettingChecked(MEDICATIONS_KEY, list.slice(0, MAX_MEDICATIONS));
}

export function newMedicationId(): string {
  return "med-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** چند روز از دوره مونده (شامل امروز)؛ صفر یعنی دوره تموم شده */
export function medicationDaysLeft(med: Medication, todayIso: string): number {
  const end = medicationEndDate(med);
  if (todayIso > end) return 0;
  const from = todayIso < med.startDate ? med.startDate : todayIso;
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = end.split("-").map(Number);
  const diff = Math.round((new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()) / 86400000);
  return diff + 1;
}
