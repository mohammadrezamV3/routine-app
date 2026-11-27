import { getSetting, setSetting } from "./storage";
import { SETTING_KEYS } from "./userSettingKeys";
import type { DoseLog } from "./medicationDoses";

// تیک نوبت‌های دارویی روی UserSetting (کلید medicationDoses) می‌شینه، مثل خود
// داروها: مهمان → localStorage، کاربر → دیتابیس؛ کامپوننت‌ها فرقی نمی‌بینن.

export async function getDoseLog(): Promise<DoseLog> {
  const v = await getSetting<DoseLog>(SETTING_KEYS.medicationDoses, {});
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}

export async function setDoseLog(log: DoseLog): Promise<void> {
  return setSetting(SETTING_KEYS.medicationDoses, log);
}
