import { Capacitor } from "@capacitor/core";

// روی وب (پیش‌نمایش مرورگر یا CI) پلاگین هپتیک وجود نداره — این تابع
// no-op می‌مونه به‌جای throw کردن.
export async function tapHaptic() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    /* noop */
  }
}
