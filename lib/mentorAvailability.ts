// دسترس‌پذیریِ منتور و گزینه‌های مدیریتِ شاگرد — منطقِ خالص (بدونِ Prisma)
// تا هم سرور (روت‌ها، کارتِ کشف) و هم کلاینت (پنلِ منتور، پروفایلِ عمومی)
// یک تعریف داشته باشند. سقف‌ها همین‌جا تعریف می‌شوند و فرم‌ها از همین می‌خوانند.
import { fmtDate } from "@/lib/mentorFormat";
import { faNum } from "@/lib/jalali";
import { toEnglishDigits } from "@/lib/validate";

export const INTAKE_MAX_QUESTIONS = 5;
export const INTAKE_QUESTION_MAX = 200;
export const INTAKE_ANSWER_MAX = 500;
export const AWAY_MESSAGE_MAX = 200;
export const AWAY_MAX_DAYS = 180;
export const WELCOME_MAX = 1000;
export const CAPACITY_MAX = 500;
export const RESPONSE_TIME_OPTIONS = [12, 24, 48, 72] as const;
export const LABEL_NAME_MAX = 24;
export const LABELS_MAX = 20;
export const NOTE_MAX = 2000;
export const NOTES_MAX_PER_STUDENT = 200;
export const PAUSE_REASON_MAX = 300;
export const END_REASON_MAX = 300;

/**
 * OPEN: درخواست باز است · CLOSED: منتور پذیرش را خاموش کرده ·
 * FULL: ظرفیتِ شاگردِ فعال پر است · AWAY: در دسترس نیست و درخواست‌ها متوقف است.
 * عدمِ حضور بدونِ توقفِ درخواست‌ها state را OPEN نگه می‌دارد (away=true).
 */
export type AvailabilityState = "OPEN" | "CLOSED" | "FULL" | "AWAY";

export type AvailabilityInput = {
  acceptingStudents: boolean;
  maxActiveStudents: number | null;
  awayUntil: Date | string | null;
  awayPausesRequests: boolean;
};

export type Availability = {
  state: AvailabilityState;
  away: boolean;
  full: boolean;
  /** YYYY-MM-DD یا null وقتی در دسترس است */
  awayUntil: string | null;
};

/** "YYYY-MM-DD" از Date (@db.Date) یا رشته‌ی ISO */
export function dayIso(v: Date | string | null | undefined): string | null {
  if (!v) return null;
  const s = typeof v === "string" ? v : v.toISOString();
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
}

/** عدمِ حضور تا روزِ بازگشت (خودِ آن روز در دسترس است) */
export function isAway(awayUntil: Date | string | null | undefined, todayIso: string): boolean {
  const d = dayIso(awayUntil);
  return !!d && d > todayIso;
}

export function computeAvailability(p: AvailabilityInput, activeStudents: number, todayIso: string): Availability {
  const away = isAway(p.awayUntil, todayIso);
  const full = p.maxActiveStudents != null && activeStudents >= p.maxActiveStudents;
  let state: AvailabilityState = "OPEN";
  if (!p.acceptingStudents) state = "CLOSED";
  else if (away && p.awayPausesRequests) state = "AWAY";
  else if (full) state = "FULL";
  return { state, away, full, awayUntil: away ? dayIso(p.awayUntil) : null };
}

/** برچسبِ کوتاه برای کارت/چیپ */
export function availabilityShort(state: AvailabilityState, awayUntil: string | null): string {
  switch (state) {
    case "CLOSED": return "شاگرد جدید نمی‌پذیرد";
    case "FULL": return "ظرفیت تکمیل";
    case "AWAY": return awayUntil ? `در دسترس نیست تا ${fmtDate(awayUntil)}` : "در دسترس نیست";
    default: return "پذیرش باز";
  }
}

/** پیامِ ردِ درخواستِ شاگرد (سمتِ سرور) */
export function requestBlockedMessage(state: AvailabilityState, awayUntil: string | null): string {
  switch (state) {
    case "CLOSED": return "این منتور فعلاً شاگرد جدید نمی‌پذیرد";
    case "FULL": return "ظرفیت شاگردهای این منتور تکمیل است";
    case "AWAY": return awayUntil
      ? `این منتور تا ${fmtDate(awayUntil)} در دسترس نیست؛ پس از آن درخواست بده`
      : "این منتور فعلاً در دسترس نیست";
    default: return "";
  }
}

export function responseTimeLabel(hours: number | null | undefined): string | null {
  if (!hours) return null;
  return `معمولاً تا ${faNum(hours)} ساعت پاسخ می‌دهد`;
}

// ───────────────────────── اعتبارسنجی ─────────────────────────

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

function clean(v: string): string {
  return v.replace(/\s+/g, " ").trim();
}

/** لیستِ سؤال‌های پذیرش؛ سؤالِ خالی حذف و تکراری یکی می‌شود */
export function validateIntakeQuestions(v: unknown): Result<string[]> {
  if (v === null || v === undefined) return { ok: true, data: [] };
  if (!Array.isArray(v)) return { ok: false, error: "سؤال‌ها باید لیست باشد" };
  const out: string[] = [];
  for (const q of v) {
    if (typeof q !== "string") return { ok: false, error: "سؤال معتبر نیست" };
    const t = clean(q);
    if (!t) continue;
    if (t.length > INTAKE_QUESTION_MAX) return { ok: false, error: `هر سؤال حداکثر ${faNum(INTAKE_QUESTION_MAX)} نویسه است` };
    if (!out.includes(t)) out.push(t);
  }
  if (out.length > INTAKE_MAX_QUESTIONS) return { ok: false, error: `حداکثر ${faNum(INTAKE_MAX_QUESTIONS)} سؤال` };
  return { ok: true, data: out };
}

export type IntakeAnswer = { question: string; answer: string };

/**
 * پاسخ‌ها به‌ترتیبِ سؤال‌های *فعلیِ* منتور (آرایه‌ی رشته). همه‌ی سؤال‌ها
 * جواب لازم دارند. خروجی snapshotِ سؤال و جواب است تا ویرایشِ بعدیِ
 * سؤال‌ها جوابِ قبلی را بی‌معنا نکند.
 */
export function validateIntakeAnswers(questions: string[], v: unknown): Result<IntakeAnswer[] | null> {
  if (questions.length === 0) return { ok: true, data: null };
  if (!Array.isArray(v)) return { ok: false, error: "به سؤال‌های منتور جواب بده" };
  const out: IntakeAnswer[] = [];
  for (let i = 0; i < questions.length; i++) {
    const raw = v[i];
    if (raw !== undefined && raw !== null && typeof raw !== "string") return { ok: false, error: "جواب معتبر نیست" };
    const a = typeof raw === "string" ? raw.trim() : "";
    if (!a) return { ok: false, error: `به سؤال ${faNum(i + 1)} جواب بده` };
    if (a.length > INTAKE_ANSWER_MAX) return { ok: false, error: `هر جواب حداکثر ${faNum(INTAKE_ANSWER_MAX)} نویسه است` };
    out.push({ question: questions[i], answer: a });
  }
  return { ok: true, data: out };
}

/** خواندنِ امنِ intakeAnswersِ ذخیره‌شده (Json) */
export function parseIntakeAnswers(v: unknown): IntakeAnswer[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((x) =>
    x && typeof x === "object" && typeof (x as any).question === "string" && typeof (x as any).answer === "string"
      ? [{ question: (x as any).question as string, answer: (x as any).answer as string }]
      : []
  );
}

/** سقفِ ظرفیت؛ null/"" = بدونِ سقف */
export function validateCapacity(v: unknown): Result<number | null> {
  if (v === null || v === undefined || v === "") return { ok: true, data: null };
  const n = typeof v === "string" ? Number(toEnglishDigits(v).trim()) : v;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > CAPACITY_MAX) {
    return { ok: false, error: `ظرفیت عددی بین 1 تا ${faNum(CAPACITY_MAX)} است` };
  }
  return { ok: true, data: n };
}

export function validateResponseTime(v: unknown): Result<number | null> {
  if (v === null || v === undefined || v === 0) return { ok: true, data: null };
  if (typeof v !== "number" || !(RESPONSE_TIME_OPTIONS as readonly number[]).includes(v)) return { ok: false, error: "زمان پاسخ معتبر نیست" };
  return { ok: true, data: v };
}

/** متنِ اختیاری با سقف؛ طولانی‌تر رد می‌شود (نه بریدنِ بی‌صدا) */
export function validateOptionalText(v: unknown, max: number, label: string): Result<string | null> {
  if (v === null || v === undefined) return { ok: true, data: null };
  if (typeof v !== "string") return { ok: false, error: `${label} معتبر نیست` };
  const t = v.trim();
  if (!t) return { ok: true, data: null };
  if (t.length > max) return { ok: false, error: `${label} حداکثر ${faNum(max)} نویسه است` };
  return { ok: true, data: t };
}

/** تاریخِ بازگشت: YYYY-MM-DD، بعد از امروز و حداکثر AWAY_MAX_DAYS روز بعد */
export function validateAwayUntil(v: unknown, todayIso: string): Result<string> {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return { ok: false, error: "تاریخ بازگشت معتبر نیست" };
  const d = new Date(v + "T00:00:00.000Z");
  if (isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return { ok: false, error: "تاریخ بازگشت معتبر نیست" };
  if (v <= todayIso) return { ok: false, error: "تاریخ بازگشت باید بعد از امروز باشد" };
  const max = new Date(todayIso + "T00:00:00.000Z");
  max.setUTCDate(max.getUTCDate() + AWAY_MAX_DAYS);
  if (d > max) return { ok: false, error: `حداکثر ${faNum(AWAY_MAX_DAYS)} روز` };
  return { ok: true, data: v };
}

export function validateLabelName(v: unknown): Result<string> {
  if (typeof v !== "string") return { ok: false, error: "نام برچسب معتبر نیست" };
  const t = clean(v);
  if (!t) return { ok: false, error: "نام برچسب را بنویس" };
  if (t.length > LABEL_NAME_MAX) return { ok: false, error: `نام برچسب حداکثر ${faNum(LABEL_NAME_MAX)} نویسه است` };
  return { ok: true, data: t };
}

/** متنِ یادداشتِ خصوصی: خالی نه، بیشتر از سقف رد می‌شود */
export function validateNoteBody(v: unknown): Result<string> {
  if (typeof v !== "string" || !v.trim()) return { ok: false, error: "متن یادداشت را بنویس" };
  const t = v.trim();
  if (t.length > NOTE_MAX) return { ok: false, error: `یادداشت حداکثر ${faNum(NOTE_MAX)} نویسه است` };
  return { ok: true, data: t };
}
