// وضعیتِ «آیا آنبوردینگ قبلا دیده شده؟» — یک تنظیمِ صرفا سمتِ دستگاه، مثلِ
// notifications/settingsStore.ts: localStorage با try/catch (نه storage.ts،
// چون این دیتای کاربر نیست که باید بینِ دستگاه‌ها سینک بشه).
const KEY = "arion:onboarding:seen";

export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return true; // اگه localStorage در دسترس نیست، مزاحمِ کاربر نشو
  }
}

export function markOnboardingSeen(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* noop — دفعه‌ی بعد دوباره نشون داده می‌شه، مشکلی نیست */
  }
}
