// بخشِ خالصِ lib/wakeSleep.ts (وب) — بدونِ storage.ts (چون اینجا از db/repo
// استفاده می‌کنیم، نه getSetting/setSetting سمتِ next-auth).

export type WakeSleepTimes = { wake: string; sleep: string }; // "HH:mm"

export const DEFAULT_WAKE = "09:30";
export const DEFAULT_SLEEP = "01:30"; // بعد از نیمه‌شب

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function isWakeOnTime(wakeIso: string, wakeTargetMinutes: number): boolean {
  const d = new Date(wakeIso);
  const m = d.getHours() * 60 + d.getMinutes();
  return m <= wakeTargetMinutes;
}
