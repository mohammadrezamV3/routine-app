"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { ANALYSIS_DOMAIN_LABELS, type WeeklyAnalysis } from "@/lib/weeklyAnalysis/types";
import { BRAND_EN, BRAND_FA } from "@/lib/brand";
import { Spinner } from "./Spinner";

const W = 1080;
const H = 1350;

type Palette = {
  bg: string; surface: string; line: string; accent: string; accentRgb: string;
  text: string; muted: string; win: string; loss: string;
};

// رنگ‌ها مستقیم از توکن‌های تمِ فعلی خونده می‌شن (تمِ روشن توکن‌هاش رو روی
// body بازتعریف می‌کنه، پس از body می‌خونیم نه html) — تصویر هم‌رنگِ همون
// چیزیه که کاربر روی صفحه می‌بینه.
function readPalette(): Palette {
  const cs = getComputedStyle(document.body);
  const v = (name: string, fb: string) => cs.getPropertyValue(name).trim() || fb;
  return {
    bg: v("--bg", "#0E1011"),
    surface: v("--surface-1", "#171A1C"),
    line: v("--surface-line", "#2A2F33"),
    accent: v("--accent", "#00A86B"),
    accentRgb: v("--accent-rgb", "0,168,107"),
    text: v("--text", "#EDEFEE"),
    muted: v("--muted", "#8A9099"),
    win: v("--pnl-win", "#16C79A"),
    loss: v("--pnl-loss", "#E05252"),
  };
}

// فونت‌های next/font اسمِ هش‌شده دارن؛ اسمِ واقعی از متغیرِ CSS روی <html>
// خونده می‌شه. لاتین اول، تا اعداد/حروفِ انگلیسی Inter بگیرن و فارسی به
// وزیرمتن سقوط کنه — عینا همون استکِ فونتِ خودِ اپ.
function fontStack(): string {
  const cs = getComputedStyle(document.documentElement);
  const vazir = cs.getPropertyValue("--font-vazir").trim();
  const latin = cs.getPropertyValue("--font-latin").trim();
  return [latin, vazir, "sans-serif"].filter(Boolean).join(", ");
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

async function renderCard(a: WeeklyAnalysis): Promise<HTMLCanvasElement> {
  const fonts = fontStack();
  const f = (weight: number, size: number) => `${weight} ${size}px ${fonts}`;
  if (document.fonts) {
    try {
      await Promise.all([
        document.fonts.load(f(800, 56), "آنالیز هفتگی"),
        document.fonts.load(f(500, 36), "هفته 0123"),
      ]);
      await document.fonts.ready;
    } catch { /* فونتِ جایگزین هم قابلِ قبوله */ }
  }

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
    ctx.fillText(s, x, y);
  };

  // پس‌زمینه + هاله‌ی ملایمِ accent
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 480, 40, W / 2, 480, 620);
  glow.addColorStop(0, `rgba(${p.accentRgb},.22)`);
  glow.addColorStop(1, `rgba(${p.accentRgb},0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // قابِ کارت — همون سطح/بوردرِ کارت‌های اپ
  roundRect(ctx, 60, 60, W - 120, H - 120, 44);
  ctx.fillStyle = p.surface;
  ctx.globalAlpha = 0.92;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 2;
  ctx.strokeStyle = p.line;
  ctx.stroke();

  text("آنالیز هفتگی", W - 120, 175, f(800, 58), p.text, "right");
  text(a.weekLabel, W - 120, 235, f(500, 34), p.muted, "right");
  text(BRAND_EN, 120, 175, f(800, 44), p.accent, "left", "ltr");

  // حلقه‌ی امتیاز
  const cx = W / 2, cy = 540, r = 190, sw = 34;
  const score = a.overall.score;
  ctx.lineCap = "round";
  ctx.lineWidth = sw;
  ctx.strokeStyle = `rgba(${p.accentRgb},.16)`;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  if (score !== null && score > 0) {
    ctx.strokeStyle = p.accent;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * Math.min(100, score)) / 100);
    ctx.stroke();
  }
  ctx.textBaseline = "alphabetic";
  text(a.overall.grade ?? "—", cx, cy + 40, f(800, 150), p.accent, "center", "ltr");
  text(score === null ? "—" : `${Math.round(score)}/100`, cx, cy + 115, f(700, 48), p.text, "center", "ltr");

  // تغییر نسبت به هفته‌ی قبل
  const delta = a.overall.delta;
  if (delta !== null) {
    const d = Math.round(delta);
    const color = d > 0 ? p.win : d < 0 ? p.loss : p.muted;
    const arrow = d > 0 ? "▲" : d < 0 ? "▼" : "•";
    // عددِ علامت‌دار داخلِ ایزوله‌ی LTR، وگرنه bidi «+6» رو «6+» نشون می‌ده
    text(`${arrow} \u2066${d > 0 ? "+" : ""}${d}\u2069  نسبت به هفته‌ی قبل`, cx, 820, f(700, 38), color, "center");
  }

  // سه بخشِ برتر
  const top = a.domains
    .filter((d) => d.hasData && d.score !== null)
    .sort((x, y) => (y.score as number) - (x.score as number))
    .slice(0, 3);
  text("بهترین بخش‌ها", W - 120, 920, f(800, 40), p.text, "right");
  if (top.length === 0) {
    text("این هفته هنوز داده‌ای ثبت نشده", W - 120, 1000, f(500, 34), p.muted, "right");
  }
  top.forEach((d, i) => {
    const y = 1005 + i * 88;
    const s = Math.round(d.score as number);
    text(ANALYSIS_DOMAIN_LABELS[d.domain], W - 120, y, f(700, 36), p.text, "right");
    const barRight = W - 330, barLeft = 250, barH = 18;
    roundRect(ctx, barLeft, y - 24, barRight - barLeft, barH, 9);
    ctx.fillStyle = `rgba(${p.accentRgb},.14)`;
    ctx.fill();
    const fillW = Math.max(barH, ((barRight - barLeft) * Math.min(100, s)) / 100);
    roundRect(ctx, barRight - fillW, y - 24, fillW, barH, 9);
    ctx.fillStyle = p.accent;
    ctx.fill();
    text(String(s), 120, y, f(800, 40), p.accent, "left", "ltr");
  });

  text(BRAND_FA, cx, H - 110, f(600, 30), p.muted, "center");
  return canvas;
}

// «اشتراک‌گذاری»: یک کارتِ خلاصه روی canvas می‌کشه؛ اگه مرورگر اشتراکِ فایل
// رو پشتیبانی کنه (موبایل) با navigator.share، وگرنه PNG دانلود می‌شه.
export function WeeklyAnalysisShare({ analysis }: { analysis: WeeklyAnalysis | null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function share() {
    if (!analysis || busy) return;
    setBusy(true);
    setError(null);
    try {
      const canvas = await renderCard(analysis);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
      if (!blob) throw new Error("blob");
      const name = `arion-weekly-${analysis.weekStart}.png`;
      const file = new File([blob], name, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        try {
          await nav.share({ files: [file], title: "آنالیز هفتگی" });
          return;
        } catch (e) {
          if ((e as Error)?.name === "AbortError") return; // کاربر خودش بست
        }
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch {
      setError("ساخت تصویر ممکن نشد");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wa-share">
      <button type="button" className="account-outline-btn wa-small-btn" onClick={share} disabled={!analysis || busy}>
        {busy ? <Spinner size={13} /> : <><Share2 size={14} />اشتراک‌گذاری</>}
      </button>
      {error && <span className="wa-error-inline">{error}</span>}
    </div>
  );
}
