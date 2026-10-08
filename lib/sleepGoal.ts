import { getSetting, setSetting } from "./storage";
import { getWakeSleepTimes, DEFAULT_SLEEP, DEFAULT_WAKE } from "./wakeSleep";
import { SETTING_KEYS } from "./userSettingKeys";

// هدف خواب — مال سیستم جدای خواب (/sleep)، مستقل از ساعت‌های روز در روتین.
// تا وقتی کاربر خودش تنظیمش نکرده، از ساعت بیداری/خواب روتین (wakeSleepTimes)
// شروع می‌شه تا صفحه از روز اول منطقی باشه؛ بعد از ذخیره دیگه کاملا مستقله.
// شکل همون { wake, sleep } با "HH:mm" تا همه‌ی توابع lib/sleep.ts بی‌تغییر بمونن.
export type SleepGoal = { wake: string; sleep: string };

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function getSleepGoal(): Promise<{ goal: SleepGoal; custom: boolean }> {
  const own = await getSetting<SleepGoal | null>(SETTING_KEYS.sleepGoal, null).catch(() => null);
  if (own && HHMM.test(own.wake) && HHMM.test(own.sleep)) return { goal: own, custom: true };
  const ws = await getWakeSleepTimes().catch(() => null);
  return { goal: { wake: ws?.wake || DEFAULT_WAKE, sleep: ws?.sleep || DEFAULT_SLEEP }, custom: false };
}

export async function setSleepGoal(g: SleepGoal): Promise<void> {
  if (!HHMM.test(g.wake) || !HHMM.test(g.sleep)) throw new Error("ساعت نامعتبر است");
  await setSetting(SETTING_KEYS.sleepGoal, g);
}
