"use client";

import { useState } from "react";
import "./weekly-analysis.css";
import { Share2 } from "lucide-react";
import { ANALYSIS_DOMAIN_LABELS, type WeeklyAnalysis } from "@/lib/weeklyAnalysis/types";
import { BRAND_EN, brandName } from "@/lib/brand";
import { isEn, tr } from "@/lib/i18n";
import { Spinner } from "./Spinner";

const W = 1080;
const H = 1350;

type Palette = {
  bg: string; surface: string; line: string; accent: string; accentRgb: string;
  text: string; muted: string; loss: string; ringA: string; ringB: string;
};

// رنگ‌ها مستقیم از توکن‌های تم فعلی خونده می‌شن (تم روشن توکن‌هاش رو روی
// body بازتعریف می‌کنه، پس از body می‌خونیم نه html) — تصویر هم‌رنگ همون
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
    loss: v("--pnl-loss", "#E05252"),
    // تنها رنگ داده‌ی کارت: گرادیان حلقه‌ی برند (همون پالت صفحه‌ی آنالیز)
    ringA: v("--ring-1a", "#00C98D"),
    ringB: v("--ring-1b", "#7DF9CF"),
  };
}

// فونت‌های next/font اسم هش‌شده دارن؛ اسم واقعی از متغیر CSS روی <html>
// خونده می‌شه. لاتین اول، تا اعداد/حروف انگلیسی Inter بگیرن و فارسی به
// وزیرمتن سقوط کنه — عینا همون استک فونت خود اپ.
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
    } catch { /* فونت جایگزین هم قابل قبوله */ }
  }

  const p = readPalette();
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");

  // چیدمان قرینه در انگلیسی: لبه‌ی شروع چپ، متن چپ‌به‌راست
  const en = isEn();
  const SX = en ? 120 : W - 120; // x لبه‌ی شروع
  const EX = en ? W - 120 : 120; // x لبه‌ی پایان
  const SA: CanvasTextAlign = en ? "left" : "right";
  const EA: CanvasTextAlign = en ? "right" : "left";
  const text = (s: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign, dir: CanvasDirection = en ? "ltr" : "rtl") => {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.direction = dir;
    ctx.fillText(s, x, y);
  };

  // پس‌زمینه + هاله‌ی ملایم accent
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 480, 40, W / 2, 480, 620);
  glow.addColorStop(0, `rgba(${p.accentRgb},.22)`);
  glow.addColorStop(1, `rgba(${p.accentRgb},0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // قاب کارت — همون سطح/بوردر کارت‌های اپ
  roundRect(ctx, 60, 60, W - 120, H - 120, 44);
  ctx.fillStyle = p.surface;
  ctx.globalAlpha = 0.92;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 2;
  ctx.strokeStyle = p.line;
  ctx.stroke();

  text(tr("آنالیز هفتگی", "Weekly review"), SX, 175, f(800, 58), p.text, SA);
  text(a.weekLabel, SX, 235, f(500, 34), p.muted, SA);
  text(BRAND_EN, EX, 175, f(800, 44), p.accent, EA, "ltr");

  // حلقه‌ی امتیاز
  const cx = W / 2, cy = 540, r = 190, sw = 34;
  const score = a.overall.score;
  ctx.lineCap = "round";
  ctx.lineWidth = sw;
  ctx.strokeStyle = p.ringA;
  ctx.globalAlpha = 0.14;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  if (score !== null && score > 0) {
    const rg = ctx.createLinearGradient(cx, cy + r, cx, cy - r);
    rg.addColorStop(0, p.ringA);
    rg.addColorStop(1, p.ringB);
    ctx.strokeStyle = rg;
    ctx.shadowColor = p.ringA;
    ctx.shadowBlur = 26;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * Math.min(100, score)) / 100);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
  }
  ctx.textBaseline = "alphabetic";
  text(a.overall.grade ?? "—", cx, cy + 40, f(800, 150), p.accent, "center", "ltr");
  text(score === null ? "—" : `${Math.round(score)}/100`, cx, cy + 115, f(700, 48), p.text, "center", "ltr");

  // تغییر نسبت به هفته‌ی قبل
  const delta = a.overall.delta;
  if (delta !== null) {
    const d = Math.round(delta);
    const color = d > 0 ? p.ringA : d < 0 ? p.loss : p.muted;
    const arrow = d > 0 ? "▲" : d < 0 ? "▼" : "•";
    // عدد علامت‌دار داخل ایزوله‌ی LTR، وگرنه bidi «+6» رو «6+» نشون می‌ده
    text(`${arrow} \u2066${d > 0 ? "+" : ""}${d}\u2069  ${tr("نسبت به هفته‌ی قبل", "vs last week")}`, cx, 820, f(700, 38), color, "center");
  }

  // سه بخش برتر
  const top = a.domains
    .filter((d) => d.hasData && d.score !== null)
    .sort((x, y) => (y.score as number) - (x.score as number))
    .slice(0, 3);
  text(tr("بهترین بخش‌ها", "Top areas"), SX, 920, f(800, 40), p.text, SA);
  if (top.length === 0) {
    text(tr("این هفته هنوز داده‌ای ثبت نشده", "No data has been logged yet this week"), SX, 1000, f(500, 34), p.muted, SA);
  }
  top.forEach((d, i) => {
    const y = 1005 + i * 88;
    const s = Math.round(d.score as number);
    text(ANALYSIS_DOMAIN_LABELS[d.domain], SX, y, f(700, 36), p.text, SA);
    const barRight = en ? W - 250 : W - 330, barLeft = en ? 330 : 250, barH = 18;
    roundRect(ctx, barLeft, y - 24, barRight - barLeft, barH, 9);
    ctx.fillStyle = p.ringA;
    ctx.globalAlpha = 0.14;
    ctx.fill();
    ctx.globalAlpha = 1;
    const fillW = Math.max(barH, ((barRight - barLeft) * Math.min(100, s)) / 100);
    const fillX = en ? barLeft : barRight - fillW; // پر شدن از لبه‌ی شروع
    roundRect(ctx, fillX, y - 24, fillW, barH, 9);
    const bg = en ? ctx.createLinearGradient(barLeft + fillW, 0, barLeft, 0) : ctx.createLinearGradient(barRight - fillW, 0, barRight, 0);
    bg.addColorStop(0, p.ringB);
    bg.addColorStop(1, p.ringA);
    ctx.fillStyle = bg;
    ctx.fill();
    text(String(s), EX, y, f(800, 40), p.text, EA, "ltr");
  });

  text(brandName(), cx, H - 110, f(600, 30), p.muted, "center");
  return canvas;
}

// ساخت و اشتراک/دانلود کارت: share فایل روی موبایل، وگرنه دانلود PNG
export async function shareWeeklyCard(analysis: WeeklyAnalysis): Promise<void> {
  const canvas = await renderCard(analysis);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
  if (!blob) throw new Error("blob");
  const name = `arion-weekly-${analysis.weekStart}.png`;
  const file = new File([blob], name, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: tr("آنالیز هفتگی", "Weekly review") });
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
}

// «اشتراک‌گذاری»: یک کارت خلاصه روی canvas می‌کشه؛ اگه مرورگر اشتراک فایل
// رو پشتیبانی کنه (موبایل) با navigator.share، وگرنه PNG دانلود می‌شه.
export function WeeklyAnalysisShare({ analysis }: { analysis: WeeklyAnalysis | null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function share() {
    if (!analysis || busy) return;
    setBusy(true);
    setError(null);
    try {
      await shareWeeklyCard(analysis);
    } catch {
      setError(tr("ساخت تصویر ممکن نشد", "Could not create the image"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wk-share">
      <button type="button" className="account-outline-btn wk-small-btn" onClick={share} disabled={!analysis || busy}>
        {busy ? <Spinner size={13} label={null} /> : <><Share2 size={14} />{tr("اشتراک‌گذاری", "Share")}</>}
      </button>
      {error && <span className="wk-error-inline">{error}</span>}
    </div>
  );
}
