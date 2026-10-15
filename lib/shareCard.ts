"use client";

// کارت اشتراکی «موفقیت» — یک تصویر PNG (۱۰۸۰×۱۳۵۰) که کاربر با دوستاش به
// اشتراک می‌ذاره. هر کارت *یک* محتوا داره (حلقه‌ها یا استریک) تا
// فضا شلوغ نشه؛ داخل حلقه‌ها تعداد روزهای استریک میاد. بالای کارت لوگوی هدر
// (نشان + اسم برند)، آدرس سایت و کد دعوت (اگه داشته باشه)؛ پایین کارت
// هیچ لینکی نیست. هیچ داده‌ای از دستگاه بیرون نمی‌ره مگر همین تصویر، وقتی خودش
// «اشتراک» رو می‌زنه.
//
// رنگ‌ها از توکن‌های تم فعلی خونده می‌شن (مثل WeeklyAnalysisShare) تا تصویر
// هم‌رنگ همون چیزی باشه که کاربر روی صفحه می‌بینه.

import { faNum } from "./jalali";
import { FLAME_BOX, flamePalette, toonFlameShape } from "./streakFlameShape";
import { tr, isEn } from "./i18n";

/** display=null یعنی عدد این حلقه پنهانه (مثلا کالری) — خود حلقه کشیده می‌شه، عددش نه */
export type ShareRing = { label: string; value: number; display: string | null; colors: [string, string] };

/** محتوای اصلی کارت — هر کارت دقیقا *یکی* از این‌هاست */
export type ShareBody =
  | { kind: "rings"; streak: number; center: "streak" | "percent"; percent: number; items: ShareRing[] }
  | { kind: "streak"; streak: number; label: string; week: { labels: string[]; done: boolean[]; todayIdx: number } };

export type ShareCardInput = {
  title: string;
  subtitle?: string;
  body: ShareBody;
  /** کد دعوت — بالای کارت، کنار آدرس سایت (پایین کارت هیچ لینکی نیست) */
  inviteCode?: string | null;
};

// یک قالب ثابت (۴:۵) — هم پست هم استوری/چت بدون برش نشونش می‌دن
export const SHARE_W = 1080;
export const SHARE_H = 1350;
/** تراکم پیکسل خروجی */
export const SHARE_DPR = 2;
/** فتحه/کسره/ضمه/تنوین/تشدید/سکون و الف کوچک */
const NO_DIACRITICS = /[\u064B-\u0652\u0670]/g;
/** هیچ اعرابی روی تصویرهای اشتراکی نمیاد — حتی اگه ورودی داشته باشه */
export const stripDiacritics = (s: string) => s.replace(NO_DIACRITICS, "");
const W = SHARE_W;
const H = SHARE_H;
// کل تصویر خود باکس کارته (بدون حاشیه، قاب یا گوشه‌ی شفاف — پیام‌رسان‌ها آلفا رو
// سفید/سیاه می‌کنن). محتوا هنوز در مختصات قاب قدیمی (984×1254 از 48,48) چیده
// می‌شه و با یک مقیاس یکنواخت (CS) وسط کل تصویر می‌شینه — همون تناسب‌ها، بدون برش.
// کارت‌های هم‌خانواده (مثل کارنامه‌ی ترید، lib/tradeShareCard.ts) همین مختصات رو دارن.
export const CY = 48, CH = H - 96;
export const CS = Math.min(W / (W - 96), H / CH);

export type Palette = {
  bg: string; surface: string; line: string; accent: string; accentRgb: string;
  text: string; muted: string; light: boolean;
};

export function readPalette(): Palette {
  const cs = getComputedStyle(document.body);
  const v = (name: string, fb: string) => cs.getPropertyValue(name).trim() || fb;
  const light = document.body.getAttribute("data-theme") === "light";
  return {
    bg: v("--bg", "#0E1011"),
    surface: v("--surface-1", "#171A1C"),
    line: v("--surface-line", "#2A2F33"),
    accent: v("--accent", "#00A86B"),
    accentRgb: v("--accent-rgb", "0,168,107"),
    text: v("--text", "#EDEFEE"),
    muted: v("--muted", "#8A9099"),
    light,
  };
}

export function fontStack(): string {
  const cs = getComputedStyle(document.documentElement);
  const vazir = cs.getPropertyValue("--font-vazir").trim();
  const latin = cs.getPropertyValue("--font-latin").trim();
  return [latin, vazir, "sans-serif"].filter(Boolean).join(", ");
}

/** رنگ هگز یا rgb() → rgba با شفافیت دلخواه (توکن‌های تم هر دو شکل رو دارن) */
export function rgba(color: string, a: number): string {
  const c = color.trim();
  const hex = c.match(/^#?([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  const short = c.match(/^#([0-9a-f]{3})$/i);
  if (short) return rgba(`#${short[1].split("").map((x) => x + x).join("")}`, a);
  const rgb = c.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const [r, g, b] = rgb[1].split(/[\s,/]+/).filter(Boolean);
    return `rgba(${r},${g},${b},${a})`;
  }
  return c;
}

/** ترکیب دو رنگ (هگز یا rgb) — t=0 رنگ اول، t=1 رنگ دوم؛ مثل color-mix  سر قوس داشبورد */
export function mixColor(a: string, b: string, t: number): string {
  const parse = (c: string) => rgba(c, 1).match(/^rgba\(([\d.]+),([\d.]+),([\d.]+),/)?.slice(1).map(Number) ?? null;
  const x = parse(a), y = parse(b);
  if (!x || !y) return t < 0.5 ? a : b;
  const m = x.map((v, i) => Math.round(v + (y[i] - v) * t));
  return `rgb(${m[0]},${m[1]},${m[2]})`;
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** شعله‌ی بزرگ کارتونی (یک فریم همون شعله‌ی زنده) با مرکز پایه در (x, y) و عرض size */
function drawFlame(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, days: number, glow = true) {
  const pal = flamePalette(days);
  const s = size / FLAME_BOX.w;
  ctx.save();
  ctx.translate(x - FLAME_BOX.cx * s, y - FLAME_BOX.by * s);
  ctx.scale(s, s);
  if (glow) {
    const g = ctx.createRadialGradient(FLAME_BOX.cx, FLAME_BOX.by - 90, 10, FLAME_BOX.cx, FLAME_BOX.by - 90, 130);
    g.addColorStop(0, `rgba(${pal.glow},.45)`);
    g.addColorStop(1, `rgba(${pal.glow},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(-40, -20, FLAME_BOX.w + 80, FLAME_BOX.h + 40);
  }
  // همون شعله‌ی کارتونی زنده در یک فریم: دورگیری سفید، بدنه، قطره، برق
  const f = toonFlameShape(FLAME_BOX.cx, FLAME_BOX.by, 0.9);
  const tn = pal.toon;
  const body = new Path2D(f.body);
  ctx.lineJoin = "round";
  ctx.lineWidth = 30;
  ctx.strokeStyle = "#fff";
  ctx.fillStyle = "#fff";
  ctx.stroke(body);
  ctx.fill(body);
  const bg = ctx.createLinearGradient(FLAME_BOX.cx - 60, 0, FLAME_BOX.cx + 75, 0);
  bg.addColorStop(0, tn.body);
  bg.addColorStop(0.62, tn.body);
  bg.addColorStop(1, tn.shade);
  ctx.fillStyle = bg;
  ctx.fill(body);
  const ig = ctx.createLinearGradient(0, FLAME_BOX.by - 110, 0, FLAME_BOX.by);
  ig.addColorStop(0, tn.innerHi);
  ig.addColorStop(1, tn.inner);
  ctx.fillStyle = ig;
  ctx.fill(new Path2D(f.inner));
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "#fff";
  ctx.fill(new Path2D(f.shine));
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── پس‌زمینه‌ی شیشه‌ای ─────────────────────────────────────────────
// یک صحنه‌ی نورانی (چند هاله‌ی رنگی خیلی پخش) ساخته می‌شه و کل تصویر رو
// می‌پوشونه (تصویر خود باکس کارته، بدون حاشیه یا قاب): نسخه‌ی خیلی تار صحنه +
// لایه‌ی رنگ شیری + درخشش بالا-چپ + شبکه‌ی نقطه‌ای + دانه. تاری با
// کوچک‌کردن مرحله‌ای و بزرگ‌کردن دوباره ساخته می‌شه (نه ctx.filter) تا روی همه‌ی
// مرورگرها — از جمله سافاری قدیمی — یکسان و نرم دربیاد.
type Orb = { x: number; y: number; r: number; color: string; a: number; soft: boolean };

// فقط رنگ‌های برند: اکسنت تم (سبز آریون در شب، مسی گرم در روز) + رنگ دوم
// لوگو (فیروزه‌ای نشان در شب، طلایی گرم در روز). کم و آرام — کارت باید «آریون»
// به‌نظر بیاد، نه رنگین‌کمان؛ رنگ داده‌ها (حلقه‌ها/نقشه) خودشون روی شیشه می‌درخشن.
function sceneOrbs(p: Palette): Orb[] {
  const brand2 = p.light ? "#E0A15E" : "#14D2DC";
  if (p.light) {
    return [
      { x: 0.08, y: 0.05, r: 0.9, color: p.accent, a: 0.5, soft: true },
      { x: 0.96, y: 0.96, r: 0.85, color: brand2, a: 0.55, soft: true },
      { x: 0.55, y: 0.5, r: 0.55, color: p.accent, a: 0.12, soft: true },
    ];
  }
  return [
    { x: 0.08, y: 0.05, r: 0.85, color: p.accent, a: 0.42, soft: true },
    { x: 0.96, y: 0.96, r: 0.8, color: brand2, a: 0.24, soft: true },
    { x: 0.55, y: 0.5, r: 0.55, color: p.accent, a: 0.07, soft: true },
  ];
}

function paintScene(c: CanvasRenderingContext2D, w: number, h: number, p: Palette) {
  c.fillStyle = p.bg;
  c.fillRect(0, 0, w, h);
  const m = Math.max(w, h);
  for (const o of sceneOrbs(p)) {
    const x = o.x * w, y = o.y * h, r = o.r * m;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    if (o.soft) {
      g.addColorStop(0, rgba(o.color, o.a));
      g.addColorStop(1, rgba(o.color, 0));
    } else {
      g.addColorStop(0, rgba(o.color, o.a));
      g.addColorStop(0.72, rgba(o.color, o.a * 0.75));
      g.addColorStop(1, rgba(o.color, 0));
    }
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }
}

/** نسخه‌ی تار صحنه: کوچک‌کردن نصف‌به‌نصف تا عرض `target` (بدون پله‌پله‌شدن) */
function blurredScene(src: HTMLCanvasElement, target: number): HTMLCanvasElement {
  let cur = src;
  while (cur.width / 2 >= target) {
    const nx = document.createElement("canvas");
    nx.width = Math.max(1, Math.round(cur.width / 2));
    nx.height = Math.max(1, Math.round(cur.height / 2));
    const c = nx.getContext("2d")!;
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = "high";
    c.drawImage(cur, 0, 0, nx.width, nx.height);
    cur = nx;
  }
  return cur;
}

/** دانه‌ی خیلی ریز شیشه‌ی مات — یک کاشی کوچک تکرارشونده، با شفافیت کم */
function grainPattern(c: CanvasRenderingContext2D, light: boolean): CanvasPattern | null {
  const t = document.createElement("canvas");
  t.width = t.height = 128;
  const tc = t.getContext("2d");
  if (!tc) return null;
  const img = tc.createImageData(128, 128);
  let seed = 7;
  for (let i = 0; i < img.data.length; i += 4) {
    seed = (seed * 16807) % 2147483647;
    const v = seed % 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = light ? 0 : 255;
    img.data[i + 3] = Math.round((v / 255) * (light ? 10 : 14));
  }
  tc.putImageData(img, 0, 0);
  return c.createPattern(t, "repeat");
}

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();
function loadImage(src: string): Promise<HTMLImageElement | null> {
  let hit = imageCache.get(src);
  if (!hit) {
    hit = new Promise((res) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => { imageCache.delete(src); res(null); };
      img.src = src;
    });
    imageCache.set(src, hit);
  }
  return hit;
}
// لوگوی هدر (نشان + اسم برند، همون فایلی که NavDrawer نشون می‌ده) — نسخه‌ی تم فعلی
export const loadLogo = (light: boolean) => loadImage(light ? "/images/logo-lockup-light-theme.webp" : "/images/logo-lockup-dark-theme.png");

/** شبکه‌ی نقطه‌های ریز که از وسط به لبه‌ها محو می‌شه */
export function drawDotGrid(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, p: Palette) {
  const c = document.createElement("canvas");
  c.width = Math.round(w);
  c.height = Math.round(h);
  const cc = c.getContext("2d");
  if (!cc) return;
  const gap = 30, r = p.light ? 1.9 : 1.7;
  cc.fillStyle = p.light ? "rgba(110,64,24,.34)" : "rgba(255,255,255,.16)";
  for (let yy = gap / 2; yy < h; yy += gap) {
    for (let xx = gap / 2; xx < w; xx += gap) {
      cc.beginPath();
      cc.arc(xx, yy, r, 0, Math.PI * 2);
      cc.fill();
    }
  }
  // ماسک: وسط کامل، لبه‌ها صفر
  cc.globalCompositeOperation = "destination-in";
  const m = cc.createRadialGradient(w / 2, h * 0.48, 0, w / 2, h * 0.48, Math.max(w, h) * 0.62);
  m.addColorStop(0, "rgba(0,0,0,1)");
  m.addColorStop(0.55, "rgba(0,0,0,.55)");
  m.addColorStop(1, "rgba(0,0,0,0)");
  cc.fillStyle = m;
  cc.fillRect(0, 0, w, h);
  ctx.drawImage(c, x, y, w, h);
}

// ── لایه‌ی پس‌زمینه (کش‌شده) ─────────────────────────────────────
// همه‌ی کارهای سنگین کارت (صحنه‌ی نورانی، سایه‌ی بزرگ، تاری چندمرحله‌ای، شبکه‌ی
// نقطه‌ای، دانه) فقط به تم بستگی دارن نه به محتوا. قبلا با هر تغییر کوچک در
// پیش‌نمایش از صفر ساخته می‌شدن؛ حالا یک بار برای هر تم/تراکم و بعد فقط کپی.
const bgCache = new Map<string, HTMLCanvasElement>();
export function backgroundLayer(p: Palette, dpr: number): HTMLCanvasElement {
  const key = [dpr, p.light ? 1 : 0, p.bg, p.accent, p.accentRgb].join("|");
  const hit = bgCache.get(key);
  if (hit) return hit;
  const layer = document.createElement("canvas");
  layer.width = W * dpr;
  layer.height = H * dpr;
  const ctx = layer.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  // ── صحنه‌ی نورانی پشت + کارت شیشه‌ی مات ──
  const scene = document.createElement("canvas");
  scene.width = W;
  scene.height = H;
  const sc = scene.getContext("2d");
  if (!sc) throw new Error("canvas");
  paintScene(sc, W, H, p);
  // شیشه‌ی مات کل تصویر رو می‌پوشونه — رنگ‌ها فقط رنگ‌های برند، خیلی پخش
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, W, H);
  // خود «ماتی»: صحنه‌ی خیلی تار (عرض 17px و بعد بزرگ) تا رنگ‌ها کاملا پخش و بی‌لبه باشن
  ctx.drawImage(blurredScene(scene, 17), 0, 0, W, H);
  // رنگ شیری/دودی شیشه
  ctx.fillStyle = p.light ? "rgba(255,255,255,.3)" : rgba(p.bg, 0.44);
  ctx.fillRect(0, 0, W, H);
  // درخشش بالای شیشه (نور از بالا-چپ)
  const sheen = ctx.createLinearGradient(0, 0, W * 0.55, H * 0.45);
  sheen.addColorStop(0, p.light ? "rgba(255,255,255,.42)" : "rgba(255,255,255,.12)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, W, H);
  // طرح: شبکه‌ی نقطه‌ای محو (زیر محتوا)
  drawDotGrid(ctx, 0, 0, W, H, p);
  // دانه‌ی ریز
  const grain = grainPattern(ctx, p.light);
  if (grain) {
    ctx.fillStyle = grain;
    ctx.fillRect(0, 0, W, H);
  }

  if (bgCache.size >= 4) bgCache.delete(bgCache.keys().next().value as string);
  bgCache.set(key, layer);
  return layer;
}

/** ساخت پیشاپیش لایه‌ی پس‌زمینه (کار سنگین کارت) در یک نوبت جدا — تا رندر کامل بعدی سبک باشه */
export function prepareShareBackground(dpr: number = SHARE_DPR): void {
  backgroundLayer(readPalette(), dpr);
}

export type RenderOpts = {
  /** تراکم خروجی؛ پیش‌فرض SHARE_DPR (2). پیش‌نمایش با 1 */
  dpr?: number;
  /** رندر مستقیم روی همین canvas (مثلا canvas  پیش‌نمایش) به‌جای ساخت canvas تازه */
  target?: HTMLCanvasElement;
};

export type ShareFont = (weight: number, size: number) => string;

/** سازنده‌ی رشته‌ی فونت canvas با استک فونت سایت (لاتین اول برای ارقام، بعد وزیرمتن) */
export function shareFont(): ShareFont {
  const fonts = fontStack();
  return (weight: number, size: number) => `${weight} ${size}px ${fonts}`;
}

/** لود فونت‌ها پیش از کشیدن متن روی canvas؛ شکست لود قابل قبوله (فونت جایگزین) */
export async function loadShareFonts(f: ShareFont, samples: [string, string] = ["استریک روز", "Arion 0123"]): Promise<void> {
  if (!document.fonts) return;
  try {
    await Promise.all([document.fonts.load(f(800, 56), samples[0]), document.fonts.load(f(600, 30), samples[1])]);
    await document.fonts.ready;
  } catch { /* فونت جایگزین هم قابل قبوله */ }
}

/**
 * canvas کارت + لایه‌ی پس‌زمینه‌ی شیشه‌ای (کش‌شده) + تبدیل مختصات: بعد از این،
 * همه‌ی کشیدن‌ها در مختصات منطقی قاب قدیمی (1080×1350 با مقیاس CS حول مرکز).
 */
export function beginShareCanvas(p: Palette, dpr: number, target?: HTMLCanvasElement): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = target ?? document.createElement("canvas");
  if (canvas.width !== W * dpr) canvas.width = W * dpr;
  if (canvas.height !== H * dpr) canvas.height = H * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // پس‌زمینه‌ی شیشه‌ای (صحنه، تاری، درخشش، نقطه‌ها، دانه) به
  // ورودی بستگی نداره — یک بار برای هر تم/تراکم ساخته و کش می‌شه، بعد 1:1 کپی.
  ctx.drawImage(backgroundLayer(p, dpr), 0, 0);
  ctx.scale(dpr, dpr);
  // محتوا در مختصات قاب قدیمی؛ مقیاس یکنواخت حول مرکز تا کل تصویر رو پر کنه
  ctx.translate(W / 2, H / 2);
  ctx.scale(CS, CS);
  ctx.translate(-W / 2, -H / 2);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return { canvas, ctx };
}

export type ShareTextFn = (s: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign, dir?: CanvasDirection, maxW?: number) => void;

/** کشیدن متن روی کارت — اعراب همیشه پاک می‌شه */
export function shareTextFn(ctx: CanvasRenderingContext2D): ShareTextFn {
  return (s, x, y, font, color, align, dir = isEn() ? "ltr" : "rtl", maxW) => {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.direction = dir;
    ctx.textBaseline = "alphabetic";
    // هیچ اعرابی روی تصویر نمیاد (درخواست صاحب محصول) — حتی اگه ورودی داشته باشه
    const plain = stripDiacritics(s);
    if (maxW) ctx.fillText(plain, x, y, maxW);
    else ctx.fillText(plain, x, y);
  };
}

/** خط‌های داخل کارت روی شیشه — نیمه‌شفاف، نه رنگ ثابت خط سطح‌ها */
export const shareHair = (p: Palette) => (p.light ? "rgba(0,0,0,.09)" : "rgba(255,255,255,.12)");

/** حاشیه‌ی افقی محتوای کارت (مختصات منطقی) و پایین ناحیه‌ی محتوا */
export const SHARE_PAD = 104;
export const SHARE_BOTTOM = CY + CH - 56;

/**
 * سربرگ مشترک کارت‌ها: لوگو + آدرس + کد دعوت (چپ)، عنوان + زیرعنوان (راست) و
 * خط جداکننده. خروجی: y خط جداکننده (شروع ناحیه‌ی محتوا).
 */
export function drawShareHeader(
  ctx: CanvasRenderingContext2D,
  text: ShareTextFn,
  f: ShareFont,
  p: Palette,
  logo: HTMLImageElement | null,
  h: { title: string; subtitle?: string; inviteCode?: string | null; host: string },
): number {
  const PAD = SHARE_PAD, R = W - PAD, L = PAD;
  // فارسی: لوگو چپ و عنوان راست؛ انگلیسی: آینه (لوگو راست، عنوان چپ)
  const en = isEn();
  const textDir: CanvasDirection = en ? "ltr" : "rtl";
  const aX = en ? R : L; // لبه‌ی ستون لوگو
  const aAlign: CanvasTextAlign = en ? "right" : "left";
  const tX = en ? L : R; // لبه‌ی ستون عنوان
  const tAlign: CanvasTextAlign = en ? "left" : "right";
  if (logo) {
    const lh = 66, lw = (logo.naturalWidth / logo.naturalHeight) * lh;
    ctx.drawImage(logo, en ? R - lw : L, 118, lw, lh);
  } else {
    text("ARION", aX, 172, f(900, 52), p.accent, aAlign, "ltr");
  }
  text(h.host, aX, 232, f(600, 28), p.muted, aAlign, "ltr");
  if (h.inviteCode) {
    const labText = tr("کد دعوت", "Invite code");
    ctx.font = f(800, 26);
    ctx.direction = "ltr";
    const codeW = ctx.measureText(h.inviteCode).width;
    ctx.direction = textDir;
    ctx.font = f(700, 24);
    const labW = ctx.measureText(labText).width;
    const pillW = codeW + labW + 56, pillY = 254;
    const pX = en ? R - pillW : L;
    roundRect(ctx, pX, pillY, pillW, 46, 23);
    ctx.lineWidth = 2;
    ctx.strokeStyle = `rgba(${p.accentRgb},.55)`;
    ctx.stroke();
    if (en) {
      text(labText, pX + 20, pillY + 31, f(700, 24), p.muted, "left");
      text(h.inviteCode, pX + pillW - 20, pillY + 32, f(800, 26), p.accent, "right", "ltr");
    } else {
      text(h.inviteCode, pX + 20, pillY + 32, f(800, 26), p.accent, "left", "ltr");
      text(labText, pX + pillW - 20, pillY + 31, f(700, 24), p.muted, "right");
    }
  }
  // عنوان هیچ‌وقت روی لوگو نمی‌افته — عرضش سقف داره
  text(h.title, tX, 170, f(900, 58), p.text, tAlign, textDir, 520);
  if (h.subtitle) text(h.subtitle, tX, 244, f(500, 30), p.muted, tAlign, textDir, 520);

  // بدون کد دعوت، سربرگ کوتاه‌تره و فضا به محتوا می‌رسه
  const top = h.inviteCode ? 334 : 290;
  ctx.strokeStyle = shareHair(p);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(L, top);
  ctx.lineTo(R, top);
  ctx.stroke();
  return top;
}

/** آدرس سایت روی کارت (بدون www) */
export const shareHost = () => (typeof window !== "undefined" ? window.location.host.replace(/^www\./, "") : "");

/**
 * قوس گرادیانی حلقه — عین GradientArc داشبورد: ریل کم‌رنگ، قوس با درخشش، گرادیان
 * در طول قوس (دو نیمه) و سر گرد با رنگ همون نقطه. v بین 0 و 1.
 */
export function drawGradientArc(ctx: CanvasRenderingContext2D, p: Palette, cx: number, cy: number, r: number, sw: number, value: number, colors: [string, string]) {
  ctx.lineCap = "round";
  ctx.lineWidth = sw;
  ctx.strokeStyle = rgba(colors[0], 0.15);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  const v = Math.max(0, Math.min(1, value));
  if (v > 0.001) {
    const top0 = -Math.PI / 2;
    // درخشش یک بار برای کل قوس (نه جدا برای هر نیمه — سایه‌ی نیمه‌ی دوم روی
    // محل اتصال یک درز می‌انداخت)؛ خود قوس گرادیانی بدون سایه روش کشیده می‌شه
    ctx.save();
    ctx.shadowColor = rgba(colors[1], 0.55);
    ctx.shadowBlur = 24;
    ctx.strokeStyle = mixColor(colors[0], colors[1], 0.5);
    ctx.beginPath();
    ctx.arc(cx, cy, r, top0, top0 + Math.PI * 2 * v);
    ctx.stroke();
    ctx.restore();
    ctx.save();
    // گرادیان در طول قوس، عین GradientArc داشبورد: نیمه‌ی اول از رنگ اول تا
    // میانه (بالا→پایین)، نیمه‌ی دوم از میانه تا رنگ دوم (پایین→بالا)
    const mid = mixColor(colors[0], colors[1], 0.5);
    const g1 = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
    g1.addColorStop(0, colors[0]);
    g1.addColorStop(1, mid);
    ctx.strokeStyle = g1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, top0, top0 + Math.PI * 2 * Math.min(v, 0.5));
    ctx.stroke();
    if (v > 0.5) {
      const g2 = ctx.createLinearGradient(cx, cy + r, cx, cy - r);
      g2.addColorStop(0, mid);
      g2.addColorStop(1, colors[1]);
      ctx.strokeStyle = g2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI / 2, top0 + Math.PI * 2 * v);
      ctx.stroke();
    }
    ctx.restore();
    // سر قوس: دایره‌ی کامل با رنگ همون نقطه و سایه‌ی نرم — عین سر حلقه‌ی داشبورد (.db-arc-cap)
    const end = -Math.PI / 2 + Math.PI * 2 * v;
    ctx.save();
    ctx.shadowColor = p.light ? "rgba(80,50,20,.35)" : "rgba(0,0,0,.45)";
    ctx.shadowBlur = sw * 0.24;
    ctx.fillStyle = mixColor(colors[0], colors[1], v);
    ctx.beginPath();
    ctx.arc(cx + r * Math.cos(end), cy + r * Math.sin(end), sw / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export async function renderShareCard(input: ShareCardInput, opts: RenderOpts = {}): Promise<HTMLCanvasElement> {
  const f = shareFont();
  const p = readPalette();
  const [logo] = await Promise.all([loadLogo(p.light), loadShareFonts(f)]);

  // خروجی با 2 برابر تراکم (2160×2700) — روی صفحه‌های رتینا و بعد از فشرده‌سازی
  // پیام‌رسان‌ها هم لبه‌ی متن و شیشه تیز می‌مونه. همه‌ی مختصات منطقی (1080×1350).
  // پیش‌نمایش زنده با dpr=1 رندر می‌شه (یک‌چهارم پیکسل‌ها) — همون صحنه، فقط کم‌تراکم‌تر.
  const dpr = opts.dpr ?? SHARE_DPR;
  const { canvas, ctx } = beginShareCanvas(p, dpr, opts.target);
  const text = shareTextFn(ctx);
  const hair = shareHair(p);

  // ── سربرگ: لوگو + آدرس (چپ)، عنوان + تاریخ (راست) ──
  const R = W - SHARE_PAD, L = SHARE_PAD;
  const top = drawShareHeader(ctx, text, f, p, logo, { title: input.title, subtitle: input.subtitle, inviteCode: input.inviteCode, host: shareHost() });
  const bottom = SHARE_BOTTOM;

  const b = input.body;

  // ── حلقه‌ها؛ وسطشون استریک ──
  if (b.kind === "rings") {
    const n = b.items.length;
    const legendH = n ? 150 : 0;
    const areaH = bottom - top - legendH;
    const sw = n >= 3 ? 42 : n === 2 ? 50 : 58, gap = 16;
    const outer = Math.min(300, areaH / 2 - 40);
    const cx = W / 2, cy = top + areaH / 2 + 10;
    b.items.forEach((it, i) => {
      const r = outer - sw / 2 - i * (sw + gap);
      drawGradientArc(ctx, p, cx, cy, r, sw, it.value, it.colors);
    });
    // مرکز: شعله + تعداد روزهای استریک، یا درصد تکمیل امروز (انتخاب کاربر)
    const inner = outer - n * (sw + gap);
    const k = Math.max(0.55, Math.min(1, inner / 170));
    if (b.center === "percent") {
      text(`${faNum(Math.max(0, Math.min(100, Math.round(b.percent))))}%`, cx, cy + 14 * k, f(900, 92 * k), p.text, "center", "ltr");
      text(tr("تکمیل امروز", "Done today"), cx, cy + 58 * k, f(700, 28 * k), p.muted, "center");
    } else {
      drawFlame(ctx, cx, cy - 34 * k, 78 * k, b.streak, false);
      text(faNum(b.streak), cx, cy + 62 * k, f(900, 92 * k), p.text, "center", "ltr");
      text(tr("روز استریک", "day streak"), cx, cy + 106 * k, f(700, 28 * k), p.muted, "center");
    }

    // لیجند: یک ستون برای هر حلقه
    if (n) {
      const ly = bottom - legendH + 20;
      const colW = (R - L) / n;
      b.items.forEach((it, i) => {
        const x = isEn() ? L + colW * i + colW / 2 : R - colW * i - colW / 2; // فارسی راست‌به‌چپ، انگلیسی چپ‌به‌راست
        ctx.fillStyle = it.colors[1];
        ctx.beginPath();
        ctx.arc(x, ly + 12, 11, 0, Math.PI * 2);
        ctx.fill();
        if (it.display) {
          text(it.label, x, ly + 70, f(700, 32), p.muted, "center");
          text(it.display, x, ly + 122, f(900, 44), p.text, "center", "ltr");
        } else {
          text(it.label, x, ly + 84, f(800, 34), p.text, "center");
        }
      });
    }
  }

  // ── استریک (جشن استریک): شعله‌ی بزرگ + عدد + هفته ──
  if (b.kind === "streak") {
    const cx = W / 2;
    drawFlame(ctx, cx, top + 420, 280, b.streak);
    text(faNum(b.streak), cx, top + 600, f(900, 170), p.text, "center", "ltr");
    text(b.label, cx, top + 665, f(700, 36), p.muted, "center");
    const wk = b.week;
    const pal = flamePalette(b.streak);
    const span = R - L - 60, step = span / 6, wy = top + 790;
    for (let i = 0; i < 7; i++) {
      const x = isEn() ? L + 30 + i * step : R - 30 - i * step; // هفته از شنبه؛ فارسی راست‌به‌چپ، انگلیسی چپ‌به‌راست
      text(wk.labels[i], x, wy, f(700, 30), i === wk.todayIdx ? p.text : p.muted, "center");
      const cy = wy + 70;
      ctx.beginPath();
      ctx.arc(x, cy, 38, 0, Math.PI * 2);
      if (wk.done[i]) {
        const g = ctx.createLinearGradient(x, cy + 38, x, cy - 38);
        g.addColorStop(0, pal.outer[1]);
        g.addColorStop(1, pal.mid[0]);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 7;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(x - 14, cy + 1);
        ctx.lineTo(x - 3, cy + 12);
        ctx.lineTo(x + 16, cy - 10);
        ctx.stroke();
      } else {
        ctx.lineWidth = 3;
        ctx.strokeStyle = hair;
        ctx.stroke();
      }
    }
  }

  return canvas;
}

export async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
  if (!blob) throw new Error("blob");
  return blob;
}

/**
 * مرورگر می‌تونه *فایل* تصویر رو مستقیم به برگه‌ی اشتراک سیستم بده؟ (موبایل و
 * بعضی دسکتاپ‌ها بله؛ بقیه فقط دانلود) — برای این‌که برچسب تنها دکمه‌ی اشتراک
 * از قبل درست باشه («اشتراک‌گذاری» یا «ذخیره تصویر»).
 */
export function canShareFiles(): boolean {
  try {
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (typeof nav.share !== "function" || typeof nav.canShare !== "function") return false;
    return nav.canShare({ files: [new File([new Uint8Array([0])], "arion.png", { type: "image/png" })] });
  } catch {
    return false;
  }
}

/**
 * اشتراک تصویر: اگه مرورگر اشتراک فایل داره (موبایل) با navigator.share
 * (همراه متن و لینک دعوت)، وگرنه PNG دانلود می‌شه. «cancelled» یعنی کاربر
 * خودش برگه‌ی اشتراک رو بست — خطا نیست.
 */
export async function shareImage(blob: Blob, name: string, title: string, textBody: string): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = new File([blob], name, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title, text: textBody });
      return "shared";
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return "cancelled";
    }
  }
  downloadBlob(blob, name);
  return "downloaded";
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** متن همراه تصویر — کد دعوت و آدرس سایت فقط این‌جا (نه روی خود تصویر) */
export function shareText(lead: string, invite: { code: string | null; url: string; percent: number } | null): string {
  if (!invite) return lead;
  const offer = invite.code ? tr(` با کد دعوت من (${invite.code}) ${faNum(invite.percent)}% تخفیف بگیر:`, ` get ${invite.percent}% off with my invite code (${invite.code}):`) : "";
  return `${lead}\n${tr("تو هم بیا روتینت رو بساز —", "Come build your routine too —")}${offer} ${invite.url}`;
}
