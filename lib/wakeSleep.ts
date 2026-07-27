import { getSetting, setSetting } from "./storage";

// ساعت بیداری/خواب هدف کاربر — به‌جای مقدار ثابت ۰۹:۳۰/۰۱:۳۰ برای همه، هر
// کاربر اولین بار که میره توی برنامه هفتگی ازش پرسیده می‌شه و از پنل کاربری
// قابل تغییره. null یعنی «هنوز تنظیم نشده» (برای تشخیص اولین ورود از مقدار
// پیش‌فرض واقعی) — مقدار پیش‌فرض فقط موقع استفاده اعمال می‌شه، نه موقع ذخیره.
export type WakeSleepTimes = { wake: string; sleep: string }; // "HH:mm"

export const DEFAULT_WAKE = "09:30";
export const DEFAULT_SLEEP = "01:30"; // بعد از نیمه‌شب

export async function getWakeSleepTimes(): Promise<WakeSleepTimes | null> {
  return getSetting<WakeSleepTimes | null>("wakeSleepTimes", null);
}

export async function setWakeSleepTimes(v: WakeSleepTimes): Promise<void> {
  return setSetting("wakeSleepTimes", v);
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function isWakeOnTime(wakeIso: string, wakeTargetMinutes: number): boolean {
  const d = new Date(wakeIso);
  const m = d.getHours() * 60 + d.getMinutes();
  return m <= wakeTargetMinutes;
}
