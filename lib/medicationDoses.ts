import { addDaysIso } from "./sleep";
import {
  doseMinutesOfDay, isMedicationActiveOn, minutesToDoseTime, type Medication,
} from "./medicationSchedule";

// نوبت‌های دارویی امروز و تیک «خوردم». مثل خود داروها روی UserSetting
// منطق خالص نوبت‌ها و تیک‌هاست؛ خواندن/نوشتن در lib/medicationDoseStore.ts.

export type DoseLog = Record<string, string[]>;
export type DoseSlot = { key: string; medId: string; name: string; note?: string; time: string; minutes: number };

/** روزهای اخیری که تیک‌ها نگه داشته می‌شن */
export const DOSE_LOG_DAYS = 14;

export const doseKey = (medId: string, minutes: number) => `${medId}@${minutesToDoseTime(minutes)}`;

/** همه‌ی نوبت‌های یک روز از داروهای فعال، به ترتیب ساعت */
export function dosesOnDay(meds: Medication[], iso: string): DoseSlot[] {
  const out: DoseSlot[] = [];
  for (const m of meds) {
    if (!isMedicationActiveOn(m, iso)) continue;
    for (const minutes of doseMinutesOfDay(m)) {
      out.push({ key: doseKey(m.id, minutes), medId: m.id, name: m.name, note: m.note, time: minutesToDoseTime(minutes), minutes });
    }
  }
  return out.sort((a, b) => a.minutes - b.minutes || a.name.localeCompare(b.name));
}

/** تیک یا برداشتن تیک یک نوبت؛ روزهای قدیمی‌تر از DOSE_LOG_DAYS حذف می‌شن */
export function toggleDose(log: DoseLog, iso: string, key: string): DoseLog {
  const cur = log[iso] ?? [];
  const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key];
  const out: DoseLog = { ...log, [iso]: next };
  if (!next.length) delete out[iso];
  const oldest = addDaysIso(iso, -(DOSE_LOG_DAYS - 1));
  for (const d of Object.keys(out)) if (d < oldest) delete out[d];
  return out;
}

/** نوبت بعدی که هنوز تیک نخورده: اولین نوبت نخورده از ساعت فعلی به بعد، وگرنه اولین نخورده */
export function nextPendingDose(slots: DoseSlot[], taken: string[], nowMin: number): DoseSlot | null {
  const pending = slots.filter((s) => !taken.includes(s.key));
  return pending.find((s) => s.minutes >= nowMin) ?? pending[0] ?? null;
}
