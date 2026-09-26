import { Capacitor } from "@capacitor/core";
import type { ThemeMode } from "./theme";

// StatusBar فقط روی native وجود داره؛ روی وب guard می‌کنیم.
export async function syncStatusBar(mode: ThemeMode) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: mode === "dark" ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({
      color: mode === "dark" ? "#0e1011" : "#f8e9d2",
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
