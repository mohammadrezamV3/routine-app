// اعمال پالت روی DOM (فقط کلاینت): صفت‌های <html> + <style> پالت سفارشی + رنگ متای نوار وضعیت.
// سرور (layout.tsx) همین صفت‌ها رو از اولین بایت HTML می‌ذاره؛ این‌جا برای تغییر لحظه‌ای بدون ریلود.
import { customPaletteCss, paletteMetaColors, normalizeHex, type EffectivePalette } from "@/lib/palette";
import { readThemeFromDom, syncThemeColorMeta } from "@/lib/themeColor";

export const CUSTOM_STYLE_ID = "arion-palette-custom";

export function applyPaletteToDom(effective: EffectivePalette, set: boolean, custom: string | null): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-palette", effective);
  if (set) root.setAttribute("data-palette-set", "1");
  else root.removeAttribute("data-palette-set");

  const hex = normalizeHex(custom);
  if (effective === "custom" && hex) {
    let style = document.getElementById(CUSTOM_STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = CUSTOM_STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = customPaletteCss(hex);
    const meta = paletteMetaColors(hex);
    if (meta) root.setAttribute("data-palette-meta", `${meta.dark},${meta.light}`);
  } else {
    root.removeAttribute("data-palette-meta");
  }
  syncThemeColorMeta(readThemeFromDom());
}
