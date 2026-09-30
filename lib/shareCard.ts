"use client";

// کارتِ اشتراکیِ «موفقیت» — یک تصویرِ PNG که کاربر با دوستاش به اشتراک می‌ذاره.
// فقط بخش‌هایی که خودش روشن کرده کشیده می‌شن (مثلا کالری رو می‌تونه خاموش
// کنه) و هیچ داده‌ای از دستگاه بیرون نمی‌ره مگر همین تصویر، وقتی خودش «اشتراک»
// رو می‌زنه. پایینِ کارت کدِ دعوتِ کاربره: دوستش با اون روی اولین اشتراک
// تخفیف می‌گیره — «بهونه»ی اشتراک‌گذاری (lib/invite.ts).
//
// رنگ‌ها از توکن‌های تمِ فعلی خونده می‌شن (مثلِ WeeklyAnalysisShare) تا تصویر
// هم‌رنگِ همون چیزی باشه که کاربر روی صفحه می‌بینه.

import { BRAND_EN, BRAND_FA } from "./brand";
import { faNum } from "./jalali";
import { FLAME_BOX, FLAME_LAYERS, flamePalette, flamePath, layerFrame } from "./streakFlameShape";

export type ShareFormat = "post" | "story";

export type ShareRing = { label: string; value: number; display: string; colors: [string, string] };

export type ShareCardInput = {
  format: ShareFormat;
  title: string;
  subtitle?: string;
  name?: string | null;
  streak?: { days: number; label: string } | null;
  /** ردیفِ ۷ روزِ این هفته (شنبه..جمعه) — true یعنی روزِ کامل */
  week?: { labels: string[]; done: boolean[]; todayIdx: number } | null;
  rings?: { centerPct: number; items: ShareRing[] } | null;
  month?: {
    title: string;
    lead: number;
    cells: { jd: number; level: number; today: boolean; future: boolean }[];
    stats: { label: string; value: string }[];
  } | null;
  invite?: { code: string | null; url: string; percent: number } | null;
};

const W = 1080;
const SIZE: Record<ShareFormat, number> = { post: 1350, story: 1920 };

type Palette = {
  bg: string; surface: string; line: string; accent: string; accentRgb: string;
  text: string; muted: string; loss: string; heat: string; heatHi: string;
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
  };
}

function fontStack(): string {
  const cs = getComputedStyle(document.documentElement);
  const vazir = cs.getPropertyValue("--font-vazir").trim();
  const latin = cs.getPropertyValue("--font-latin").trim();
  return [latin, vazir, "sans-serif"].filter(Boolean).join(", ");
}

function rgba(hex: string, a: number): string {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
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

/** شعله‌ی بزرگ (فریمِ اولِ همون شعله‌ی زنده) با مرکزِ پایه در (x, y) و عرضِ size */
function drawFlame(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, days: number) {
  const pal = flamePalette(days);
  const s = size / FLAME_BOX.w;
  ctx.save();
  ctx.translate(x - FLAME_BOX.cx * s, y - FLAME_BOX.by * s);
  ctx.scale(s, s);
  const glow = ctx.createRadialGradient(FLAME_BOX.cx, FLAME_BOX.by - 90, 10, FLAME_BOX.cx, FLAME_BOX.by - 90, 130);
  glow.addColorStop(0, `rgba(${pal.glow},.45)`);
  glow.addColorStop(1, `rgba(${pal.glow},0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(-40, -20, FLAME_BOX.w + 80, FLAME_BOX.h + 40);
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

type Section = { h: number; draw: (ctx: CanvasRenderingContext2D, w: number) => void };

export async function renderShareCard(input: ShareCardInput): Promise<HTMLCanvasElement> {
  const fonts = fontStack();
  const f = (weight: number, size: number) => `${weight} ${size}px ${fonts}`;
  if (document.fonts) {
    try {
      await Promise.all([document.fonts.load(f(800, 56), "استریک روز"), document.fonts.load(f(600, 30), "Arion 0123")]);
      await document.fonts.ready;
    } catch { /* فونتِ جایگزین هم قابلِ قبوله */ }
  }

  const H = SIZE[input.format];
  const p = readPalette();
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");

  const text = (s: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign, dir: CanvasDirection = "rtl") => {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.direction = dir;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(s, x, y);
  };

  // پس‌زمینه + هاله‌ی ملایم + قابِ کارت
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, H * 0.38, 40, W / 2, H * 0.38, 700);
  glow.addColorStop(0, `rgba(${p.accentRgb},.2)`);
  glow.addColorStop(1, `rgba(${p.accentRgb},0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  roundRect(ctx, 60, 60, W - 120, H - 120, 44);
  ctx.fillStyle = p.surface;
  ctx.globalAlpha = 0.92;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 2;
  ctx.strokeStyle = p.line;
  ctx.stroke();

  // سربرگ
  const R = W - 120, L = 120;
  text(input.name ? `${input.title} — ${input.name}` : input.title, R, 180, f(800, 54), p.text, "right");
  if (input.subtitle) text(input.subtitle, R, 238, f(500, 32), p.muted, "right");
  text(BRAND_EN, L, 180, f(800, 44), p.accent, "left", "ltr");

  // ── بخش‌ها ──
  const sections: Section[] = [];

  const streakBlock = (ctx2: CanvasRenderingContext2D, cx: number, top: number) => {
    const s = input.streak!;
    drawFlame(ctx2, cx, top + 210, 170, s.days);
    text(faNum(s.days), cx, top + 330, f(900, 110), p.text, "center", "ltr");
    text(s.label, cx, top + 385, f(700, 34), p.muted, "center");
  };
  const ringsBlock = (ctx2: CanvasRenderingContext2D, cx: number, top: number, legendBelow: boolean) => {
    const rg = input.rings!;
    const cy = top + 170, outer = 150, sw = 26, gap = 10;
    rg.items.forEach((it, i) => {
      const r = outer - sw / 2 - i * (sw + gap);
      ctx2.lineCap = "round";
      ctx2.lineWidth = sw;
      ctx2.strokeStyle = rgba(it.colors[0], 0.16);
      ctx2.beginPath();
      ctx2.arc(cx, cy, r, 0, Math.PI * 2);
      ctx2.stroke();
      const v = Math.max(0, Math.min(1, it.value));
      if (v > 0) {
        const g = ctx2.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
        g.addColorStop(0, it.colors[0]);
        g.addColorStop(1, it.colors[1]);
        ctx2.strokeStyle = g;
        ctx2.beginPath();
        ctx2.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * v);
        ctx2.stroke();
      }
    });
    const inner = outer - rg.items.length * (sw + gap);
    const big = inner > 70;
    text(`${faNum(Math.round(rg.centerPct))}%`, cx, cy + (big ? 16 : 12), f(900, big ? 54 : 38), p.text, "center", "ltr");
    if (big) text("امروز", cx, cy + 54, f(600, 24), p.muted, "center");
    if (legendBelow) {
      const y0 = top + 370;
      rg.items.forEach((it, i) => {
        const y = y0 + i * 52;
        ctx2.fillStyle = it.colors[1];
        ctx2.beginPath();
        ctx2.arc(cx + 190, y - 11, 10, 0, Math.PI * 2);
        ctx2.fill();
        text(it.label, cx + 165, y, f(700, 32), p.text, "right");
        text(it.display, cx - 190, y, f(800, 32), p.text, "left", "ltr");
      });
    }
  };

  if (input.rings && input.streak) {
    // دو ستون: استریک راست، حلقه‌ها (با لیجندِ زیرشون) چپ
    sections.push({
      h: Math.max(410, 380 + input.rings.items.length * 52),
      draw: (c, w) => {
        streakBlock(c, w * 0.75, 0);
        ringsBlock(c, w * 0.25, 0, true);
      },
    });
  } else if (input.streak) {
    sections.push({ h: 410, draw: (c, w) => streakBlock(c, w / 2, 0) });
  } else if (input.rings) {
    sections.push({ h: 380 + input.rings.items.length * 52, draw: (c, w) => ringsBlock(c, w / 2, 0, true) });
  }

  if (input.week) {
    const wk = input.week;
    sections.push({
      h: 150,
      draw: (c, w) => {
        const n = 7, cell = 92, span = w - 80;
        const step = span / (n - 1);
        const pal = flamePalette(input.streak?.days ?? 1);
        for (let i = 0; i < n; i++) {
          // هفته از شنبه، راست‌به‌چپ
          const x = w - 40 - i * step;
          text(wk.labels[i], x, 34, f(700, 30), i === wk.todayIdx ? p.text : p.muted, "center");
          const cy = 100;
          c.beginPath();
          c.arc(x, cy, cell / 2 - 6, 0, Math.PI * 2);
          if (wk.done[i]) {
            const g = c.createLinearGradient(x, cy + 40, x, cy - 40);
            g.addColorStop(0, pal.outer[1]);
            g.addColorStop(1, pal.mid[0]);
            c.fillStyle = g;
            c.fill();
            // تیک
            c.strokeStyle = "#fff";
            c.lineWidth = 7;
            c.lineCap = "round";
            c.lineJoin = "round";
            c.beginPath();
            c.moveTo(x - 14, cy + 1);
            c.lineTo(x - 3, cy + 12);
            c.lineTo(x + 16, cy - 10);
            c.stroke();
          } else {
            c.fillStyle = rgba(p.muted.startsWith("#") ? p.muted : "#8A9099", 0.14);
            c.fill();
          }
        }
      },
    });
  }

  if (input.month) {
    const m = input.month;
    const rows = Math.ceil((m.lead + m.cells.length) / 7);
    const cell = 74, gap = 12;
    sections.push({
      h: 150 + rows * (cell + gap),
      draw: (c, w) => {
        text(m.title, w - 20, 44, f(800, 40), p.text, "right");
        m.stats.forEach((s, i) => {
          text(`${s.label}: ${s.value}`, 20 + i * 250, 44, f(600, 28), p.muted, "left");
        });
        const gridW = 7 * cell + 6 * gap;
        const x0 = (w - gridW) / 2;
        const heads = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
        heads.forEach((hd, i) => text(hd, x0 + gridW - i * (cell + gap) - cell / 2, 110, f(700, 26), p.muted, "center"));
        const all = [...Array(m.lead).fill(null), ...m.cells];
        all.forEach((cl, idx) => {
          if (!cl) return;
          const col = idx % 7, row = Math.floor(idx / 7);
          const x = x0 + gridW - (col + 1) * cell - col * gap;
          const y = 134 + row * (cell + gap);
          roundRect(c, x, y, cell, cell, 16);
          const lv = cl.future ? -2 : cl.level;
          if (lv === 4) {
            const g = c.createLinearGradient(x, y, x + cell, y + cell);
            g.addColorStop(0, p.heat);
            g.addColorStop(1, p.heatHi);
            c.fillStyle = g;
          } else if (lv === 3) c.fillStyle = rgba(p.heat, 0.7);
          else if (lv === 2) c.fillStyle = rgba(p.heat, 0.45);
          else if (lv === 1) c.fillStyle = rgba(p.heat, 0.24);
          else if (lv === 0) c.fillStyle = rgba(p.loss, 0.18);
          else c.fillStyle = rgba(p.heat, 0.06);
          c.fill();
          if (cl.today) {
            c.lineWidth = 4;
            c.strokeStyle = p.text;
            c.stroke();
          }
          text(faNum(cl.jd), x + cell / 2, y + cell / 2 + 10, f(700, 26), lv >= 3 ? "#fff" : p.muted, "center", "ltr");
        });
      },
    });
  }

  // دعوت (پایین) یا فقط برند
  const footH = input.invite ? 230 : 120;
  const top = 290, bottom = H - 60 - footH - 20;
  const avail = bottom - top;
  const gapY = 50;
  const total = sections.reduce((a, s) => a + s.h, 0) + gapY * Math.max(0, sections.length - 1);
  const scale = total > avail ? avail / total : 1;
  const innerW = W - 240;
  let y = top + Math.max(0, (avail - total * scale) / 2);
  for (const s of sections) {
    ctx.save();
    ctx.translate(120 + (innerW - innerW * scale) / 2, y);
    ctx.scale(scale, scale);
    s.draw(ctx, innerW);
    ctx.restore();
    y += (s.h + gapY) * scale;
  }

  if (input.invite) {
    const fy = H - 60 - footH;
    roundRect(ctx, 110, fy, W - 220, footH - 50, 30);
    ctx.fillStyle = `rgba(${p.accentRgb},.12)`;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = `rgba(${p.accentRgb},.6)`;
    ctx.stroke();
    ctx.setLineDash([]);
    const inv = input.invite;
    if (inv.code) {
      text(`با کدِ دعوتِ من ${faNum(inv.percent)}% تخفیف بگیر`, R - 20, fy + 70, f(800, 36), p.text, "right");
      text(inv.code, L + 20, fy + 72, f(900, 44), p.accent, "left", "ltr");
    } else {
      text("تو هم روتینت رو بساز", R - 20, fy + 70, f(800, 36), p.text, "right");
    }
    text(inv.url.replace(/^https?:\/\//, ""), W / 2, fy + 135, f(600, 28), p.muted, "center", "ltr");
  } else {
    text(BRAND_FA, W / 2, H - 110, f(600, 30), p.muted, "center");
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

/** متنِ همراهِ تصویر — با لینک و کدِ دعوت، اگه کاربر روشنش گذاشته */
export function shareText(lead: string, invite: ShareCardInput["invite"]): string {
  if (!invite) return lead;
  const offer = invite.code ? ` با کدِ دعوتِ من (${invite.code}) ${faNum(invite.percent)}% تخفیف بگیر:` : "";
  return `${lead}\nتو هم بیا روتینت رو بساز —${offer} ${invite.url}`;
}
