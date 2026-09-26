import { Capacitor } from "@capacitor/core";
import { THEME_COLORS, type ThemeName } from "@/lib/themeColor";

// StatusBar فقط روی native وجود داره؛ روی وب guard می‌کنیم.
// رنگ‌ها همون THEME_COLORSِ وب (متای theme-color) — یک منبع برای هر دو.
export async function syncStatusBar(mode: ThemeName) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: mode === "dark" ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({
      color: THEME_COLORS[mode],
    });
  } catch {
    /* noop */
  }
}

export async function hideSplash() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {
    /* noop */
  }
}
