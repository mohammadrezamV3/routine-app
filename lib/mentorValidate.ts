import type { MentorProgramType } from "@prisma/client";
import { parseIsoDate, toEnglishDigits } from "@/lib/validate";

// اعتبارسنجی بدنه‌ی ساخت/ویرایش برنامه‌ی منتور. خروجی فقط فیلدهای
// لیست‌شده‌ست — بدنه‌ی خام هیچ‌وقت به Prisma نمی‌رسه (mass assignment)، پس
// مثلا status/version/sentAt/studentId از بدنه هرگز خونده نمی‌شن.

export const MAX_PROGRAM_ITEMS = 100;
export const PROGRAM_TITLE_MAX = 120; // هم‌اندازه‌ی سقف برچسب روتین در lib/mentorPrivacy.ts
export const PROGRAM_DESC_MAX = 2000;
export const PROGRAM_NOTE_MAX = 1000;
export const ROUTINE_ROLE_MAX = 60;
export const ITEM_TITLE_MAX = 120;
export const ITEM_DETAILS_MAX = 1000;

const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const REPS_RE = /^\d{1,3}(-\d{1,3})?$/;
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export type ItemData = {
  order: number;
  title: string;
  details: string | null;
  repeat: "DAILY" | "WEEKLY";
  days: number[];
  startTime: string | null;
  durationMin: number | null;
  sets: number | null;
  reps: string | null;
  weightKg: number | null;
  restSec: number | null;
};

export type ProgramData = {
  type: MentorProgramType;
  title: string;
  description: string | null;
  note: string | null;
  startDate: Date | null;
  endDate: Date | null;
  items: ItemData[];
};

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

/** "HH:mm" با پذیرش ارقام فارسی (کیبورد فارسی) — خروجی همیشه لاتین */
export function parseHHmm(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = toEnglishDigits(v).trim();
  return HHMM_RE.test(t) ? t : null;
}

function optText(v: unknown, max: number): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t || null;
}

function isBlank(v: unknown): boolean {
  return v === undefined || v === null || v === "";
}

function optInt(v: unknown, min: number, max: number): number | null | "bad" {
  if (isBlank(v)) return null;
  const n = typeof v === "string" ? Number(toEnglishDigits(v)) : v;
  if (typeof n !== "number" || !Number.isInteger(n) || n < min || n > max) return "bad";
  return n;
}

function validateItem(raw: any, idx: number, type: MentorProgramType): Result<ItemData> {
  const where = `آیتم ${idx + 1}`;
  if (!raw || typeof raw !== "object") return { ok: false, error: `${where} نامعتبره` };

  const title = typeof raw.title === "string" ? raw.title.trim().slice(0, ITEM_TITLE_MAX) : "";
  if (!title) return { ok: false, error: `${where}: عنوان لازمه` };

  const repeat = raw.repeat === "DAILY" ? "DAILY" : raw.repeat === "WEEKLY" || raw.repeat === undefined ? "WEEKLY" : null;
  if (!repeat) return { ok: false, error: `${where}: نوع تکرار نامعتبره` };

  let days: number[];
  if (repeat === "DAILY") {
    days = ALL_DAYS.slice();
  } else {
    if (!Array.isArray(raw.days) || raw.days.length > 7) return { ok: false, error: `${where}: روزهای هفته نامعتبره` };
    const set = new Set<number>();
    for (const d of raw.days) {
      if (typeof d !== "number" || !Number.isInteger(d) || d < 0 || d > 6) return { ok: false, error: `${where}: روزهای هفته نامعتبره` };
      set.add(d);
    }
    if (set.size === 0) return { ok: false, error: `${where}: حداقل یک روز هفته رو انتخاب کن` };
    days = Array.from(set).sort((a, b) => a - b);
  }

  let startTime: string | null = null;
  if (!isBlank(raw.startTime)) {
    startTime = parseHHmm(raw.startTime);
    if (!startTime) return { ok: false, error: `${where}: ساعت شروع باید به شکل HH:mm باشه` };
  }

  const durationMin = optInt(raw.durationMin, 1, 1440);
  if (durationMin === "bad") return { ok: false, error: `${where}: مدت (دقیقه) باید بین 1 تا 1440 باشد` };

  // فیلدهای حرکتی فقط برای برنامه‌ی تمرینی معنا دارن؛ برای روتین دور ریخته می‌شن
  let sets: number | null = null;
  let reps: string | null = null;
  let weightKg: number | null = null;
  let restSec: number | null = null;
  if (type === "WORKOUT") {
    const s = optInt(raw.sets, 1, 100);
    if (s === "bad") return { ok: false, error: `${where}: تعداد ست باید بین 1 تا 100 باشد` };
    sets = s;

    if (!isBlank(raw.reps)) {
      const r = toEnglishDigits(String(raw.reps)).trim();
      if (!REPS_RE.test(r)) return { ok: false, error: `${where}: تکرار باید عدد یا بازه (مثل 8-12) باشه` };
      reps = r;
    }

    if (!isBlank(raw.weightKg)) {
      const w = typeof raw.weightKg === "string" ? Number(toEnglishDigits(raw.weightKg)) : raw.weightKg;
      if (typeof w !== "number" || !Number.isFinite(w) || w < 0 || w > 1000) return { ok: false, error: `${where}: وزنه باید بین 0 تا 1000 کیلوگرم باشد` };
      weightKg = Math.round(w * 10) / 10;
    }

    const rs = optInt(raw.restSec, 0, 3600);
    if (rs === "bad") return { ok: false, error: `${where}: استراحت باید بین 0 تا 3600 ثانیه باشد` };
    restSec = rs;
  }

  return {
    ok: true,
    data: { order: idx, title, details: optText(raw.details, ITEM_DETAILS_MAX), repeat, days, startTime, durationMin, sets, reps, weightKg, restSec },
  };
}

/**
 * بدنه‌ی POST/PUT برنامه. `type` در ویرایش هم لازمه (همون بدنه‌ی POST بدون
 * mentorshipId)، ولی روت PUT می‌تونه نوع فعلی برنامه رو به‌عنوان پیش‌فرض بده.
 */
export function validateProgramInput(body: any, fallbackType?: MentorProgramType): Result<ProgramData> {
  if (!body || typeof body !== "object") return { ok: false, error: "بدنه‌ی درخواست نامعتبره" };

  const type = body.type === "ROUTINE" || body.type === "WORKOUT" ? (body.type as MentorProgramType) : body.type === undefined ? fallbackType : undefined;
  if (!type) return { ok: false, error: "نوع برنامه نامعتبره" };

  const title = typeof body.title === "string" ? body.title.trim().slice(0, PROGRAM_TITLE_MAX) : "";
  if (!title) return { ok: false, error: "عنوان برنامه لازمه" };

  let startDate: Date | null = null;
  let endDate: Date | null = null;
  if (!isBlank(body.startDate)) {
    startDate = parseIsoDate(body.startDate);
    if (!startDate) return { ok: false, error: "تاریخ شروع نامعتبره (YYYY-MM-DD)" };
  }
  if (!isBlank(body.endDate)) {
    endDate = parseIsoDate(body.endDate);
    if (!endDate) return { ok: false, error: "تاریخ پایان نامعتبره (YYYY-MM-DD)" };
  }
  if (startDate && endDate && endDate < startDate) return { ok: false, error: "تاریخ پایان قبل از تاریخ شروعه" };

  if (!Array.isArray(body.items)) return { ok: false, error: "آیتم‌های برنامه لازمه" };
  if (body.items.length > MAX_PROGRAM_ITEMS) return { ok: false, error: `حداکثر ${MAX_PROGRAM_ITEMS} آیتم مجازه` };

  const items: ItemData[] = [];
  for (let i = 0; i < body.items.length; i++) {
    const r = validateItem(body.items[i], i, type);
    if (!r.ok) return r;
    items.push(r.data);
  }

  if (body.note !== undefined && body.note !== null && typeof body.note !== "string") return { ok: false, error: "یادداشت برنامه نامعتبره" };

  return {
    ok: true,
    data: {
      type,
      title,
      description: optText(body.description, PROGRAM_DESC_MAX),
      note: optText(body.note, PROGRAM_NOTE_MAX),
      startDate,
      endDate,
      items,
    },
  };
}

/**
 * نقش منتور در حوزه‌ی روتین (مثلا «استاد ریاضی»، «مشاور کنکور»).
 * null/"" یعنی پاک‌کردن. فاصله‌های تکراری یکی می‌شن؛ بیشتر از سقف رد می‌شه
 * (نه بریده‌شدن بی‌صدا) تا منتور بدونه متنش کامل ذخیره نشده.
 */
export function validateRoutineRole(v: unknown): Result<string | null> {
  if (v === undefined || v === null) return { ok: true, data: null };
  if (typeof v !== "string") return { ok: false, error: "نقش روتین نامعتبره" };
  const t = v.replace(/\s+/g, " ").trim();
  if (!t) return { ok: true, data: null };
  if (t.length > ROUTINE_ROLE_MAX) return { ok: false, error: `نقش روتین حداکثر ${ROUTINE_ROLE_MAX} حرفه` };
  return { ok: true, data: t };
}
