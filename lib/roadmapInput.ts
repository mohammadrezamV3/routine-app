import { RoadmapAnswer, RoadmapProfile, RoadmapSchedule } from "@/lib/aiClient";
import { clampText } from "@/lib/validate";

// اعتبارسنجیِ ورودیِ هر دو روتِ رودمپ (سوال‌ها و ساخت) — یک‌جا، چون هر دو
// دقیقاً همان پروفایل را می‌گیرند و هر اختلافی بینشان یعنی مدل در مرحله‌ی
// دوم چیزی متفاوت از مرحله‌ی اول ببیند.
//
// همه‌چیز *سمتِ سرور* بررسی می‌شود نه فقط در فرم: این مقادیر مستقیم داخلِ
// پرامپت می‌روند و در دیتابیس می‌نشینند، و کلاینت قابلِ دور زدن است.

/** گزینه‌های بسته — هر چیزِ دیگری کنار گذاشته می‌شود، نه اینکه خام وارد پرامپت شود. */
export const LEVELS = ["از صفر", "یه چیزایی بلدم", "متوسط", "پیشرفته"] as const;
export const RESOURCE_LANGS = ["فقط فارسی", "فارسی و انگلیسی"] as const;
export const BUDGETS = ["فقط رایگان", "پولی هم اوکیه"] as const;
export const LEARN_STYLES = ["ویدیو", "کتاب و مستند", "پروژه‌محور", "فرقی نمی‌کنه"] as const;

const MAX_TOPIC = 120;
const MAX_GOAL = 300;
const MAX_ANSWER = 300;
const MAX_QUESTION = 300;
const MAX_ANSWERS = 8;

function pickFrom<T extends readonly string[]>(v: unknown, allowed: T): T[number] | undefined {
  return typeof v === "string" && (allowed as readonly string[]).includes(v.trim())
    ? (v.trim() as T[number])
    : undefined;
}

export function parseSchedule(v: unknown): RoadmapSchedule | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const rawDays = Array.isArray(o.jsDays) ? o.jsDays : [];
  const jsDays = Array.from(
    new Set(rawDays.filter((d): d is number => typeof d === "number" && Number.isInteger(d) && d >= 0 && d <= 6))
  ).sort((a, b) => a - b);
  if (!jsDays.length) return null;

  const minutes = Number(o.minutesPerDay);
  if (!Number.isFinite(minutes) || minutes < 10 || minutes > 480) return null;

  const startTime = typeof o.startTime === "string" ? o.startTime.trim() : "";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) return null;

  return { jsDays, minutesPerDay: Math.round(minutes), startTime };
}

export type ParsedProfile =
  | { ok: true; profile: RoadmapProfile }
  | { ok: false; error: string };

export function parseProfile(body: any): ParsedProfile {
  const topicRaw = typeof body?.topic === "string" ? body.topic.trim() : "";
  if (!topicRaw) return { ok: false, error: "موضوع الزامی است" };

  // برنامه‌ی زمانی اگر فرستاده شده باید معتبر باشد؛ نبودنش اشکالی ندارد
  // (مدل بدونش مسیر می‌سازد، فقط جلسه‌ها را به دقیقه نمی‌بُرد).
  const schedule = body?.schedule === undefined || body?.schedule === null ? null : parseSchedule(body.schedule);
  if (body?.schedule && !schedule) return { ok: false, error: "برنامه‌ی زمانی معتبر نیست" };

  const deadlineRaw = Number(body?.deadlineMonths);
  const deadlineMonths =
    Number.isFinite(deadlineRaw) && deadlineRaw >= 1 && deadlineRaw <= 60 ? Math.round(deadlineRaw) : undefined;

  const goalRaw = typeof body?.goal === "string" ? body.goal.trim() : "";

  return {
    ok: true,
    profile: {
      topic: clampText(topicRaw, MAX_TOPIC),
      goal: goalRaw ? clampText(goalRaw, MAX_GOAL) : undefined,
      level: pickFrom(body?.level, LEVELS),
      deadlineMonths,
      resourceLang: pickFrom(body?.resourceLang, RESOURCE_LANGS),
      budget: pickFrom(body?.budget, BUDGETS),
      learnStyle: pickFrom(body?.learnStyle, LEARN_STYLES),
      schedule: schedule ?? undefined,
    },
  };
}

/** جوابِ سوال‌های مرحله‌ی اول — هرچه بدشکل باشد کنار گذاشته می‌شود. */
export function parseAnswers(v: unknown): RoadmapAnswer[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x: any) => ({
      q: typeof x?.q === "string" ? clampText(x.q.trim(), MAX_QUESTION) : "",
      a: typeof x?.a === "string" ? clampText(x.a.trim(), MAX_ANSWER) : "",
    }))
    .filter((x) => x.q.length > 0 && x.a.length > 0)
    .slice(0, MAX_ANSWERS);
}
