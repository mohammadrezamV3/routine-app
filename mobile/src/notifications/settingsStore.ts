// تنظیمِ جدا برای «یادآورِ روزانه‌ی ثبتِ وعده‌های غذایی» — عمدا جدا از سوییچِ
// اصلیِ اطلاع‌رسانی (که در MoreContext/SyncProvider است): این یکی فقط وقتی
// معنا داره که ماژولِ کالری باز باشه، پس نمی‌خواستیم SyncProvider (که همیشه
// eager لود می‌شه) رو سنگین‌تر کنیم. localStorage صرفا برای پرزیستنسِ محلیِ
// یک تنظیمِ device-only است، نه دیتای sync-شونده (طبق قراردادِ storage.ts —
// این یک setting سمتِ دستگاه است، نه دیتای کاربر).
const KEY = "arion:notif:calorieReminder";

function read(): boolean {
  try {
    const v = localStorage.getItem(KEY);
    return v === null ? true : v === "1"; // پیش‌فرض روشن، وقتی کالری باز شد
  } catch {
    return true;
  }
}

let cached = read();
const listeners = new Set<() => void>();

export function getCalorieReminderEnabled(): boolean {
  return cached;
}

export function setCalorieReminderEnabled(enabled: boolean): void {
  cached = enabled;
  try {
    localStorage.setItem(KEY, enabled ? "1" : "0");
  } catch {
    /* noop */
  }
  listeners.forEach((l) => l());
}

export function subscribeCalorieReminder(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
