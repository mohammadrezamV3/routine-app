// نومو برای مربی: پرامپت‌ها و اعتبارسنجی خروجی (خالص و تست‌دار). ورودی مدل فقط
// عددهای گزارش هفته، هدف، اسم برنامه‌های خود مربی و درخواست خود مربی‌ست؛
// هرگز متن پیام‌های گفت‌وگو (رمزگذاری سرتاسری). خروجی مدل همیشه اعتبارسنجی و کلمپ می‌شه.

import type { CoachNomoProgramDraft } from "./coachTypes";
import type { CoachWeekReport, CoachGoal } from "./coachTypes";
import { checkOptionalNumber } from "./numberLimits";

export const COACH_NOMO_DAILY_LIMIT = 40;
export const NOMO_PROMPT_MAX = 500;
export const NOMO_MAX_ITEMS = 30;
export const NOMO_MAX_WEEKS = 12;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function cleanText(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.replace(CONTROL_RE, "").replace(/\s+/g, " ").trim().slice(0, max);
}

export const PROGRAM_SYSTEM_PROMPT = `تو دستیار یک مربی هستی و باید یک پیش‌نویس برنامه برای شاگرد او بسازی.
فقط یک JSON معتبر برگردان، بدون هیچ متن دیگر، با این شکل:
{"title": string, "weeks": number, "items": [{"title": string, "details": string|null, "days": number[], "sets": number|null, "reps": number|null, "durationMin": number|null, "startTime": "HH:mm"|null}]}
قوانین:
- days عددهای 0 تا 6 هستند (0 یکشنبه، 6 شنبه). حداکثر ${NOMO_MAX_ITEMS} آیتم و حداکثر ${NOMO_MAX_WEEKS} هفته.
- اگر نوع برنامه ROUTINE است، sets و reps را null بگذار. اگر WORKOUT است، برای هر حرکت sets و reps عدد بده.
- از داده‌های داده‌شده استفاده کن و عدد یا واقعیتی از خودت درباره‌ی شاگرد نساز. ساده و قابل‌انجام بنویس.
- متن‌ها کوتاه باشند. هیچ توصیه‌ی پزشکی نده.`;

export const WEEK_SYSTEM_PROMPT = `تو دستیار یک مربی هستی. با عددهای گزارش هفته‌ی یک شاگرد، دقیقا سه خط کوتاه برای مربی بنویس: ۱) وضعیت کلی هفته ۲) نکته‌ی خوب یا بد مهم ۳) پیشنهاد عملی برای هفته‌ی بعد.
فقط یک JSON معتبر برگردان: {"lines": [string, string, string]}.
فقط از عددهایی که داده شده استفاده کن و چیزی از خودت اضافه نکن. هر خط حداکثر 140 حرف.`;

export const NUDGE_SYSTEM_PROMPT = `تو دستیار یک مربی هستی. با عددهای گزارش هفته‌ی یک شاگرد، دو یا سه پیام تشویقی کوتاه و گرم بنویس که مربی بتواند برای شاگرد بفرستد.
فقط یک JSON معتبر برگردان: {"suggestions": [string, string]}.
فقط از عددهای داده‌شده استفاده کن، ملامت نکن، هر پیام حداکثر 140 حرف و بدون ایموجی.`;

/** خلاصه‌ی عددی هفته برای ورودی مدل (بدون اسم و بدون هیچ متن گفت‌وگو) */
export function weekFacts(r: CoachWeekReport, goal: Pick<CoachGoal, "title" | "target" | "metric" | "weeksMet" | "weeks"> | null): Record<string, unknown> {
  return {
    weekIndex: r.weekIndex,
    complete: r.complete,
    routineRatePercent: r.routineRate,
    routineChangeVsLastWeek: r.routineDelta,
    workoutsDone: r.workoutsDone,
    workoutsPlanned: r.workoutsPlanned,
    sleepAvgHours: r.sleepAvgMinutes === null ? null : Math.round((r.sleepAvgMinutes / 60) * 10) / 10,
    streakDays: r.streak,
    grade: r.grade,
    dailyRoutinePercent: r.days.map((d) => d.routineRate),
    workoutDays: r.days.map((d) => d.workout),
    goal: goal ? { title: goal.title, metric: goal.metric, targetPerWeek: goal.target, weeksMet: goal.weeksMet, weeks: goal.weeks } : null,
  };
}

/** پیش‌نویس برنامه از خروجی مدل؛ نامعتبر = null */
export function sanitizeProgramDraft(raw: unknown, type: "ROUTINE" | "WORKOUT"): CoachNomoProgramDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const title = cleanText(r.title, 80);
  if (!title || !Array.isArray(r.items)) return null;
  const weeksN = typeof r.weeks === "number" && Number.isFinite(r.weeks) ? Math.round(r.weeks) : 4;
  const weeks = Math.max(1, Math.min(NOMO_MAX_WEEKS, weeksN));
  const items: CoachNomoProgramDraft["items"] = [];
  for (const x of r.items.slice(0, NOMO_MAX_ITEMS * 2)) {
    if (items.length >= NOMO_MAX_ITEMS) break;
    if (!x || typeof x !== "object") continue;
    const it = x as Record<string, unknown>;
    const t = cleanText(it.title, 80);
    if (!t) continue;
    const days = Array.isArray(it.days)
      ? Array.from(new Set(it.days.filter((d): d is number => typeof d === "number" && Number.isInteger(d) && d >= 0 && d <= 6))).sort((a, b) => a - b)
      : [];
    if (days.length === 0) continue;
    const num = (v: unknown, spec: "sets" | "reps" | "durationMin"): number | null => {
      if (v === null || v === undefined) return null;
      const c = checkOptionalNumber(typeof v === "string" ? Number(v) : v, spec);
      return c.ok ? c.value : null;
    };
    const details = cleanText(it.details, 300);
    items.push({
      title: t,
      details: details || null,
      days,
      sets: type === "WORKOUT" ? num(it.sets, "sets") : null,
      reps: type === "WORKOUT" ? num(it.reps, "reps") : null,
      durationMin: num(it.durationMin, "durationMin"),
      startTime: typeof it.startTime === "string" && TIME_RE.test(it.startTime) ? it.startTime : null,
    });
  }
  if (items.length === 0) return null;
  return { title, type, weeks, items };
}

/** سه خط خلاصه‌ی هفته؛ نامعتبر = null. خروجی با \n بین خط‌ها */
export function sanitizeWeekSummary(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const lines = (raw as Record<string, unknown>).lines;
  if (!Array.isArray(lines)) return null;
  const out = lines.map((l) => cleanText(l, 160)).filter(Boolean).slice(0, 3);
  return out.length ? out.join("\n") : null;
}

export function sanitizeSuggestions(raw: unknown): string[] | null {
  if (!raw || typeof raw !== "object") return null;
  const s = (raw as Record<string, unknown>).suggestions;
  if (!Array.isArray(s)) return null;
  const out = s.map((x) => cleanText(x, 160)).filter(Boolean).slice(0, 3);
  return out.length ? out : null;
}
