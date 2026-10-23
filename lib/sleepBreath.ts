// منطق خالص تنفس آرام: الگوها، فازها و زمان‌بندی. هیچ وابستگی به DOM یا ساعت ندارد
// (زمان همیشه به‌صورت ثانیه‌ی سپری‌شده وارد می‌شود) تا تست‌پذیر بماند.

export type BreathPatternId = "478" | "box" | "calm";
export type BreathPhaseKind = "inhale" | "hold" | "exhale" | "rest";
export type BreathPhase = { kind: BreathPhaseKind; sec: number };
export type BreathPattern = { id: BreathPatternId; phases: BreathPhase[] };

export const BREATH_PATTERNS: Record<BreathPatternId, BreathPattern> = {
  "478": { id: "478", phases: [{ kind: "inhale", sec: 4 }, { kind: "hold", sec: 7 }, { kind: "exhale", sec: 8 }] },
  box: { id: "box", phases: [{ kind: "inhale", sec: 4 }, { kind: "hold", sec: 4 }, { kind: "exhale", sec: 4 }, { kind: "rest", sec: 4 }] },
  calm: { id: "calm", phases: [{ kind: "inhale", sec: 4 }, { kind: "exhale", sec: 6 }] },
};
export const BREATH_PATTERN_IDS: BreathPatternId[] = ["478", "box", "calm"];
export const BREATH_MINUTES = [2, 5, 10] as const;
export const DEFAULT_BREATH_PATTERN: BreathPatternId = "478";
export const DEFAULT_BREATH_MINUTES = 5;

export function normalizePattern(v: unknown): BreathPatternId {
  return v === "478" || v === "box" || v === "calm" ? v : DEFAULT_BREATH_PATTERN;
}
export function normalizeMinutes(v: unknown): number {
  const n = Number(v);
  return (BREATH_MINUTES as readonly number[]).includes(n) ? n : DEFAULT_BREATH_MINUTES;
}

export function cycleSec(id: BreathPatternId): number {
  return BREATH_PATTERNS[id].phases.reduce((s, p) => s + p.sec, 0);
}
/** تعداد دورهای کامل در طول جلسه (حداقل 1) */
export function totalRounds(id: BreathPatternId, minutes: number): number {
  return Math.max(1, Math.floor((minutes * 60) / cycleSec(id)));
}
/** طول واقعی جلسه: ثانیه‌ی کل کاربر، ولی دور آخر نیمه‌کاره نمی‌ماند */
export function sessionSec(id: BreathPatternId, minutes: number): number {
  return totalRounds(id, minutes) * cycleSec(id);
}

export type BreathState = {
  /** شماره‌ی فاز در دور (از 0) */
  phaseIndex: number;
  kind: BreathPhaseKind;
  phaseSec: number;
  /** ثانیه‌ی گذشته داخل فاز */
  into: number;
  /** ثانیه‌ی باقی‌مانده تا پایان فاز، رو به بالا گرد (4،3،2،1) */
  left: number;
  /** دور جاری از 1 */
  round: number;
  /** آیا جلسه تموم شده */
  done: boolean;
};

export function stateAt(id: BreathPatternId, minutes: number, elapsedSec: number): BreathState {
  const pat = BREATH_PATTERNS[id];
  const total = sessionSec(id, minutes);
  const cyc = cycleSec(id);
  const rounds = totalRounds(id, minutes);
  const e = Math.max(0, Number.isFinite(elapsedSec) ? elapsedSec : 0);
  if (e >= total) {
    const last = pat.phases[pat.phases.length - 1];
    return { phaseIndex: pat.phases.length - 1, kind: last.kind, phaseSec: last.sec, into: last.sec, left: 0, round: rounds, done: true };
  }
  const round = Math.floor(e / cyc) + 1;
  let t = e - (round - 1) * cyc;
  for (let i = 0; i < pat.phases.length; i++) {
    const ph = pat.phases[i];
    if (t < ph.sec) return { phaseIndex: i, kind: ph.kind, phaseSec: ph.sec, into: t, left: Math.max(1, Math.ceil(ph.sec - t)), round, done: false };
    t -= ph.sec;
  }
  const first = pat.phases[0];
  return { phaseIndex: 0, kind: first.kind, phaseSec: first.sec, into: 0, left: first.sec, round, done: false };
}

/** مقیاس هدف دایره در پایان فاز: دم و نگه‌داشتن بالا، بازدم و مکث خالی پایین */
export function targetScale(kind: BreathPhaseKind): 0 | 1 {
  return kind === "inhale" || kind === "hold" ? 1 : 0;
}
/** مقیاس لحظه‌ای (0 تا 1) برای وقتی که مکث می‌کنیم و باید دایره همان‌جا بایستد */
export function scaleAt(id: BreathPatternId, minutes: number, elapsedSec: number): number {
  const s = stateAt(id, minutes, elapsedSec);
  if (s.done) return 0;
  const p = s.phaseSec > 0 ? Math.min(1, s.into / s.phaseSec) : 1;
  if (s.kind === "inhale") return p;
  if (s.kind === "exhale") return 1 - p;
  return s.kind === "hold" ? 1 : 0;
}
/** پیشرفت جلسه از 0 تا 1 */
export function breathProgress(id: BreathPatternId, minutes: number, elapsedSec: number): number {
  const total = sessionSec(id, minutes);
  return total > 0 ? Math.max(0, Math.min(1, elapsedSec / total)) : 0;
}
