// تقسیم هفتگی گروه‌های عضلانی — منطق خالص و مشترک بین کلاینت (ویزارد
// «تنظیمات پیشرفته») و سرور (اعتبارسنجی تقسیم کاربر، قواعد برنامه‌نویسی که
// splitIssues در lib/aiClient.ts برای دور اصلاح AI استفاده می‌کند).
//
// هیچ وابستگی به دیتابیس یا شبکه ندارد تا هم در مرورگر و هم در تست‌ها
// بی‌دردسر اجرا شود.

import { CAL_WEEK_ORDER, FA_WEEKDAY } from "@/lib/jalali";
import type { ExerciseLevel } from "@/lib/exercisePlans";

export const MUSCLE_KEYS = [
  "chest", "back", "shoulders", "biceps", "triceps", "quads",
  "hamstrings", "glutes", "calves", "abs", "forearms", "traps",
] as const;
export type MuscleKey = (typeof MUSCLE_KEYS)[number];

/** نام فارسی هر عضله — همان نام‌هایی که پرامپت مربی به مدل می‌دهد. */
export const MUSCLE_LABELS: Record<MuscleKey, string> = {
  chest: "سینه",
  back: "پشت",
  shoulders: "سرشانه",
  biceps: "جلوبازو",
  triceps: "پشت‌بازو",
  quads: "چهارسر ران",
  hamstrings: "پشت ران",
  glutes: "سرینی",
  calves: "ساق",
  abs: "شکم",
  forearms: "ساعد",
  traps: "ذوزنقه",
};

/** عضله‌های بزرگ — برای ریکاوری 48 ساعته و سقف عضله‌ی بزرگ در یک جلسه. */
export const LARGE_MUSCLES: ReadonlySet<MuscleKey> = new Set<MuscleKey>(["chest", "back", "shoulders", "quads", "hamstrings", "glutes"]);
/** عضله‌هایی که برنامه‌ی هفتگی اصولی (3 روز به بالا) نباید جا بیندازد. */
const REQUIRED_WEEKLY: MuscleKey[] = ["chest", "back", "shoulders", "quads", "hamstrings"];
/** سقف عضله‌ی بزرگ در یک جلسه به‌تفکیک سطح. */
export const MAX_LARGE_PER_DAY: Record<ExerciseLevel, number> = { beginner: 3, intermediate: 3, advanced: 4 };
/** سقف کل گروه‌های عضلانی یک جلسه. */
export const MAX_MUSCLES_PER_DAY: Record<ExerciseLevel, number> = { beginner: 5, intermediate: 6, advanced: 6 };

/** روزهای هفته به ترتیب تقویم سایت (شنبه اول) — برای «روز پشت‌سرهم». */
export const WEEK_ORDER_FA: string[] = CAL_WEEK_ORDER.map((i) => FA_WEEKDAY[i]);

const norm = (s: string) => String(s || "").replace(/[\s‌‏‎\-–—_/]/g, "").toLowerCase();

// ترتیب مهم است: «پشت‌بازو» و «پشت ران» هر دو «پشت» را در خود دارند، پس
// اول عضله‌های دقیق‌تر سنجیده می‌شوند و «پشت» (زیربغل) آخر.
const ALIASES: [MuscleKey, string[]][] = [
  ["triceps", ["پشتبازو", "سهسربازو", "سهسر", "triceps", "tricep"]],
  ["hamstrings", ["پشتران", "همسترینگ", "hamstring"]],
  ["biceps", ["جلوبازو", "دوسربازو", "دوسر", "biceps", "bicep"]],
  ["quads", ["چهارسر", "جلوران", "quad"]],
  ["glutes", ["سرینی", "باسن", "گلوت", "glute"]],
  ["calves", ["ساق", "calf", "calves"]],
  ["abs", ["شکم", "میانتنه", "core", "abs"]],
  ["forearms", ["ساعد", "forearm"]],
  ["traps", ["ذوزنقه", "کول", "تراپ", "trap"]],
  ["shoulders", ["سرشانه", "شانه", "دلتوئید", "دلت", "shoulder", "delt"]],
  ["chest", ["سینه", "chest", "pec"]],
  ["back", ["پشت", "زیربغل", "لت", "back", "lat"]],
];
// نام‌های کلی که چند عضله را با هم می‌پوشانند
const GROUPS: Record<string, MuscleKey[]> = {
  "پا": ["quads", "hamstrings", "glutes"],
  "ران": ["quads", "hamstrings"],
  "بازو": ["biceps", "triceps"],
  "legs": ["quads", "hamstrings", "glutes"],
  "arms": ["biceps", "triceps"],
};

/** نام آزاد یک عضله (خروجی مدل یا کلید انگلیسی) → کلیدهای شناخته‌شده؛ ناشناخته = [] */
export function muscleKeysOf(name: string): MuscleKey[] {
  const raw = String(name || "").trim();
  if ((MUSCLE_KEYS as readonly string[]).includes(raw)) return [raw as MuscleKey];
  const n = norm(raw);
  if (!n) return [];
  if (GROUPS[n]) return GROUPS[n];
  for (const [key, list] of ALIASES) if (list.some((a) => n.includes(a))) return [key];
  return [];
}

export function isMuscleKey(v: unknown): v is MuscleKey {
  return typeof v === "string" && (MUSCLE_KEYS as readonly string[]).includes(v);
}

export type UserSplitDay = { day: string; muscles: MuscleKey[] };

/**
 * اعتبارسنجی تقسیم هفتگی‌ای که خود کاربر فرستاده: فقط روزهای باشگاه خودش،
 * هر روز باشگاه دقیقا یک بار، فقط عضله‌های شناخته‌شده و حداقل یک عضله در
 * هر روز. خروجی به ترتیب همان روزهای باشگاه است.
 */
export function validateUserSplit(raw: unknown, gymDays: string[]): { ok: true; days: UserSplitDay[] } | { ok: false; error: string } {
  if (!Array.isArray(raw) || raw.length === 0) return { ok: false, error: "تقسیم هفتگی نامعتبر است" };
  if (raw.length > 7) return { ok: false, error: "تقسیم هفتگی بیش از 7 روز دارد" };
  const byDay = new Map<string, MuscleKey[]>();
  for (const d of raw as any[]) {
    const day = typeof d?.day === "string" ? d.day.trim() : "";
    if (!gymDays.includes(day)) return { ok: false, error: "روزهای تقسیم هفتگی باید از روزهای باشگاه باشند" };
    if (byDay.has(day)) return { ok: false, error: `روز ${day} در تقسیم هفتگی تکراری است` };
    if (!Array.isArray(d?.muscles) || d.muscles.length > MUSCLE_KEYS.length || !d.muscles.every(isMuscleKey)) {
      return { ok: false, error: "گروه عضلانی ناشناخته در تقسیم هفتگی" };
    }
    const muscles = MUSCLE_KEYS.filter((k) => d.muscles.includes(k));
    if (!muscles.length) return { ok: false, error: `برای روز ${day} حداقل یک گروه عضلانی انتخاب کن` };
    byDay.set(day, muscles);
  }
  const missing = gymDays.filter((d) => !byDay.has(d));
  if (missing.length) return { ok: false, error: `برای روز ${missing.join("، ")} گروه عضلانی انتخاب نشده` };
  return { ok: true, days: gymDays.map((day) => ({ day, muscles: byDay.get(day)! })) };
}

export type SplitRuleOptions = { level?: ExerciseLevel; relaxed?: boolean };

const label = (k: MuscleKey) => MUSCLE_LABELS[k];
const joinFa = (xs: string[]) => xs.join("، ");

/**
 * قواعد برنامه‌نویسی یک تقسیم هفتگی (روی کلیدهای عضله):
 * جلوبازو و پشت‌بازو هم‌روز نباشند، یک عضله‌ی بزرگ دو روز پشت‌سرهم (کمتر از
 * 48 ساعت ریکاوری) نیاید، عضله‌ی اصلی هفته جا نیفتد، یک جلسه برای سطح کاربر
 * بیش از حد عضله‌ی بزرگ نداشته باشد، و فشار/کشش و جلو/پشت ران متعادل باشند.
 * خروجی پیام‌های کوتاه فارسی است — هم برای دور اصلاح مدل و هم برای کاربر.
 */
export function splitRuleIssues(days: UserSplitDay[], opts: SplitRuleOptions = {}): string[] {
  const issues: string[] = [];
  const level = opts.level ?? "intermediate";
  const sets = new Map(days.map((d) => [d.day, new Set(d.muscles)]));

  for (const d of days) {
    const s = sets.get(d.day)!;
    if (s.has("biceps") && s.has("triceps")) {
      issues.push(`روز ${d.day} جلوبازو و پشت‌بازو را با هم دارد؛ این دو باید در روزهای جدا تمرین شوند.`);
    }
    const large = d.muscles.filter((m) => LARGE_MUSCLES.has(m));
    if (large.length > MAX_LARGE_PER_DAY[level]) {
      issues.push(`روز ${d.day} برای این سطح عضله‌ی بزرگ زیادی دارد (${joinFa(large.map(label))})؛ حداکثر ${MAX_LARGE_PER_DAY[level]} عضله‌ی بزرگ در یک جلسه.`);
    } else if (s.size > MAX_MUSCLES_PER_DAY[level]) {
      issues.push(`روز ${d.day} گروه عضلانی زیادی دارد (${s.size} گروه)؛ حداکثر ${MAX_MUSCLES_PER_DAY[level]} گروه در یک جلسه.`);
    }
  }

  // روزهای پشت‌سرهم تقویمی (جمعه → شنبه هم پشت‌سرهم است)
  for (let i = 0; i < WEEK_ORDER_FA.length; i++) {
    const a = WEEK_ORDER_FA[i];
    const b = WEEK_ORDER_FA[(i + 1) % WEEK_ORDER_FA.length];
    const sa = sets.get(a), sb = sets.get(b);
    if (!sa || !sb || a === b) continue;
    const both = MUSCLE_KEYS.filter((m) => LARGE_MUSCLES.has(m) && sa.has(m) && sb.has(m));
    if (both.length) issues.push(`${joinFa(both.map(label))} هم ${a} و هم ${b} آمده؛ عضله‌ی بزرگ حداقل 48 ساعت ریکاوری می‌خواهد.`);
  }

  if (!opts.relaxed && days.length >= 3) {
    const all = new Set(days.flatMap((d) => d.muscles));
    const missing = REQUIRED_WEEKLY.filter((m) => !all.has(m));
    if (missing.length) issues.push(`این عضله‌های اصلی در کل هفته تمرین نمی‌شوند: ${joinFa(missing.map(label))}.`);
  }

  const freq = (m: MuscleKey) => days.filter((d) => sets.get(d.day)!.has(m)).length;
  if (freq("chest") > 0 && freq("back") > 0 && Math.abs(freq("chest") - freq("back")) >= 2) {
    issues.push(`تعادل فشار و کشش به هم خورده: سینه ${freq("chest")} بار و پشت ${freq("back")} بار در هفته.`);
  }
  if (freq("quads") > 0 && freq("hamstrings") > 0 && Math.abs(freq("quads") - freq("hamstrings")) >= 2) {
    issues.push(`تعادل جلو و پشت ران به هم خورده: چهارسر ${freq("quads")} بار و پشت ران ${freq("hamstrings")} بار در هفته.`);
  }
  return issues;
}

/** تقسیم آزاد مدل (نام‌های فارسی عضله) → تقسیم کلیدی؛ روز یا عضله‌ی ناشناخته کنار می‌رود. */
export function toKeyedSplit(rawDays: unknown): UserSplitDay[] {
  if (!Array.isArray(rawDays)) return [];
  const out: UserSplitDay[] = [];
  for (const d of rawDays as any[]) {
    const day = typeof d?.day === "string" ? d.day.trim() : "";
    if (!day || out.some((x) => x.day === day)) continue;
    const names: unknown[] = Array.isArray(d?.muscles) ? d.muscles : [];
    const keys = new Set(names.flatMap((m) => (typeof m === "string" ? muscleKeysOf(m) : [])));
    out.push({ day, muscles: MUSCLE_KEYS.filter((k) => keys.has(k)) });
  }
  return out;
}

export function sameSplit(a: UserSplitDay[], b: UserSplitDay[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((d) => {
    const o = b.find((x) => x.day === d.day);
    return !!o && o.muscles.length === d.muscles.length && d.muscles.every((m) => o.muscles.includes(m));
  });
}
