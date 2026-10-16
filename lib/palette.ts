// تم رنگی سراسری اپ (تنظیمات > تم و رنگ): منطق خالص، بدون وابستگی به DOM — هم سرور (layout.tsx)
// هم کلاینت (PaletteProvider، صفحه‌ی تنظیمات) ازش استفاده می‌کنن و تست‌دار (__tests__/palette.test.ts).
//
// مدل: تنظیم کاربر `palette` یکی از PALETTE_IDS ـه. «auto» یعنی مثل قبل هر بخش (زیردامنه) پالت خودش
// رو داره (ترید/ورزش) و روتین و دامنه‌ی اصلی پالت پیش‌فرض. بقیه یعنی کاربر یک پالت رو برای کل اپ
// انتخاب کرده. «پالت موثر» (EffectivePalette = auto حل‌شده) روی <html data-palette> میاد و
// app/palette-themes.css با همون کلید توکن‌ها رو عوض می‌کنه.
//
// پالت‌های آماده‌ی تازه (amethyst/sunset/graphite) از روی چند رنگ کلیدی توسط tokensFromSpec کامل می‌شن و
// CSS ثابتشون (app/palette-themes.css) با paletteCss ساخته شده؛ تست مطمئن می‌شه فایل با خروجی این
// تابع هم‌خوانه. پالت سفارشی همون مسیر رو از روی یک رنگ می‌ره (paletteFromAccent) و CSS اون سمت سرور
// داخل یک <style> کوچک میاد. هیچ رشته‌ی کاربر وارد CSS نمی‌شه: فقط ارقام هگز اعتبارسنجی‌شده.

import type { SectionKey } from "@/lib/sections";

// ───────────────────────── شناسه‌ها و تنظیمات ─────────────────────────

export const PALETTE_IDS = ["auto", "routine", "trade", "workout", "amethyst", "sunset", "graphite", "custom"] as const;
export type PaletteSetting = (typeof PALETTE_IDS)[number];
/** پالتی که واقعا اعمال می‌شه (auto به پالت بخش یا روتین حل شده) */
export type EffectivePalette = Exclude<PaletteSetting, "auto">;

/** پالت‌هایی که فقط با این فایل ساخته می‌شن (CSS ثابت در app/palette-themes.css) */
export const GENERATED_PRESETS = ["amethyst", "sunset", "graphite"] as const;
export type GeneratedPreset = (typeof GENERATED_PRESETS)[number];

/** ترتیب نمایش کارت‌ها در صفحه‌ی تنظیمات */
export const PALETTE_ORDER: PaletteSetting[] = ["auto", "routine", "trade", "workout", "amethyst", "sunset", "graphite", "custom"];

/** کلیدهای تنظیمات کاربر (UserSetting / localStorage مهمان) */
export const PALETTE_SETTING_KEY = "palette";
export const PALETTE_CUSTOM_SETTING_KEY = "paletteCustom";
/** کوکی‌های مشترک بین زیردامنه‌ها (مهمان و سرور از همین‌ها می‌خونن) */
export const PALETTE_COOKIE = "arion_palette";
export const PALETTE_CUSTOM_COOKIE = "arion_palette_c";

export function isPaletteSetting(v: unknown): v is PaletteSetting {
  return typeof v === "string" && (PALETTE_IDS as readonly string[]).includes(v);
}

/** «#RRGGBB» بزرگ‌حرف، یا null. «RRGGBB» بدون # (مقدار کوکی) هم پذیرفته می‌شه. */
export function normalizeHex(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const m = /^#?([0-9a-fA-F]{6})$/.exec(v.trim());
  return m ? `#${m[1].toUpperCase()}` : null;
}

/**
 * auto → پالت بخش (ترید/ورزش) یا روتین؛ custom بدون رنگ معتبر هم مثل auto حل می‌شه.
 * `section` همون SectionKey یا null (دامنه‌ی اصلی).
 */
export function resolvePalette(
  setting: PaletteSetting,
  custom: string | null,
  section: SectionKey | string | null | undefined,
): EffectivePalette {
  if (setting === "custom" && normalizeHex(custom)) return "custom";
  if (setting !== "auto" && setting !== "custom") return setting;
  return section === "trade" || section === "workout" ? section : "routine";
}

// ───────────────────────── ریاضی رنگ ─────────────────────────

export type RGB = [number, number, number];
export type TokenMap = Record<string, string>;
export type PaletteTokens = { dark: TokenMap; light: TokenMap };

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgbToHex([r, g, b]: RGB): string {
  const p = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${p(r)}${p(g)}${p(b)}`.toUpperCase();
}

/** h: 0..360، s و l: 0..1 */
export function rgbToHsl([r0, g0, b0]: RGB): [number, number, number] {
  const r = r0 / 255, g = g0 / 255, b = b0 / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return [h, clamp(s, 0, 1), l];
}

export function hslToRgb(h0: number, s0: number, l0: number): RGB {
  const h = ((h0 % 360) + 360) % 360;
  const s = clamp(s0, 0, 1), l = clamp(l0, 0, 1);
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

export function hslHex(h: number, s: number, l: number): string {
  return rgbToHex(hslToRgb(h, s, l));
}

/** روشنایی نسبی WCAG */
export function relLuminance(hex: string): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** نسبت کنتراست WCAG بین دو رنگ هگز (1 تا 21) */
export function contrastRatio(a: string, b: string): number {
  const la = relLuminance(a), lb = relLuminance(b);
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * روشنایی (l) رو قدم‌به‌قدم کم/زیاد می‌کنه تا کنتراست رنگ نهایی (بعد از گرد‌شدن به هگز) با `against`
 * حداقل `min` بشه. اگه به سقف/کف رسید همون آخرین مقدار برمی‌گرده (سفید یا سیاه، که همیشه کافیه).
 */
function fitLightness(h: number, s: number, l: number, against: string, min: number, dir: "lighter" | "darker"): string {
  let L = clamp(l, 0, 1);
  for (let i = 0; i < 400; i++) {
    const hex = hslHex(h, s, L);
    if (contrastRatio(hex, against) >= min) return hex;
    L += dir === "lighter" ? 0.005 : -0.005;
    if (L > 1 || L < 0) break;
  }
  return hslHex(h, s, dir === "lighter" ? 1 : 0);
}

const rgbStr = (hex: string) => hexToRgb(hex).join(",");
const rgba = (hex: string, a: number) => `rgba(${rgbStr(hex)},${a})`;
const shiftL = (hex: string, dl: number, sMul = 1) => {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  return hslHex(h, s * sMul, l + dl);
};

// ───────────────────────── ساخت توکن‌ها از چند رنگ کلیدی ─────────────────────────

export type PaletteSpec = {
  mode: "dark" | "light";
  bg: string; text: string; muted: string; muted2: string;
  accent: string; accentSoft: string; accentDeep: string;
  secondary: string;
  rings: { r1: [string, string]; r2: [string, string]; r3: [string, string]; over: string };
  /** گرادیان لوگو (--logo-from/mid/to) */
  logo: [string, string, string];
};

/**
 * فهرست کامل توکن‌های رنگی یک پالت (همون مجموعه‌ی app/palette-themes.css ترید/ورزش، به‌علاوه‌ی
 * --logo-*). سطح‌ها (کارت، ورودی، خط، شیشه) از روشنایی --bg مشتق می‌شن؛ مثل پالت ترید.
 */
/** سطح‌های مشتق از --bg (کارت‌ها، پاپ‌آپ‌ها، خط‌ها) — tokensFromSpec و کنتراست پالت سفارشی هر دو ازش می‌خونن */
function surfacesOf(bg: string, dark: boolean) {
  const [bh, bs, bl] = rgbToHsl(hexToRgb(bg));
  const at = (dl: number, sMul = 1) => hslHex(bh, bs * sMul, bl + dl);
  return {
    at,
    surface1: dark ? at(0.04, 0.9) : hslHex(bh, bs * 0.9, 0.975),
    surface2: dark ? at(0.08, 0.85) : hslHex(bh, bs * 0.5, 0.992),
    surfaceLine: dark ? at(0.12, 0.85) : at(-0.05, 0.9),
  };
}

export function tokensFromSpec(spec: PaletteSpec): TokenMap {
  const dark = spec.mode === "dark";
  const { at, surface1, surface2, surfaceLine } = surfacesOf(spec.bg, dark);
  const t: TokenMap = {
    "--bg": spec.bg,
    "--bg-rgb": rgbStr(spec.bg),
    "--surface-rgb": dark ? rgbStr(spec.bg) : rgbStr(surface1),
    "--text": spec.text,
    "--text-rgb": rgbStr(spec.text),
    "--muted": spec.muted,
    "--muted2": spec.muted2,
    "--accent": spec.accent,
    "--accent-rgb": rgbStr(spec.accent),
    "--accent-dim": rgba(spec.accent, dark ? 0.2 : 0.14),
    "--accent-soft": spec.accentSoft,
    "--accent-deep": spec.accentDeep,
    "--secondary": spec.secondary,
    "--secondary-rgb": rgbStr(spec.secondary),
    "--secondary-dim": rgba(spec.secondary, dark ? 0.18 : 0.16),
    "--card-bg": dark ? at(-0.008) : at(-0.02),
    "--input-bg": dark ? at(0.006) : at(-0.04),
    "--line": dark ? at(0.1, 0.9) : at(-0.06, 0.9),
    "--surface-1": surface1,
    "--surface-2": surface2,
    "--surface-glass": dark ? rgba(surface2, 0.72) : "rgba(255,255,255,.72)",
    "--surface-line": surfaceLine,
    "--box-bg": surface1,
    "--box-line": surfaceLine,
    "--ring-1a": spec.rings.r1[0], "--ring-1b": spec.rings.r1[1],
    "--ring-2a": spec.rings.r2[0], "--ring-2b": spec.rings.r2[1],
    "--ring-3a": spec.rings.r3[0], "--ring-3b": spec.rings.r3[1],
    "--ring-over": spec.rings.over,
    "--sec-head": "var(--text)", "--sec-muted": "var(--muted)", "--sec-line": "var(--line)", "--sec-card-border": "var(--surface-line)",
    "--sec-accent": "var(--accent)", "--sec-accent-rgb": "var(--accent-rgb)",
    "--sec-secondary": dark ? "var(--secondary)" : "var(--accent)",
    "--sec-secondary-rgb": dark ? "var(--secondary-rgb)" : "var(--accent-rgb)",
    "--sec-on-accent": dark ? "var(--bg)" : "#fff",
    "--sec-on-secondary": dark ? "var(--bg)" : "#fff",
    "--logo-from": spec.logo[0], "--logo-mid": spec.logo[1], "--logo-to": spec.logo[2],
  };
  return t;
}

// ───────────────────────── پالت‌های آماده ─────────────────────────

const OVER_DARK = "#FF3D6E";
const OVER_LIGHT = "#D6204E";

const PRESET_SPECS: Record<GeneratedPreset, { dark: PaletteSpec; light: PaletteSpec }> = {
  // بنفش ملایم با شامپاین؛ روز = صدفی/اطلسی با بنفش عمیق و آلویی تیره
  amethyst: {
    dark: {
      mode: "dark", bg: "#0D0A14", text: "#F1ECFA", muted: "#9A90B0", muted2: "#4C4560",
      accent: "#A87BFF", accentSoft: "#C4A5FF", accentDeep: "#4A2A94",
      secondary: "#E9C77B",
      rings: { r1: ["#A87BFF", "#D2B8FF"], r2: ["#E9C77B", "#FFE3A6"], r3: ["#FF6FB5", "#FFB3D9"], over: OVER_DARK },
      logo: ["#C9A8FF", "#A87BFF", "#7C5CE6"],
    },
    light: {
      mode: "light", bg: "#ECE7F7", text: "#2B1D4A", muted: "#5F5380", muted2: "#A79CC4",
      accent: "#6B3FD1", accentSoft: "#8F68E0", accentDeep: "#3E1F85",
      secondary: "#3B1A4F",
      rings: { r1: ["#6B3FD1", "#9A74EE"], r2: ["#A82E86", "#D866B6"], r3: ["#B07A0E", "#D9A53A"], over: OVER_LIGHT },
      logo: ["#9A74EE", "#6B3FD1", "#4B2AA0"],
    },
  },
  // ذغال گرم با نارنجی غروب؛ روز = عاجی زردآلویی با نارنجی سوخته و اسپرسو
  sunset: {
    dark: {
      mode: "dark", bg: "#140E0B", text: "#F8EDE4", muted: "#B09A8A", muted2: "#62504A",
      accent: "#FF8A3D", accentSoft: "#FFB27A", accentDeep: "#8A3A0A",
      secondary: "#FF5E7E",
      rings: { r1: ["#FF8A3D", "#FFC08A"], r2: ["#FF5E7E", "#FFA0B4"], r3: ["#FFC93D", "#FFE48A"], over: "#FF4040" },
      logo: ["#FFB27A", "#FF8A3D", "#FF5E7E"],
    },
    light: {
      mode: "light", bg: "#FCEBDC", text: "#3A2216", muted: "#7A5A47", muted2: "#C2A592",
      accent: "#B04E0D", accentSoft: "#D8782F", accentDeep: "#6E2A04",
      secondary: "#3B2418",
      rings: { r1: ["#B04E0D", "#E8863E"], r2: ["#C42B52", "#EC6E8C"], r3: ["#A8780A", "#D9A53A"], over: OVER_LIGHT },
      logo: ["#E8863E", "#B04E0D", "#8F3306"],
    },
  },
  // گرافیت خنثی با نقره‌ای و فولادی؛ روز = پلاتینی سرد با جوهری
  graphite: {
    dark: {
      mode: "dark", bg: "#101113", text: "#ECEEF0", muted: "#8D9399", muted2: "#474B50",
      accent: "#E6E8EB", accentSoft: "#FFFFFF", accentDeep: "#6B7280",
      secondary: "#8FA3B8",
      rings: { r1: ["#D4D8DD", "#FFFFFF"], r2: ["#6E8CA8", "#A9C1D8"], r3: ["#5E9AA0", "#9CCDD2"], over: "#FF5C5C" },
      logo: ["#FFFFFF", "#E6E8EB", "#8FA3B8"],
    },
    light: {
      mode: "light", bg: "#E9ECEF", text: "#111827", muted: "#4B5563", muted2: "#9CA3AF",
      accent: "#1F2937", accentSoft: "#4B5563", accentDeep: "#0B1220",
      secondary: "#475569",
      rings: { r1: ["#374151", "#6B7280"], r2: ["#3B6A9A", "#6C9BCB"], r3: ["#2F7F86", "#4DB0B8"], over: OVER_LIGHT },
      logo: ["#6B7280", "#374151", "#1F2937"],
    },
  },
};

export function presetTokens(id: GeneratedPreset): PaletteTokens {
  const s = PRESET_SPECS[id];
  return { dark: tokensFromSpec(s.dark), light: tokensFromSpec(s.light) };
}

export function presetSpecs(id: GeneratedPreset): { dark: PaletteSpec; light: PaletteSpec } {
  return PRESET_SPECS[id];
}

// ───────────────────────── پالت سفارشی از یک رنگ ─────────────────────────

/**
 * از یک رنگ کاربر پالت شب و روز کامل می‌سازه. قطعی (بدون تصادف) و کنتراست‌ضمانتی:
 *   - شب: زمینه‌ی تیره‌ی مایل به رنگ، accent همون رنگ با روشنایی تنظیم‌شده تا نسبت کنتراست با --bg
 *     حداقل 4.5 بشه (متن accent روی bg و متن --bg روی دکمه‌ی accent که اپ همیشه همین‌طور می‌ذاره)
 *   - روز: کاغذ روشن مایل به رنگ، accent تیره‌شده تا نسبت کنتراست با --bg حداقل 4.5 بشه (سفید روی
 *     accent هم به‌تبع بالاتره)
 *   - رنگ بی‌رنگ/خاکستری: زمینه‌ها خنثی می‌مونن و ته‌رنگ فولادی (hue 215) به رنگ دوم داده می‌شه
 *   - رنگ دوم: شب = مکمل شکسته (hue + 155)، روز = ته‌رنگ تیره‌ی هم‌خانواده
 */
export function paletteFromAccent(hexIn: string): PaletteTokens {
  const hex = normalizeHex(hexIn) ?? "#00A86B";
  let [h, s, l] = rgbToHsl(hexToRgb(hex));
  const gray = s < 0.06;
  if (gray) h = 215;
  // قدرت ته‌رنگ زمینه‌ها: خاکستری 0، رنگ‌های کم‌اشباع کم، رنگ‌های زنده 1
  const k = clamp(s / 0.25, 0, 1);
  const sa = gray ? s : clamp(s, 0.45, 0.95);

  // ── شب ──
  const dBg = hslHex(h, 0.02 + 0.3 * k, 0.055);
  const dText = hslHex(h, 0.02 + 0.25 * k, 0.94);
  // متن‌ها باید روی روشن‌ترین سطح شب (پاپ‌آپ/کارت = surface-2) هم 4.5 بمونن، نه فقط روی --bg
  const dTop = surfacesOf(dBg, true).surface2;
  const dMuted = fitLightness(h, 0.02 + 0.14 * k, 0.62, dTop, 4.5, "lighter");
  const dMuted2 = fitLightness(h, 0.02 + 0.12 * k, 0.34, dBg, 3, "lighter");
  const dAccent = fitLightness(h, sa, clamp(l, 0.5, 0.78), dTop, 4.5, "lighter");
  const [, , dAl] = rgbToHsl(hexToRgb(dAccent));
  const secH = gray ? 215 : h + 155;
  const secS = gray ? 0.25 : 0.62;
  const dSecondary = fitLightness(secH, secS, 0.68, dTop, 4.5, "lighter");
  const ringS = gray ? 0.3 : 0.82;
  const dark = tokensFromSpec({
    mode: "dark", bg: dBg, text: dText, muted: dMuted, muted2: dMuted2,
    accent: dAccent,
    accentSoft: hslHex(h, sa * 0.85, Math.min(dAl + 0.12, 0.88)),
    accentDeep: hslHex(h, sa * 0.9, clamp(dAl * 0.52, 0.12, 0.34)),
    secondary: dSecondary,
    rings: {
      r1: [dAccent, hslHex(h, sa * 0.9, Math.min(dAl + 0.16, 0.9))],
      r2: [dSecondary, shiftL(dSecondary, 0.12)],
      r3: [hslHex(h - 55, ringS, 0.62), hslHex(h - 55, ringS, 0.78)],
      over: OVER_DARK,
    },
    logo: [hslHex(h - 14, sa, Math.min(dAl + 0.08, 0.8)), dAccent, hslHex(h + 14, sa, Math.max(dAl - 0.06, 0.4))],
  });

  // ── روز ──
  const lBg = hslHex(h, 0.02 + 0.4 * k, 0.925);
  const lText = fitLightness(h, 0.04 + 0.45 * k, 0.16, lBg, 7, "darker");
  const lMuted = fitLightness(h, 0.03 + 0.22 * k, 0.4, lBg, 4.5, "darker");
  const lMuted2 = hslHex(h, 0.03 + 0.2 * k, 0.66);
  const lAccent = fitLightness(h, sa, clamp(l, 0.28, 0.52), lBg, 4.5, "darker");
  const [, , lAl] = rgbToHsl(hexToRgb(lAccent));
  const lSecondary = fitLightness(gray ? 215 : h + 20, 0.06 + 0.5 * k, 0.2, lBg, 7, "darker");
  const lRing = (hh: number, ll: number) => fitLightness(hh, gray ? 0.3 : 0.7, ll, lBg, 3, "darker");
  const light = tokensFromSpec({
    mode: "light", bg: lBg, text: lText, muted: lMuted, muted2: lMuted2,
    accent: lAccent,
    accentSoft: hslHex(h, sa * 0.85, Math.min(lAl + 0.14, 0.7)),
    accentDeep: hslHex(h, sa * 0.9, clamp(lAl * 0.5, 0.1, 0.3)),
    secondary: lSecondary,
    rings: {
      r1: [lAccent, hslHex(h, sa * 0.9, Math.min(lAl + 0.14, 0.66))],
      r2: [lRing(secH, 0.42), hslHex(secH, gray ? 0.3 : 0.7, 0.58)],
      r3: [lRing(h - 55, 0.42), hslHex(h - 55, gray ? 0.3 : 0.7, 0.56)],
      over: OVER_LIGHT,
    },
    logo: [hslHex(h - 12, sa, 0.62), hslHex(h, sa, 0.52), hslHex(h + 12, sa, 0.44)],
  });
  return { dark, light };
}

// ───────────────────────── خروجی CSS ─────────────────────────

// همون اولویت قدیم section-themes.css: تم مناسبتی فعال و تم نوآر ادمین برنده‌ان
const EXCL = ':not([data-event-theme]):not([data-admin-theme="noir"])';
const RING_KEYS = ["--ring-1a", "--ring-1b", "--ring-2a", "--ring-2b", "--ring-3a", "--ring-3b", "--ring-over"];

const decl = (t: TokenMap, keys: string[]) => keys.filter((k) => k in t).map((k) => `${k}:${t[k]};`).join(" ");
/** فایل ثابت: هر چند تعریف یک خط (خوانایی و دیف کوچک)؛ نسخه‌ی inline فشرده */
const declLines = (t: TokenMap, keys: string[], pretty: boolean) => {
  const items = keys.filter((k) => k in t).map((k) => `${k}:${t[k]};`);
  if (!pretty) return items.join(" ");
  const lines: string[] = [];
  for (let i = 0; i < items.length; i += 4) lines.push(items.slice(i, i + 4).join(" "));
  return lines.join("\n  ");
};

/**
 * CSS کامل یک پالت (شب + روز + حلقه‌های داشبورد + بلاگ + لندینگ + گرادیان لوگو).
 * `pretty` فقط برای فایل ثابت (خط‌به‌خط)؛ نسخه‌ی inline سرور فشرده‌ست.
 */
export function paletteCss(id: string, t: PaletteTokens, pretty = false): string {
  const sel = `html[data-palette="${id}"]`;
  const nl = pretty ? "\n" : "";
  const ind = pretty ? "  " : "";
  const out: string[] = [];
  const logoKeys = Object.keys(t.dark).filter((k) => k.startsWith("--logo-"));
  const paletteKeys = (m: TokenMap) => Object.keys(m).filter((k) => !k.startsWith("--logo-") && !RING_KEYS.includes(k));
  const modes: Array<["dark" | "light", string]> = [["dark", `body:not([data-theme="light"])`], ["light", `body[data-theme="light"]`]];

  for (const [mode, body] of modes) {
    const m = t[mode];
    const htmlSel = mode === "dark"
      ? `${sel}${EXCL}:not([data-theme="light"])`
      : `${sel}${EXCL}[data-theme="light"]`;
    out.push(`${htmlSel}{ background:${m["--bg"]}; }`);
    // توکن‌های رنگی اصلی (بدون حلقه‌ها) و حلقه‌ها در یک بلاک؛ حلقه‌ها زیر .db-page هم دوباره میان
    out.push(`${sel}${EXCL} ${body}{${nl}${ind}${declLines(m, paletteKeys(m), pretty)}${nl}${ind}${decl(m, RING_KEYS)}${nl}}`);
    out.push(`${sel}${EXCL} ${body} :is(.db-page, .db-cmd-root){${nl}${ind}${decl(m, RING_KEYS)}${nl}}`);
    out.push(
      `${sel}${EXCL} ${body} .blog-root{${nl}${ind}--b-head:var(--text); --b-muted:var(--muted); --b-line:var(--line); --b-border:var(--surface-line);` +
      `${nl}${ind}--b-acc:var(--accent); --b-acc-rgb:var(--accent-rgb);${nl}}`,
    );
  }
  // لندینگ در تم روز (گرادیان برند، گوشی، هاله‌ی دوم)
  const L = t.light;
  const sec = L["--secondary"];
  out.push(
    `${sel}${EXCL} body[data-theme="light"] .lh-rot-word, ${sel}${EXCL} body[data-theme="light"] .lh-brand{ background-image:linear-gradient(100deg, var(--accent), var(--accent-deep) 70%); }`,
  );
  out.push(
    `${sel}${EXCL} body[data-theme="light"] .lh-phone{ background:linear-gradient(160deg, ${shiftL(sec, 0.12)}, ${sec} 45%, ${shiftL(sec, 0.06)}); }`,
  );
  out.push(
    `${sel}:not([data-event-theme]) body[data-theme="light"] .lh-aurora-b{ background:radial-gradient(closest-side, ${rgba(L["--accent-soft"], 0.2)}, ${rgba(L["--accent-soft"], 0)}); }`,
  );
  // گرادیان لوگو: مستقل از تم مناسبتی/نوآر (برند کاربر، نه تم مناسبت)
  for (const [mode, body] of modes) {
    out.push(`${sel} ${body}{ ${decl(t[mode], logoKeys)} }`);
  }
  return out.join(nl ? "\n" : "") + (pretty ? "\n" : "");
}

/** CSS پالت سفارشی (فشرده، برای <style> سمت سرور و به‌روزرسانی لحظه‌ای کلاینت) — فقط از رنگ معتبر */
export function customPaletteCss(hex: string | null): string {
  const h = normalizeHex(hex);
  return h ? paletteCss("custom", paletteFromAccent(h)) : "";
}

// ───────────────────────── رنگ نوار وضعیت و پیش‌نمایش ─────────────────────────

/** --bg هر پالت (شب/روز) برای `<meta name="theme-color">` — پالت سفارشی از paletteMetaColors می‌آید */
export const PRESET_META_COLORS: Record<GeneratedPreset, { dark: string; light: string }> = {
  amethyst: { dark: PRESET_SPECS.amethyst.dark.bg, light: PRESET_SPECS.amethyst.light.bg },
  sunset: { dark: PRESET_SPECS.sunset.dark.bg, light: PRESET_SPECS.sunset.light.bg },
  graphite: { dark: PRESET_SPECS.graphite.dark.bg, light: PRESET_SPECS.graphite.light.bg },
};

export function paletteMetaColors(hex: string | null): { dark: string; light: string } | null {
  const h = normalizeHex(hex);
  if (!h) return null;
  const t = paletteFromAccent(h);
  return { dark: t.dark["--bg"], light: t.light["--bg"] };
}

export type PalettePreview = { bg: string; accent: string; secondary: string };

// رنگ‌های روتین و دو پالت بخش‌ها (هم‌مقدار app/globals.css و app/palette-themes.css)
const FIXED_PREVIEWS: Record<"routine" | "trade" | "workout", { dark: PalettePreview; light: PalettePreview }> = {
  routine: {
    dark: { bg: "#0E1011", accent: "#00A86B", secondary: "#3E7BFA" },
    light: { bg: "#F8E9D2", accent: "#B36B2F", secondary: "#5A4024" },
  },
  trade: {
    dark: { bg: "#070B12", accent: "#00B4FF", secondary: "#7B5CFF" },
    light: { bg: "#E7EDF4", accent: "#0A5BD6", secondary: "#0B1F3A" },
  },
  workout: {
    dark: { bg: "#0B0B0C", accent: "#D21F3C", secondary: "#D9D9DE" },
    light: { bg: "#F4F4F5", accent: "#A50E2A", secondary: "#111113" },
  },
};

/** سه رنگ نمایشی (زمینه، accent، رنگ دوم) برای کارت پیش‌نمایش؛ «auto» پیش‌نمایش جدا دارد */
export function palettePreview(id: EffectivePalette, mode: "dark" | "light", custom: string | null = null): PalettePreview {
  if (id === "routine" || id === "trade" || id === "workout") return FIXED_PREVIEWS[id][mode];
  const tokens = id === "custom" ? paletteFromAccent(normalizeHex(custom) ?? "#00A86B") : presetTokens(id);
  const m = tokens[mode];
  return { bg: m["--bg"], accent: m["--accent"], secondary: m["--secondary"] };
}

/** گرادیان لوگو (سه رنگ) برای پیش‌نمایش لوگو در صفحه‌ی تنظیمات */
export function paletteLogo(id: EffectivePalette, mode: "dark" | "light", custom: string | null = null): [string, string, string] {
  if (id === "routine") return mode === "dark" ? ["#34D26B", "#09C796", "#00AAB1"] : ["#FD9E61", "#F2AE7E", "#E0B795"];
  if (id === "trade") return ["#00B9F3", "#01A4F2", "#0475F5"];
  if (id === "workout") return ["#F11834", "#E9133D", "#D0084B"];
  const tokens = id === "custom" ? paletteFromAccent(normalizeHex(custom) ?? "#00A86B") : presetTokens(id);
  const m = tokens[mode];
  return [m["--logo-from"], m["--logo-mid"], m["--logo-to"]];
}

/** hue پایه‌ی آواتار عامل (components/AgentAvatar.tsx): همون hue رنگ accent پالت. undefined = پیش‌فرض تم */
export function paletteAvatarHue(id: EffectivePalette, mode: "dark" | "light", custom: string | null): number | undefined {
  if (id === "routine") return undefined;
  if (id === "trade") return mode === "dark" ? 196 : 217;
  if (id === "workout") return mode === "dark" ? 354 : 350;
  const accent = palettePreview(id, mode, custom).accent;
  const [h, s] = rgbToHsl(hexToRgb(accent));
  return s < 0.06 ? 215 : Math.round(h);
}

/** رنگ‌های پیشنهادی بخش «سفارشی» */
export const CUSTOM_SWATCHES = ["#00A86B", "#2F7DF6", "#7C5CFF", "#E8344F", "#FF8A3D", "#F2B01E", "#14B8A6", "#EC4899"] as const;

// ───────────────────────── بلاک تولیدشده‌ی فایل CSS ─────────────────────────

export const PRESET_BLOCK_START = "/* >>> generated presets (scripts/gen-palette-css.ts) — دستی ویرایش نکن */";
export const PRESET_BLOCK_END = "/* <<< generated presets */";

/** متن کامل بلاک پالت‌های آماده که ته app/palette-themes.css می‌شینه */
export function generatedPresetBlock(): string {
  const parts = GENERATED_PRESETS.map((id) => `/* ── ${id} ── */\n${paletteCss(id, presetTokens(id), true)}`);
  return `${PRESET_BLOCK_START}\n${parts.join("\n")}${PRESET_BLOCK_END}\n`;
}

/** رنگی که با انتخاب «سفارشی» برای بار اول پیشنهاد می‌شه (فیروزه‌ای؛ شبیه هیچ پالت آماده‌ای نیست) */
export const DEFAULT_CUSTOM_COLOR = "#14B8A6";
