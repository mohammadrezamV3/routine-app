import { getSetting, setSetting } from "./storage";
import { SETTING_KEYS } from "./userSettingKeys";
import { DEFAULT_LATENCY, normalizeLatency } from "./sleepCycles";

// زمان به خواب رفتن شخصی (دقیقه) برای محاسبه‌ی چرخه‌ها. مثل هدف خواب از
// lib/storage.ts می‌ره: مهمان → localStorage، کاربر → /api/settings/sleepLatency.
export async function getSleepLatency(): Promise<number> {
  const v = await getSetting<number | null>(SETTING_KEYS.sleepLatency, null).catch(() => null);
  return v == null ? DEFAULT_LATENCY : normalizeLatency(v);
}

export async function setSleepLatency(min: number): Promise<void> {
  await setSetting(SETTING_KEYS.sleepLatency, normalizeLatency(min));
}
