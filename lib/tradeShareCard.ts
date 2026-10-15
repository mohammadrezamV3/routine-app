"use client";

// تصویر کارنامه‌ی ترید (canvas) — هم‌خانواده‌ی کارت اشتراک داشبورد (lib/shareCard.ts):
// همون قالب ثابت 1080×1350 با تراکم 2 برابر، همون پس‌زمینه‌ی شیشه‌ی مات (فقط رنگ‌های
// برند، شبکه‌ی نقطه‌ای محو، تاری مرحله‌ای)، همون سربرگ (لوگو + آدرس + کد دعوت) و
// همون مقیاس CS. هیچ کدی از اون فایل کپی نشده؛ همه از export های همون‌جاست.
// پایین کارت هیچ لینکی نیست و هیچ متنی اعراب نداره (text() خودش پاک می‌کنه).
// رنگ سود/زیان از توکن‌های --pnl-* میاد که عمدا به تم بستگی ندارن.
// قرارداد داده: lib/tradeShareTypes.ts.
import type { TradeShareData } from "./tradeShareTypes";
import { isEn, tr } from "./i18n";
import {
  SHARE_DPR, SHARE_PAD, SHARE_BOTTOM, SHARE_W,
  beginShareCanvas, drawGradientArc, drawShareHeader, loadLogo, loadShareFonts,
  readPalette, rgba, roundRect, shareFont, shareHair, shareHost, shareTextFn,
  type Palette, type ShareFont, type ShareTextFn,
} from "./shareCard";

export type TradeShareRenderOpts = { dpr?: number; inviteCode?: string | null; siteHost?: string };

const W = SHARE_W;
const L = SHARE_PAD, R = W - SHARE_PAD, CW = R - L;
/** منفی تایپوگرافیک (هم‌عرض +) — Inter و وزیرمتن هر دو دارنش */
const MINUS = "−";

type TradeColors = { win: string; loss: string; ring: [string, string] };

function readTradeColors(): TradeColors {
  const cs = getComputedStyle(document.body);
  const v = (name: string, fb: string) => cs.getPropertyValue(name).trim() || fb;
  return {
    win: v("--pnl-win", "#16C79A"),
    loss: v("--pnl-loss", "#E05252"),
    ring: [v("--ring-1a", "#00C98D"), v("--ring-1b", "#7DF9CF")],
  };
}

// ── قالب‌بندی اعداد (همیشه ارقام لاتین) ──
const sign = (n: number) => (n > 0 ? "+" : n < 0 ? MINUS : "");
function fmtMoney(n: number): string {
  return sign(n) + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
/** مبلغ کوتاه برای چیپ نمادها: 960 / 1.2K / 3.4M */
function fmtCompact(n: number): string {
  const a = Math.abs(n);
  const body = a >= 1e6 ? `${trim1(a / 1e6)}M` : a >= 1e4 ? `${trim1(a / 1e3)}K` : a.toLocaleString("en-US", { maximumFractionDigits: a >= 100 ? 0 : 2 });
  return sign(n) + body;
}
function trim1(n: number): string {
  return n.toFixed(1).replace(/\.0$/, "");
}
function fmtPct(n: number, signed: boolean): string {
  const body = trim1(Math.abs(n));
  return (signed ? sign(Math.round(n * 10) / 10) : n < 0 ? MINUS : "") + body + "%";
}

/** فونت بزرگ‌ترین اندازه‌ای که متن در عرض maxW جا بشه */
function fitSize(ctx: CanvasRenderingContext2D, f: ShareFont, weight: number, s: string, start: number, min: number, maxW: number): number {
  let size = start;
  ctx.direction = "ltr";
  for (; size > min; size -= 2) {
    ctx.font = f(weight, size);
    if (ctx.measureText(s).width <= maxW) break;
  }
  return size;
}

/** منحنی نرم یکنوا (Fritsch–Carlson) — بدون بیرون‌زدگی از نقطه‌ها */
function smoothPath(ctx: CanvasRenderingContext2D, pts: [number, number][], move = true) {
  const n = pts.length;
  if (move) ctx.moveTo(pts[0][0], pts[0][1]);
  else ctx.lineTo(pts[0][0], pts[0][1]);
  if (n === 2) { ctx.lineTo(pts[1][0], pts[1][1]); return; }
  const dx: number[] = [], m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1][0] - pts[i][0]);
    m.push((pts[i + 1][1] - pts[i][1]) / dx[i]);
  }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
  t.push(m[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], h = a * a + b * b;
    if (h > 9) { const k = 3 / Math.sqrt(h); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], d = dx[i] / 3;
    ctx.bezierCurveTo(x0 + d, y0 + t[i] * d, x1 - d, y1 - t[i + 1] * d, x1, y1);
  }
}

// text: مختصات طراحی راست‌به‌چپ (فارسی) رو می‌گیره و در انگلیسی خودکار قرینه می‌کنه
// (x → W - x، تراز چپ/راست عوض، جهت متن ltr). rawText بدون قرینه‌سازی، مختصات واقعی.
// x(n): قرینه‌ی یک مختصات برای شکل‌ها (کمان/مستطیل)؛ در فارسی همون n.
type Ctx = {
  ctx: CanvasRenderingContext2D; text: ShareTextFn; rawText: ShareTextFn; f: ShareFont; p: Palette; c: TradeColors; hair: string;
  en: boolean; dir: CanvasDirection; x: (n: number) => number;
};

const flipAlign = (a: CanvasTextAlign): CanvasTextAlign => (a === "right" ? "left" : a === "left" ? "right" : a);

function mirroredText(raw: ShareTextFn): ShareTextFn {
  return (s, x, y, font, color, align, _dir, maxW) => raw(s, W - x, y, font, color, flipAlign(align), "ltr", maxW);
}

/** ردیف حساب: نقطه‌ی رنگ حساب + اسم (راست)، ارز (چپ) */
function drawAccountRow(k: Ctx, d: TradeShareData, y: number) {
  const { ctx, text, f, p } = k;
  const base = y + 40;
  if (d.account) {
    ctx.fillStyle = d.account.color || p.accent;
    ctx.beginPath();
    ctx.arc(k.x(R - 11), base - 11, 11, 0, Math.PI * 2);
    ctx.fill();
    text(d.account.name, R - 36, base, f(800, 32), p.text, "right", "rtl", 520);
  } else {
    // چند نقطه‌ی هم‌پوشان = چند حساب
    for (let i = 2; i >= 0; i--) {
      ctx.beginPath();
      ctx.arc(k.x(R - 11 - i * 14), base - 11, 11, 0, Math.PI * 2);
      ctx.fillStyle = rgba(p.accent, 1 - i * 0.28);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = p.bg;
      ctx.stroke();
    }
    const label = tr("همه‌ی حساب‌ها", "All accounts");
    const x = R - 64;
    text(label, x, base, f(800, 32), p.text, "right");
    ctx.font = f(800, 32);
    ctx.direction = k.dir;
    const w = ctx.measureText(label).width;
    text(tr(`${d.accountCount} حساب`, `${d.accountCount} ${d.accountCount === 1 ? "account" : "accounts"}`), x - w - 20, base, f(600, 28), p.muted, "right");
  }
  const cur = d.currencyMixed ? tr("چند ارز", "Multiple currencies") : d.currency ?? "";
  if (cur) text(cur, L, base, f(700, 28), p.muted, "left", d.currencyMixed ? "rtl" : "ltr");
}

/** هیرو: سود/زیان خالص (راست) + حلقه‌ی وین‌ریت (چپ)؛ با ارزهای مختلف خود وین‌ریت هیروئه */
function drawHero(k: Ctx, d: TradeShareData, y: number, h: number) {
  const { ctx, text, f, p, c } = k;
  const s = d.stats;
  const wr = s.winRate ?? 0;
  const wrText = s.winRate == null ? "-" : fmtPct(s.winRate, false);

  if (d.stats.netPnl == null || d.currencyMixed) {
    // حلقه‌ی بزرگ وسط — بدون هیچ مبلغی
    const cx = W / 2, cy = y + h / 2 - 24, sw = 36, r = h / 2 - 28 - sw / 2;
    drawGradientArc(ctx, p, cx, cy, r, sw, wr / 100, c.ring);
    const size = fitSize(ctx, f, 900, wrText, 76, 40, (r - sw / 2) * 1.55);
    text(wrText, cx, cy + size * 0.3, f(900, size), p.text, "center", "ltr");
    text(tr("وین‌ریت", "Win rate"), cx, cy + size * 0.3 + 44, f(700, 28), p.muted, "center");
    text(tr("ارز حساب‌ها یکی نیست؛ مبلغی نمایش داده نمی‌شه", "Accounts use different currencies; no amount is shown"), cx, y + h + 6, f(600, 26), p.muted, "center", "rtl", CW);
    return;
  }

  // حلقه‌ی وین‌ریت (چپ)
  const sw = 30, outer = Math.min(136, h / 2 - 6), cx = L + outer, cy = y + h / 2;
  drawGradientArc(ctx, p, k.x(cx), cy, outer - sw / 2, sw, wr / 100, c.ring);
  text(wrText, cx, cy + 14, f(900, 50), p.text, "center", "ltr");
  text(tr("وین‌ریت", "Win rate"), cx, cy + 52, f(700, 24), p.muted, "center");

  // سود/زیان خالص (راست)
  const pnl = d.stats.netPnl;
  const col = pnl >= 0 ? c.win : c.loss;
  const colX = L + outer * 2 + 48, colW = R - colX;
  text(pnl >= 0 ? tr("سود خالص", "Net profit") : tr("زیان خالص", "Net loss"), R, y + 58, f(700, 30), p.muted, "right");
  const cur = d.currency ?? "";
  ctx.font = f(800, 36);
  ctx.direction = "ltr";
  const curW = cur ? ctx.measureText(cur).width + 16 : 0;
  const amount = fmtMoney(pnl);
  const size = fitSize(ctx, f, 900, amount, 104, 48, colW - curW);
  const by = y + 58 + 30 + size * 0.86;
  if (k.en) {
    // انگلیسی: عدد اول، ارز بعدش (چپ‌به‌راست)
    ctx.font = f(900, size);
    const amountW = ctx.measureText(amount).width;
    if (cur) k.rawText(cur, L + amountW + 16, by, f(800, 36), p.muted, "left", "ltr");
  } else if (cur) {
    text(cur, R, by, f(800, 36), p.muted, "right", "ltr");
  }
  ctx.save();
  ctx.shadowColor = rgba(col, 0.35);
  ctx.shadowBlur = 28;
  text(amount, k.en ? R : R - curW, by, f(900, size), col, "right", "ltr");
  ctx.restore();

  // بازده نسبت به موجودی ابتدای بازه
  if (s.returnPct != null) {
    const rc = s.returnPct >= 0 ? c.win : c.loss;
    const pct = fmtPct(s.returnPct, true);
    ctx.font = f(800, 30);
    ctx.direction = "ltr";
    const pw = ctx.measureText(pct).width;
    ctx.font = f(700, 26);
    ctx.direction = k.dir;
    const retLabel = tr("بازده", "Return");
    const lw = ctx.measureText(retLabel).width;
    const pillW = pw + lw + 56, pillH = 52, py = by + 30;
    roundRect(ctx, k.en ? L : R - pillW, py, pillW, pillH, pillH / 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = rgba(rc, 0.55);
    ctx.stroke();
    text(retLabel, R - 20, py + 35, f(700, 26), p.muted, "right");
    text(pct, R - pillW + 20, py + 36, f(800, 30), rc, "left", "ltr");
  }
}

/** کاشی‌های آمار: معاملات، برد/باخت، پرافیت فکتور، میانگین R — فقط خط دور، بدون پس‌زمینه */
function drawTiles(k: Ctx, d: TradeShareData, y: number, h: number) {
  const { ctx, text, f, p, c, hair } = k;
  const s = d.stats;
  const gap = 20, n = 4, tw = (CW - gap * (n - 1)) / n;
  const tiles: { label: string; draw: (cx: number, by: number) => void }[] = [
    { label: tr("معاملات", "Trades"), draw: (cx, by) => text(String(s.trades), cx, by, f(900, 48), p.text, "center", "ltr") },
    {
      label: tr("برد / باخت", "Wins / losses"),
      draw: (cx, by) => {
        // سه تکه با رنگ خودشون، کل عبارت وسط کاشی
        const parts: [string, string][] = [[String(s.wins), c.win], [" / ", p.muted], [String(s.losses), c.loss]];
        ctx.font = f(900, 48);
        ctx.direction = "ltr";
        const ws = parts.map(([t]) => ctx.measureText(t).width);
        let x = k.x(cx) - ws.reduce((a, b) => a + b, 0) / 2;
        parts.forEach(([t, col], i) => { k.rawText(t, x, by, f(900, 48), col, "left", "ltr"); x += ws[i]; });
      },
    },
    { label: tr("پرافیت فکتور", "Profit factor"), draw: (cx, by) => text(s.profitFactor == null ? "-" : s.profitFactor.toFixed(2), cx, by, f(900, 48), p.text, "center", "ltr") },
    {
      label: tr("میانگین R", "Average R"),
      draw: (cx, by) => {
        const v = s.avgR;
        const col = v == null ? p.text : v > 0 ? c.win : v < 0 ? c.loss : p.text;
        text(v == null ? "-" : `${sign(v)}${Math.abs(v).toFixed(2)}R`, cx, by, f(900, 48), col, "center", "ltr");
      },
    },
  ];
  tiles.forEach((t, i) => {
    const x = R - tw - i * (tw + gap); // راست‌به‌چپ
    roundRect(ctx, k.en ? W - x - tw : x, y, tw, h, 28);
    ctx.lineWidth = 2;
    ctx.strokeStyle = hair;
    ctx.stroke();
    text(t.label, x + tw / 2, y + h * 0.36, f(700, 24), p.muted, "center", "rtl", tw - 24);
    t.draw(x + tw / 2, y + h * 0.78);
  });
}

/** منحنی تجمعی سود/زیان با خط صفر */
function drawCurve(k: Ctx, d: TradeShareData, y: number, h: number) {
  const { ctx, text, f, p, c, hair } = k;
  const vals = d.curve;
  const last = vals[vals.length - 1];
  const col = last >= 0 ? c.win : c.loss;
  text(tr("منحنی سود و زیان", "P/L curve"), R, y + 26, f(700, 26), p.muted, "right");

  const top = y + 58, bot = y + h - 8, left = L + 8, right = R - 8;
  let lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
  if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
  const padV = (hi - lo) * 0.1;
  lo -= padV; hi += padV;
  const yOf = (v: number) => bot - ((v - lo) / (hi - lo)) * (bot - top);
  const step = (right - left) / (vals.length - 1);
  const pts = vals.map((v, i) => [left + i * step, yOf(v)] as [number, number]);
  const zy = yOf(0);

  // خط صفر (نقطه‌چین)
  ctx.save();
  ctx.setLineDash([8, 10]);
  ctx.strokeStyle = hair;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(L, zy);
  ctx.lineTo(R, zy);
  ctx.stroke();
  ctx.restore();

  // سطح نرم بین منحنی و خط صفر
  const ext = last >= 0 ? top : bot;
  const g = ctx.createLinearGradient(0, ext, 0, zy);
  g.addColorStop(0, rgba(col, p.light ? 0.26 : 0.32));
  g.addColorStop(1, rgba(col, 0.02));
  ctx.beginPath();
  ctx.moveTo(pts[0][0], zy);
  smoothPath(ctx, pts, false);
  ctx.lineTo(pts[pts.length - 1][0], zy);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();

  // خود خط با درخشش
  ctx.save();
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = col;
  ctx.shadowColor = rgba(col, 0.5);
  ctx.shadowBlur = 18;
  ctx.beginPath();
  smoothPath(ctx, pts);
  ctx.stroke();
  ctx.restore();

  // نقطه‌ی پایانی
  const [ex, ey] = pts[pts.length - 1];
  ctx.save();
  ctx.shadowColor = p.light ? "rgba(80,50,20,.35)" : "rgba(0,0,0,.45)";
  ctx.shadowBlur = 6;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(ex, ey, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = 4;
  ctx.strokeStyle = p.light ? "rgba(255,255,255,.85)" : rgba(p.bg, 0.9);
  ctx.beginPath();
  ctx.arc(ex, ey, 11, 0, Math.PI * 2);
  ctx.stroke();
}

/** چیپ پرمعامله‌ترین نمادها (حداکثر 3)، راست‌به‌چپ — فقط خط دور */
function drawSymbols(k: Ctx, d: TradeShareData, y: number, h: number) {
  const { ctx, text, f, p, c, hair } = k;
  const items = d.topSymbols.slice(0, 3);
  const gap = 16, inner = 14;
  type Piece = { s: string; font: string; color: string; dir: CanvasDirection; w: number };
  const chips = items.map((it) => {
    const col = it.netPnl == null || d.currencyMixed ? null : it.netPnl >= 0 ? c.win : c.loss;
    const pieces: Piece[] = [
      { s: it.symbol, font: f(800, 28), color: p.text, dir: "ltr", w: 0 },
      { s: tr(`${it.count} معامله`, `${it.count} ${it.count === 1 ? "trade" : "trades"}`), font: f(600, 24), color: p.muted, dir: k.en ? "ltr" : "rtl", w: 0 },
    ];
    if (col && it.netPnl != null) pieces.push({ s: fmtCompact(it.netPnl), font: f(800, 26), color: col, dir: "ltr", w: 0 });
    pieces.forEach((pc) => { ctx.font = pc.font; ctx.direction = pc.dir; pc.w = ctx.measureText(pc.s).width; });
    const w = pieces.reduce((a, pc) => a + pc.w, 0) + inner * (pieces.length - 1) + 52;
    return { pieces, w, col };
  });
  // اگه جا نشد، همه با یک ضریب کوچک می‌شن
  const total = chips.reduce((a, ch) => a + ch.w, 0) + gap * Math.max(0, chips.length - 1);
  const k2 = Math.min(1, CW / total);
  // فارسی: از راست به چپ؛ انگلیسی: از چپ به راست (sg = جهت پیشروی)
  const sg = k.en ? 1 : -1;
  ctx.save();
  ctx.translate(k.en ? L : R, y);
  ctx.scale(k2, k2);
  let x = 0;
  chips.forEach((ch) => {
    roundRect(ctx, k.en ? x : x - ch.w, 0, ch.w, h, h / 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = ch.col ? rgba(ch.col, 0.5) : hair;
    ctx.stroke();
    let px = x + sg * 26;
    ch.pieces.forEach((pc) => {
      k.rawText(pc.s, px, h / 2 + 10, pc.font, pc.color, k.en ? "left" : "right", pc.dir);
      px += sg * (pc.w + inner);
    });
    x += sg * (ch.w + gap);
  });
  ctx.restore();
}

/** حالت خالی: یک باکس خط‌چین تمیز با آیکون شمع و یک جمله */
function drawEmpty(k: Ctx, y: number, h: number) {
  const { ctx, text, f, p, hair } = k;
  roundRect(ctx, L, y, CW, h, 40);
  ctx.save();
  ctx.setLineDash([10, 12]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = hair;
  ctx.stroke();
  ctx.restore();
  const cx = W / 2, cy = y + h / 2 - 70;
  // سه شمع ساده (فقط خط)
  const candles = [[-70, 30, 70], [0, -20, 110], [70, 10, 80]];
  ctx.lineCap = "round";
  ctx.strokeStyle = rgba(p.muted, 0.7);
  candles.forEach(([dx, dy, bh]) => {
    const x = cx + dx, mid = cy + dy;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, mid - bh / 2 - 22);
    ctx.lineTo(x, mid + bh / 2 + 22);
    ctx.stroke();
    roundRect(ctx, x - 18, mid - bh / 2, 36, bh, 8);
    ctx.lineWidth = 4;
    ctx.stroke();
  });
  text(tr("معامله‌ای در این بازه ثبت نشده", "No trades logged in this period"), cx, cy + 150, f(800, 44), p.text, "center", "rtl", CW - 80);
}

export async function renderTradeShareCard(data: TradeShareData, opts: TradeShareRenderOpts = {}): Promise<HTMLCanvasElement> {
  const f = shareFont();
  const p = readPalette();
  const [logo] = await Promise.all([loadLogo(p.light), loadShareFonts(f, ["کارنامه ترید", isEn() ? "Trading report 1,234.50 USD %" : "+1,234.50 USD %"])]);
  const dpr = opts.dpr ?? SHARE_DPR;
  const { canvas, ctx } = beginShareCanvas(p, dpr);
  const en = isEn();
  const rawText = shareTextFn(ctx);
  const text = en ? mirroredText(rawText) : rawText;
  const k: Ctx = {
    ctx, text, rawText, f, p, c: readTradeColors(), hair: shareHair(p),
    en, dir: en ? "ltr" : "rtl", x: en ? (n) => W - n : (n) => n,
  };

  const top = drawShareHeader(ctx, rawText, f, p, logo, {
    title: tr("کارنامه‌ی ترید", "Trading report"),
    subtitle: data.rangeLabel,
    inviteCode: opts.inviteCode,
    host: opts.siteHost ?? shareHost(),
  });

  drawAccountRow(k, data, top + 8);
  const areaTop = top + 96, areaBot = SHARE_BOTTOM;

  if (data.stats.trades === 0) {
    drawEmpty(k, areaTop + 20, areaBot - areaTop - 40);
    return canvas;
  }

  // بخش‌ها با ارتفاع ثابت؛ فضای باقی‌مونده بین فاصله‌ها پخش می‌شه (سقف‌دار) و بقیه‌اش
  // کل بلوک رو وسط ناحیه می‌نشونه — با بخش‌های پنهان هم چیدمان متعادل می‌مونه
  const mixed = data.stats.netPnl == null || data.currencyMixed;
  const sections: { h: number; draw: (y: number, h: number) => void }[] = [];
  sections.push({ h: mixed ? 340 : 280, draw: (y, h) => drawHero(k, data, y, h) });
  sections.push({ h: 150, draw: (y, h) => drawTiles(k, data, y, h) });
  if (!mixed && data.curve.length >= 2) sections.push({ h: 230, draw: (y, h) => drawCurve(k, data, y, h) });
  if (data.topSymbols.length) sections.push({ h: 60, draw: (y, h) => drawSymbols(k, data, y, h) });
  const used = sections.reduce((a, s) => a + s.h, 0);
  const free = Math.max(0, areaBot - areaTop - used);
  const gap = sections.length > 1 ? Math.min(mixed ? 90 : 64, free / (sections.length - 1 + 1)) : 0;
  let y = areaTop + (free - gap * (sections.length - 1)) / 2;
  sections.forEach((s) => { s.draw(y, s.h); y += s.h + gap; });

  return canvas;
}
