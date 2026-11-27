"use client";

// کارت اشتراکی نتیجه‌ی هدف (1080x1350، خروجی 2 برابر). کاملا سمت کلاینت، بدون حاشیه،
// گوشه‌ی تیز، پس‌زمینه‌ی شیشه‌ای برند مثل lib/shareCard.ts (همه‌ی کمک‌ها از همون‌جا).
import type { CoachGoal } from "./coachTypes";
import { tr, isEn } from "./i18n";
import {
  SHARE_BOTTOM, SHARE_PAD, SHARE_W, beginShareCanvas, drawGradientArc, drawShareHeader, loadLogo, loadShareFonts, readPalette,
  rgba, shareFont, shareHair, shareHost, shareTextFn, type RenderOpts,
} from "./shareCard";

export type CoachGoalCardInput = {
  title: string;
  metric: CoachGoal["metric"];
  target: number;
  weeks: number;
  weeksMet: number;
  totalDone: number;
  done: boolean;
  /** هفته‌ها از اول: موفق / ناموفق / هنوز نیامده (null) */
  history: (boolean | null)[];
  withName?: string | null;
  inviteCode?: string | null;
};

export function goalCardInput(goal: CoachGoal, opts: { withName?: string | null; inviteCode?: string | null } = {}): CoachGoalCardInput {
  const history: (boolean | null)[] = Array.from({ length: goal.weeks }, (_, i) => {
    const w = goal.history[i];
    return !w || w.current ? (w?.met ? true : null) : w.met;
  });
  return {
    title: goal.title, metric: goal.metric, target: goal.target, weeks: goal.weeks, weeksMet: goal.weeksMet, totalDone: goal.totalDone,
    done: goal.status === "DONE", history, withName: opts.withName ?? null, inviteCode: opts.inviteCode ?? null,
  };
}

const cssVar = (name: string, fb: string) => getComputedStyle(document.body).getPropertyValue(name).trim() || fb;

export async function renderCoachGoalCard(input: CoachGoalCardInput, opts: RenderOpts = {}): Promise<HTMLCanvasElement> {
  const f = shareFont();
  const p = readPalette();
  const [logo] = await Promise.all([loadLogo(p.light), loadShareFonts(f)]);
  const { canvas, ctx } = beginShareCanvas(p, opts.dpr ?? 2, opts.target);
  const text = shareTextFn(ctx);
  const W = SHARE_W, L = SHARE_PAD, R = W - SHARE_PAD;
  const en = isEn();
  const top = drawShareHeader(ctx, text, f, p, logo, {
    title: input.done ? tr("هدف کامل شد", "Goal complete") : tr("پیشرفت هدف", "Goal progress"),
    subtitle: input.withName ? tr(`با ${input.withName}`, `with ${input.withName}`) : undefined,
    inviteCode: input.inviteCode, host: shareHost(),
  });
  const bottom = SHARE_BOTTOM;

  // حلقه‌ی بزرگ هفته‌های موفق
  const cx = W / 2, r = 205, sw = 54, cy = top + 60 + r + sw / 2;
  drawGradientArc(ctx, p, cx, cy, r, sw, input.weeks ? input.weeksMet / input.weeks : 0, [cssVar("--ring-1a", p.accent), cssVar("--ring-1b", p.accent)]);
  text(`${input.weeksMet}/${input.weeks}`, cx, cy + 36, f(900, 118), p.text, "center", "ltr");
  text(tr("هفته موفق", "weeks met"), cx, cy + 96, f(700, 32), p.muted, "center");

  // عنوان هدف
  const ty = cy + r + sw / 2 + 96;
  text(input.title, W / 2, ty, f(900, 54), p.text, "center", undefined, R - L);
  const total = input.metric === "WORKOUT_SESSIONS"
    ? tr(`${input.totalDone} جلسه تمرین در ${input.weeks} هفته`, `${input.totalDone} sessions in ${input.weeks} weeks`)
    : tr(`هدف هر هفته ${input.target}% روتین`, `Weekly goal: ${input.target}% routine`);
  text(total, W / 2, ty + 58, f(600, 32), p.muted, "center", undefined, R - L);

  // نقطه‌های هفته‌ها (حداکثر 13 در هر ردیف)
  const per = Math.min(13, Math.max(1, input.weeks));
  const rows = Math.ceil(input.weeks / per);
  const step = Math.min(64, (R - L) / per), dot = Math.min(18, step * 0.3);
  const gridH = (rows - 1) * 54;
  let y = Math.min(bottom - 20 - gridH, ty + 150);
  ctx.lineWidth = 3;
  for (let row = 0; row < rows; row++, y += 54) {
    const inRow = Math.min(per, input.weeks - row * per);
    for (let i = 0; i < inRow; i++) {
      const idx = row * per + i;
      const x = (en ? W / 2 - ((inRow - 1) * step) / 2 + i * step : W / 2 + ((inRow - 1) * step) / 2 - i * step);
      const st = input.history[idx];
      ctx.beginPath();
      ctx.arc(x, y, dot, 0, Math.PI * 2);
      if (st) { ctx.fillStyle = p.accent; ctx.fill(); }
      else { ctx.strokeStyle = st === false ? rgba(p.muted, 0.55) : shareHair(p); ctx.stroke(); }
    }
  }
  return canvas;
}
