"use client";

// کارتِ اشتراکیِ «موفقیت» — یک تصویرِ PNG (۱۰۸۰×۱۳۵۰) که کاربر با دوستاش به
// اشتراک می‌ذاره. هر کارت *یک* محتوا داره (حلقه‌ها یا نقشه‌ی ثبات یا استریک) تا
// فضا شلوغ نشه؛ داخلِ حلقه‌ها تعدادِ روزهای استریک میاد. بالای کارت لوگوی هدر
// (نشان + اسمِ برند)، آدرسِ سایت و — اگه کاربر بخواد — کدِ دعوتش؛ پایینِ کارت
// هیچ لینکی نیست. هیچ داده‌ای از دستگاه بیرون نمی‌ره مگر همین تصویر، وقتی خودش
// «اشتراک» رو می‌زنه.
//
// رنگ‌ها از توکن‌های تمِ فعلی خونده می‌شن (مثلِ WeeklyAnalysisShare) تا تصویر
// هم‌رنگِ همون چیزی باشه که کاربر روی صفحه می‌بینه.

import { faNum } from "./jalali";
import { FLAME_BOX, FLAME_LAYERS, flamePalette, flamePath, layerFrame } from "./streakFlameShape";

/** display=null یعنی کاربر عددِ این حلقه رو پنهان کرده — خودِ حلقه کشیده می‌شه، عددش نه */
export type ShareRing = { label: string; value: number; display: string | null; colors: [string, string] };

export type ShareMonthCell = { jd: number; level: number; today: boolean; future: boolean };

/** محتوای اصلیِ کارت — هر کارت دقیقا *یکی* از این‌هاست (کاربر خودش انتخاب می‌کنه) */
export type ShareBody =
  | { kind: "rings"; streak: number; items: ShareRing[] }
  | { kind: "month"; streak: number; title: string; lead: number; cells: ShareMonthCell[]; stats: { label: string; value: string }[] }
  | { kind: "streak"; streak: number; label: string; week: { labels: string[]; done: boolean[]; todayIdx: number } };

export type ShareCardInput = {
  title: string;
  subtitle?: string;
  body: ShareBody;
  /** کدِ دعوت — بالای کارت، کنارِ آدرسِ سایت (پایینِ کارت هیچ لینکی نیست) */
  inviteCode?: string | null;
};

// یک قالبِ ثابت (۴:۵) — هم پست هم استوری/چت بدونِ برش نشونش می‌دن
export const SHARE_W = 1080;
export const SHARE_H = 1350;
/** تراکمِ پیکسلِ خروجی */
const SHARE_DPR = 2;
const W = SHARE_W;
const H = SHARE_H;

type Palette = {
  bg: string; surface: string; line: string; accent: string; accentRgb: string;
  text: string; muted: string; loss: string; heat: string; heatHi: string; light: boolean;
};

function readPalette(): Palette {
  const cs = getComputedStyle(document.body);
  const v = (name: string, fb: string) => cs.getPropertyValue(name).trim() || fb;
  const db = document.querySelector(".db-page");
  const ds = db ? getComputedStyle(db) : null;
  const light = document.body.getAttribute("data-theme") === "light";
  return {
    bg: v("--bg", "#0E1011"),
    surface: v("--surface-1", "#171A1C"),
    line: v("--surface-line", "#2A2F33"),
    accent: v("--accent", "#00A86B"),
    accentRgb: v("--accent-rgb", "0,168,107"),
    text: v("--text", "#EDEFEE"),
    muted: v("--muted", "#8A9099"),
    loss: v("--pnl-loss", "#E05252"),
    heat: ds?.getPropertyValue("--ring-1a").trim() || (light ? "#0A9A70" : "#00C98D"),
    heatHi: ds?.getPropertyValue("--ring-1b").trim() || (light ? "#2ECB98" : "#7DF9CF"),
    light,
  };
}

function fontStack(): string {
  const cs = getComputedStyle(document.documentElement);
  const vazir = cs.getPropertyValue("--font-vazir").trim();
  const latin = cs.getPropertyValue("--font-latin").trim();
  return [latin, vazir, "sans-serif"].filter(Boolean).join(", ");
}

/** رنگِ هگز یا rgb() → rgba با شفافیتِ دلخواه (توکن‌های تم هر دو شکل رو دارن) */
function rgba(color: string, a: number): string {
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

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** شعله‌ی بزرگ (یک فریمِ همون شعله‌ی زنده) با مرکزِ پایه در (x, y) و عرضِ size */
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
  FLAME_LAYERS.forEach((l, li) => {
    const lb = FLAME_BOX.by - li * 6;
    const g = ctx.createLinearGradient(0, lb, 0, lb - l.base.h);
    g.addColorStop(0, pal[l.key][1]);
    g.addColorStop(1, pal[l.key][0]);
    ctx.fillStyle = g;
    ctx.fill(new Path2D(flamePath(FLAME_BOX.cx, lb, layerFrame(l, 1))));
  });
  ctx.restore();
}

// ── پس‌زمینه‌ی شیشه‌ای ─────────────────────────────────────────────
// یک صحنه‌ی نورانی (چند هاله‌ی رنگیِ خیلی پخش) ساخته می‌شه و *فقط داخلِ قابِ
// کارت* دیده می‌شه — بیرونِ کارت رنگِ ساده‌ی پس‌زمینه‌ست. داخلِ قاب: نسخه‌ی خیلی
// تارِ صحنه + لایه‌ی رنگِ شیری + درخششِ لبه‌ی بالا + حاشیه‌ی نوری. تاری با
// کوچک‌کردنِ مرحله‌ای و بزرگ‌کردنِ دوباره ساخته می‌شه (نه ctx.filter) تا روی همه‌ی
// مرورگرها — از جمله سافاریِ قدیمی — یکسان و نرم دربیاد.
type Orb = { x: number; y: number; r: number; color: string; a: number; soft: boolean };

// فقط رنگ‌های برند: اکسنتِ تم (سبزِ آریون در شب، مسیِ گرم در روز) + رنگِ دومِ
// لوگو (فیروزه‌ایِ نشان در شب، طلاییِ گرم در روز). کم و آرام — کارت باید «آریون»
// به‌نظر بیاد، نه رنگین‌کمان؛ رنگِ داده‌ها (حلقه‌ها/نقشه) خودشون روی شیشه می‌درخشن.
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

/** نسخه‌ی تارِ صحنه: کوچک‌کردنِ نصف‌به‌نصف تا عرضِ `target` (بدونِ پله‌پله‌شدن) */
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

/** دانه‌ی خیلی ریزِ شیشه‌ی مات — یک کاشیِ کوچکِ تکرارشونده، با شفافیتِ کم */
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
// لوگوی هدر (نشان + اسمِ برند، همون فایلی که NavDrawer نشون می‌ده) — نسخه‌ی تمِ فعلی
const loadLogo = (light: boolean) => loadImage(light ? "/images/logo-lockup-light-theme.webp" : "/images/logo-lockup-dark-theme.png");

/** شبکه‌ی نقطه‌های ریز که از وسط به لبه‌ها محو می‌شه */
function drawDotGrid(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, p: Palette) {
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

export async function renderShareCard(input: ShareCardInput): Promise<HTMLCanvasElement> {
  const fonts = fontStack();
  const f = (weight: number, size: number) => `${weight} ${size}px ${fonts}`;
  const p = readPalette();
  const [logo] = await Promise.all([
    loadLogo(p.light),
    (async () => {
      if (!document.fonts) return;
      try {
        await Promise.all([document.fonts.load(f(800, 56), "استریک روز"), document.fonts.load(f(600, 30), "Arion 0123")]);
        await document.fonts.ready;
      } catch { /* فونتِ جایگزین هم قابلِ قبوله */ }
    })(),
  ]);

  // خروجی با ۲ برابرِ تراکم (۲۱۶۰×۲۷۰۰) — روی صفحه‌های رتینا و بعد از فشرده‌سازیِ
  // پیام‌رسان‌ها هم لبه‌ی متن و شیشه تیز می‌مونه. همه‌ی مختصات منطقی (۱۰۸۰×۱۳۵۰).
  const canvas = document.createElement("canvas");
  canvas.width = W * SHARE_DPR;
  canvas.height = H * SHARE_DPR;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.scale(SHARE_DPR, SHARE_DPR);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const text = (s: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign, dir: CanvasDirection = "rtl", maxW?: number) => {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.direction = dir;
    ctx.textBaseline = "alphabetic";
    if (maxW) ctx.fillText(s, x, y, maxW);
    else ctx.fillText(s, x, y);
  };

  // ── صحنه‌ی نورانیِ پشت + کارتِ شیشه‌ی مات ──
  const scene = document.createElement("canvas");
  scene.width = W;
  scene.height = H;
  const sc = scene.getContext("2d");
  if (!sc) throw new Error("canvas");
  paintScene(sc, W, H, p);
  // بیرونِ کارت ساده و بی‌رنگه — رنگ‌ها فقط داخلِ شیشه دیده می‌شن
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, W, H);

  const CX = 48, CY = 48, CW = W - 96, CH = H - 96, CR = 52;
  // سایه‌ی نرمِ زیرِ شیشه
  ctx.save();
  roundRect(ctx, CX, CY, CW, CH, CR);
  ctx.shadowColor = p.light ? "rgba(80,50,20,.22)" : "rgba(0,0,0,.55)";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 24;
  ctx.fillStyle = p.bg;
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, CX, CY, CW, CH, CR);
  ctx.clip();
  // خودِ «ماتی»: صحنه‌ی خیلی تار شده داخلِ قاب
  // خیلی تار (عرضِ ۱۷px و بعد بزرگ) تا رنگ‌ها کاملا پخش و بی‌لبه باشن
  ctx.drawImage(blurredScene(scene, 17), 0, 0, W, H);
  // رنگِ شیری/دودیِ شیشه
  ctx.fillStyle = p.light ? "rgba(255,255,255,.3)" : rgba(p.bg, 0.44);
  ctx.fillRect(CX, CY, CW, CH);
  // درخششِ بالای شیشه (نور از بالا-چپ)
  const sheen = ctx.createLinearGradient(CX, CY, CX + CW * 0.55, CY + CH * 0.45);
  sheen.addColorStop(0, p.light ? "rgba(255,255,255,.42)" : "rgba(255,255,255,.12)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(CX, CY, CW, CH);
  // طرح: شبکه‌ی نقطه‌ایِ محو (زیرِ محتوا)
  drawDotGrid(ctx, CX, CY, CW, CH, p);
  // دانه‌ی ریز
  const grain = grainPattern(ctx, p.light);
  if (grain) {
    ctx.fillStyle = grain;
    ctx.fillRect(CX, CY, CW, CH);
  }
  ctx.restore();

  // حاشیه‌ی نوری: روشن بالا-چپ، محو پایین-راست + یه خطِ داخلیِ نازک
  const edge = ctx.createLinearGradient(CX, CY, CX + CW, CY + CH);
  // لبه‌ی بالا-چپ ته‌رنگِ برند داره — همون نوری که از گوشه‌ی اکسنت میاد
  edge.addColorStop(0, p.light ? rgba(p.accent, 0.55) : `rgba(${p.accentRgb},.6)`);
  edge.addColorStop(0.18, p.light ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.26)");
  edge.addColorStop(0.5, p.light ? "rgba(255,255,255,.35)" : "rgba(255,255,255,.08)");
  edge.addColorStop(1, p.light ? "rgba(255,255,255,.7)" : "rgba(255,255,255,.18)");
  roundRect(ctx, CX + 1, CY + 1, CW - 2, CH - 2, CR - 1);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = edge;
  ctx.stroke();
  roundRect(ctx, CX + 4, CY + 4, CW - 8, CH - 8, CR - 4);
  ctx.lineWidth = 1;
  ctx.strokeStyle = p.light ? "rgba(0,0,0,.05)" : "rgba(0,0,0,.25)";
  ctx.stroke();

  // خط‌های داخلِ کارت روی شیشه — نیمه‌شفاف، نه رنگِ ثابتِ خطِ سطح‌ها
  const hair = p.light ? "rgba(0,0,0,.09)" : "rgba(255,255,255,.12)";

  // ── سربرگ: لوگو + آدرس (چپ)، عنوان + تاریخ (راست) ──
  const PAD = 104, R = W - PAD, L = PAD;
  if (logo) {
    const lh = 66, lw = (logo.naturalWidth / logo.naturalHeight) * lh;
    ctx.drawImage(logo, L, 118, lw, lh);
  } else {
    text("ARION", L, 172, f(900, 52), p.accent, "left", "ltr");
  }
  const host = typeof window !== "undefined" ? window.location.host.replace(/^www\./, "") : "";
  text(host, L, 232, f(600, 28), p.muted, "left", "ltr");
  if (input.inviteCode) {
    ctx.font = f(800, 26);
    ctx.direction = "ltr";
    const codeW = ctx.measureText(input.inviteCode).width;
    ctx.direction = "rtl";
    ctx.font = f(700, 24);
    const labW = ctx.measureText("کدِ دعوت").width;
    const pillW = codeW + labW + 56, pillY = 254;
    roundRect(ctx, L, pillY, pillW, 46, 23);
    ctx.lineWidth = 2;
    ctx.strokeStyle = `rgba(${p.accentRgb},.55)`;
    ctx.stroke();
    text(input.inviteCode, L + 20, pillY + 32, f(800, 26), p.accent, "left", "ltr");
    text("کدِ دعوت", L + pillW - 20, pillY + 31, f(700, 24), p.muted, "right");
  }
  // عنوان هیچ‌وقت روی لوگو نمی‌افته — عرضش سقف داره
  text(input.title, R, 170, f(900, 58), p.text, "right", "rtl", 520);
  if (input.subtitle) text(input.subtitle, R, 244, f(500, 30), p.muted, "right", "rtl", 520);

  // بدونِ کدِ دعوت، سربرگ کوتاه‌تره و فضا به محتوا می‌رسه
  const top = input.inviteCode ? 334 : 290, bottom = CY + CH - 56;
  ctx.strokeStyle = hair;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(L, top);
  ctx.lineTo(R, top);
  ctx.stroke();

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
      ctx.lineCap = "round";
      ctx.lineWidth = sw;
      ctx.strokeStyle = rgba(it.colors[0], 0.15);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      const v = Math.max(0, Math.min(1, it.value));
      if (v > 0.001) {
        ctx.save();
        ctx.shadowColor = rgba(it.colors[1], 0.55);
        ctx.shadowBlur = 24;
        const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
        g.addColorStop(0, it.colors[0]);
        g.addColorStop(1, it.colors[1]);
        ctx.strokeStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * v);
        ctx.stroke();
        ctx.restore();
      }
    });
    // مرکز: شعله + تعدادِ روزهای استریک
    const inner = outer - n * (sw + gap);
    const k = Math.max(0.55, Math.min(1, inner / 170));
    drawFlame(ctx, cx, cy - 34 * k, 78 * k, b.streak, false);
    text(faNum(b.streak), cx, cy + 62 * k, f(900, 92 * k), p.text, "center", "ltr");
    text("روز استریک", cx, cy + 106 * k, f(700, 28 * k), p.muted, "center");

    // لیجند: یک ستون برای هر حلقه
    if (n) {
      const ly = bottom - legendH + 20;
      const colW = (R - L) / n;
      b.items.forEach((it, i) => {
        const x = R - colW * i - colW / 2; // راست‌به‌چپ
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

  // ── نقشه‌ی ثباتِ ماه ──
  if (b.kind === "month") {
    text(b.title, R, top + 78, f(900, 44), p.text, "right");
    const rows = Math.ceil((b.lead + b.cells.length) / 7);
    const statsH = 150;
    const gridTop = top + 150;
    const gap = 14;
    const cell = Math.min(104, Math.floor((bottom - statsH - gridTop - 30 - (rows - 1) * gap) / rows));
    const gridW = 7 * cell + 6 * gap;
    const x0 = (W - gridW) / 2;
    ["ش", "ی", "د", "س", "چ", "پ", "ج"].forEach((hd, i) =>
      text(hd, x0 + gridW - i * (cell + gap) - cell / 2, gridTop - 20, f(700, 28), p.muted, "center")
    );
    const all: (ShareMonthCell | null)[] = [...Array(b.lead).fill(null), ...b.cells];
    all.forEach((cl, idx) => {
      if (!cl) return;
      const col = idx % 7, row = Math.floor(idx / 7);
      const x = x0 + gridW - (col + 1) * cell - col * gap;
      const y = gridTop + row * (cell + gap);
      roundRect(ctx, x, y, cell, cell, cell * 0.24);
      const lv = cl.future ? -2 : cl.level;
      if (lv === 4) {
        const g = ctx.createLinearGradient(x, y, x + cell, y + cell);
        g.addColorStop(0, p.heat);
        g.addColorStop(1, p.heatHi);
        ctx.fillStyle = g;
      } else if (lv === 3) ctx.fillStyle = rgba(p.heat, 0.7);
      else if (lv === 2) ctx.fillStyle = rgba(p.heat, 0.45);
      else if (lv === 1) ctx.fillStyle = rgba(p.heat, 0.24);
      else if (lv === 0) ctx.fillStyle = rgba(p.loss, 0.2);
      else ctx.fillStyle = rgba(p.muted, lv === -2 ? 0.05 : 0.1);
      ctx.fill();
      if (cl.today) {
        ctx.lineWidth = 4;
        ctx.strokeStyle = p.text;
        ctx.stroke();
      }
      const fg = lv === 4 ? (p.light ? "#fff" : "#062a1e") : lv === 3 ? "#fff" : lv === 0 ? p.loss : p.muted;
      text(faNum(cl.jd), x + cell / 2, y + cell / 2 + cell * 0.13, f(800, Math.round(cell * 0.34)), fg, "center", "ltr");
    });

    // آمار: استریک (با شعله) + بقیه
    const sy = bottom - statsH + 20;
    const stats = [{ label: "روز استریک", value: faNum(b.streak), flame: true }, ...b.stats.map((s) => ({ ...s, flame: false }))];
    const colW = (R - L) / stats.length;
    stats.forEach((s, i) => {
      const x = R - colW * i - colW / 2;
      if (i > 0) {
        ctx.strokeStyle = hair;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + colW / 2, sy + 10);
        ctx.lineTo(x + colW / 2, sy + 110);
        ctx.stroke();
      }
      ctx.font = f(900, 52);
      ctx.direction = "ltr";
      const vw = ctx.measureText(s.value).width;
      if (s.flame) {
        drawFlame(ctx, x + vw / 2 + 26, sy + 62, 40, b.streak, false);
        text(s.value, x - 18, sy + 62, f(900, 52), p.text, "center", "ltr");
      } else {
        text(s.value, x, sy + 62, f(900, 52), p.text, "center", "ltr");
      }
      text(s.label, x, sy + 108, f(700, 28), p.muted, "center");
    });
  }

  // ── استریک (جشنِ استریک): شعله‌ی بزرگ + عدد + هفته ──
  if (b.kind === "streak") {
    const cx = W / 2;
    drawFlame(ctx, cx, top + 420, 280, b.streak);
    text(faNum(b.streak), cx, top + 600, f(900, 170), p.text, "center", "ltr");
    text(b.label, cx, top + 665, f(700, 36), p.muted, "center");
    const wk = b.week;
    const pal = flamePalette(b.streak);
    const span = R - L - 60, step = span / 6, wy = top + 790;
    for (let i = 0; i < 7; i++) {
      const x = R - 30 - i * step; // هفته از شنبه، راست‌به‌چپ
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
 * اشتراکِ تصویر: اگه مرورگر اشتراکِ فایل داره (موبایل) با navigator.share
 * (همراهِ متن و لینکِ دعوت)، وگرنه PNG دانلود می‌شه. «cancelled» یعنی کاربر
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

/** متنِ همراهِ تصویر — کدِ دعوت و آدرسِ سایت فقط این‌جا (نه روی خودِ تصویر) */
export function shareText(lead: string, invite: { code: string | null; url: string; percent: number } | null): string {
  if (!invite) return lead;
  const offer = invite.code ? ` با کدِ دعوتِ من (${invite.code}) ${faNum(invite.percent)}% تخفیف بگیر:` : "";
  return `${lead}\nتو هم بیا روتینت رو بساز —${offer} ${invite.url}`;
}
