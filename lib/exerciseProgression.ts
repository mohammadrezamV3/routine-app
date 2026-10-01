// رفتار برنامه‌ی تمرینی وقتی روز تمرین بدون تمرین می‌گذرد.
//
//   • «رد شدن» (skip، پیش‌فرض و رفتار قبلی): برنامه به تقویم گره خورده —
//     هر روز هفته همیشه تمرین همان روز را نشان می‌دهد؛ پا جا ماند، فردا
//     (مثلا) سرشانه است.
//   • «ماندن» (stay): تمرین جامانده فردا دوباره می‌آید، و پس‌فردا، … تا
//     وقتی کاربر برایش «شروع تمرین» بزند. عملا کل برنامه یک روز عقب
//     می‌رود (فاصله‌ی روزهای استراحت هم حفظ می‌شود).
//
// مدل داده: هیچ برنامه‌ی «شیفت‌خورده»ای ذخیره نمی‌شود. تنها چیزی که لازم
// است «عقب‌افتادگی» (lag) است: تمرین روز D = تمرین روز هفته‌ی (D − lag).
// lag از روی لاگ‌ها *مشتق* می‌شود: از `since` روز‌به‌روز جلو می‌رویم و هر
// روز گذشته‌ای که تمرین مؤثرش وجود داشت ولی «شروع» نخورد، lag را یکی
// زیاد می‌کند. فقط lag mod 7 روی نگاشت روز هفته اثر دارد.
//
// ترجیح (mode + نشانگر پیشرفت) با getSetting/setSetting از lib/storage.ts
// ذخیره می‌شود — همان قرارداد مهمان/لاگین. نشانگر (since, lag) گاهی جلو
// کشیده می‌شود (rebase) تا بازه‌ی لاگ‌هایی که باید خوانده شود کوتاه بماند.
import { FA_WEEKDAY, isoLocal } from "./jalali";
import type { ExerciseLogEntry, ExerciseLogRange } from "./exerciseStats";

export type MissedDayMode = "skip" | "stay";

export type MissedDayPref = {
  mode: MissedDayMode;
  /** از چه روزی (YYYY-MM-DD) شمارش عقب‌افتادگی شروع می‌شود؛ null در حالت skip */
  since: string | null;
  /** عقب‌افتادگی انباشته تا ابتدای روز `since` (۰ تا ۶) */
  lag: number;
  /** نشانگر مال کدام پلن است — پلن جدید از صفر شروع می‌کند */
  planId: string | null;
};

export const DEFAULT_MISSED_DAY_PREF: MissedDayPref = { mode: "skip", since: null, lag: 0, planId: null };

export const MISSED_DAY_MODE_OPTIONS: { value: MissedDayMode; label: string }[] = [
  { value: "skip", label: "رد شدن" },
  { value: "stay", label: "ماندن" },
];

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeMissedDayPref(v: unknown): MissedDayPref {
  if (!v || typeof v !== "object") return DEFAULT_MISSED_DAY_PREF;
  const o = v as Record<string, unknown>;
  const mode: MissedDayMode = o.mode === "stay" ? "stay" : "skip";
  if (mode === "skip") return DEFAULT_MISSED_DAY_PREF;
  const since = typeof o.since === "string" && ISO_RE.test(o.since) ? o.since : null;
  const lagRaw = typeof o.lag === "number" && Number.isFinite(o.lag) ? Math.floor(o.lag) : 0;
  return {
    mode,
    since,
    lag: ((lagRaw % 7) + 7) % 7,
    planId: typeof o.planId === "string" ? o.planId.slice(0, 64) : null,
  };
}

/** ترجیح تازه برای وقتی کاربر حالت را عوض می‌کند — «ماندن» از امروز شمرده می‌شود. */
export function prefForMode(mode: MissedDayMode, todayIso: string, planId: string | null): MissedDayPref {
  return mode === "stay" ? { mode, since: todayIso, lag: 0, planId } : DEFAULT_MISSED_DAY_PREF;
}

/**
 * «شروع تمرین» برای این روز زده شده؟ لاگ‌های قدیمی قبل از ستون startedAt
 * فقط completed/completedItems دارند — هر پیشرفتی هم یعنی شروع شده.
 */
export function wasStarted(entry: ExerciseLogEntry | undefined): boolean {
  return !!entry && (!!entry.started || entry.completed || entry.completedItems.length > 0);
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDaysIso(iso: string, n: number): string {
  const d = parseIso(iso);
  d.setDate(d.getDate() + n);
  return isoLocal(d);
}

export function weekdayOf(iso: string): string {
  return FA_WEEKDAY[parseIso(iso).getDay()];
}

type Ctx = {
  pref: MissedDayPref;
  planId: string;
  /** اسم روزهای هفته‌ای که در پلن تمرین دارند */
  planDays: ReadonlySet<string>;
  /** روز ساخت پلن — قبل از آن هیچ روزی «جامانده» حساب نمی‌شود */
  planStartIso: string;
  logs: ExerciseLogRange;
  todayIso: string;
};

/** نقطه‌ی شروع شمارش و lag پایه، با درنظرگرفتن عوض‌شدن پلن */
function baseline(ctx: Ctx): { start: string; lag: number } | null {
  const { pref, planId, planStartIso } = ctx;
  if (pref.mode !== "stay" || !pref.since) return null;
  const samePlan = pref.planId === planId;
  const start = pref.since > planStartIso ? pref.since : planStartIso;
  return { start, lag: samePlan ? pref.lag : 0 };
}

/**
 * عقب‌افتادگی در *ابتدای* روز target. روزهای آینده (بعد از امروز) فرض
 * می‌شود انجام می‌شوند، پس پیش‌بینی آینده با lag امروز است. امروز خودش
 * هنوز «جامانده» نیست — تا آخر روز وقت هست.
 */
export function lagAt(ctx: Ctx, targetIso: string): number {
  const base = baseline(ctx);
  if (!base) return 0;
  if (targetIso < base.start) return 0; // قبل از فعال‌شدن «ماندن»، برنامه همان تقویمی بود
  let lag = base.lag;
  const end = targetIso < ctx.todayIso ? targetIso : ctx.todayIso;
  // سقف امنیتی — بیشتر از بازه‌ای که لاگش خوانده شده معنا ندارد
  let guard = 0;
  for (let d = base.start; d < end && guard < 800; d = addDaysIso(d, 1), guard++) {
    const eff = weekdayOf(addDaysIso(d, -lag));
    if (ctx.planDays.has(eff) && !wasStarted(ctx.logs[d])) lag = (lag + 1) % 7;
  }
  return lag;
}

/** اسم روز هفته‌ای که تمرینش در روز target نشان داده می‌شود */
export function effectiveDayName(ctx: Ctx, targetIso: string): string {
  const lag = lagAt(ctx, targetIso);
  return weekdayOf(addDaysIso(targetIso, -lag));
}

/** از کدام روز باید لاگ خوانده شود تا lag درست حساب شود (null = لازم نیست) */
export function logsNeededFrom(ctx: Omit<Ctx, "logs">): string | null {
  const base = baseline({ ...ctx, logs: {} });
  return base ? base.start : null;
}

/**
 * نشانگر را جلو می‌کشد وقتی `since` خیلی قدیمی شده (یا مال پلن دیگری‌ست)،
 * تا بازه‌ی لاگ لازم کوتاه بماند. null = تغییری لازم نیست.
 */
export function rebasedPref(ctx: Ctx, maxAgeDays = 60): MissedDayPref | null {
  const base = baseline(ctx);
  if (!base) return null;
  const samePlan = ctx.pref.planId === ctx.planId;
  const staleSince = base.start < addDaysIso(ctx.todayIso, -maxAgeDays);
  if (samePlan && !staleSince && ctx.pref.since === base.start) return null;
  const newSince = staleSince ? addDaysIso(ctx.todayIso, -7) : base.start;
  return { mode: "stay", since: newSince, lag: lagAt(ctx, newSince), planId: ctx.planId };
}

export function planStartIsoOf(createdAt: string | null | undefined, fallbackIso: string): string {
  if (!createdAt) return fallbackIso;
  const d = new Date(createdAt);
  return Number.isNaN(d.getTime()) ? fallbackIso : isoLocal(d);
}
