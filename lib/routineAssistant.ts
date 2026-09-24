// هسته‌ی «مدیرِ برنامه» — تبدیلِ نقشه‌ای که مدل زبانی پیشنهاد می‌دهد به
// تغییرِ واقعی روی برنامه‌های کاربر.
//
// چرا این‌جا و نه داخلِ روت: خروجیِ یک مدلِ زبانی ورودیِ غیرقابل‌اعتماد است.
// هیچ‌کدام از این‌ها را نباید باور کرد: که ساعت معتبر است، که برنامه‌ی مرجع
// وجود دارد، که با چیزِ دیگری تداخل ندارد، که روز عددِ ۰..۶ است، که تعدادِ
// عملیات معقول است. پس مدل فقط *پیشنهاد* می‌دهد و تصمیمِ نهایی این‌جاست —
// همان اعتبارسنجی‌هایی که فرم‌های دستی (AddProgramForm/EditOccurrenceForm/
// MoveOccurrenceModal) انجام می‌دهند، تا نتیجه‌ی دو مسیر یکی باشد.
//
// این فایل عمدا هیچ وابستگی‌ای به Prisma/شبکه/React ندارد تا کاملا
// تست‌پذیر بماند.

// فقط تایپ — `lib/storage.ts` منطقِ سمتِ کلاینت (localStorage/fetch) دارد و
// نباید داخلِ باندلِ سرور کشیده شود؛ `import type` تضمین می‌کند که نمی‌شود.
import type { CustomOccurrence, Importance } from "./storage";
import { addDaysIso, dayBeforeIso, jsDayOfIso, sameWeekIso, timeStartMinutes, toEnDigits, toFaDigits, WEEK_ORDER } from "./schedule";
import { isoLocal, J_MONTHS, jalaliToIso, toJalali, faNum } from "./jalali";
import { normalizeTimeToFa } from "./timeUtils";
import { rangesOverlap } from "./conflict";

/** سقفِ تعدادِ برنامه‌ی یک کاربر — جلوی پرکردنِ UserSetting با یک درخواست را می‌گیرد */
export const MAX_OCCURRENCES = 200;
/**
 * سقفِ عملیاتِ یک پیام. قبلا ۱۲ بود و «کلِ هفته‌ام را از نو بچین» وسطش
 * بریده می‌شد؛ ۴۰ برای بازچیدنِ یک هفته‌ی کامل جا دارد و هنوز جلوی یک
 * خروجیِ بی‌مهارِ مدل را می‌گیرد.
 */
export const MAX_OPS_PER_MESSAGE = 40;
/** تعدادِ استفاده‌ی رایگان برای کاربرِ بدونِ اشتراک */
export const FREE_ASSISTANT_USES = 3;

/**
 * برنامه لازم نیست ساعت داشته باشد.
 *
 * «امروز ورزش دارم» یک برنامه‌ی واقعی است بدونِ هیچ ساعتی؛ اجبار به ساعت
 * یا حدس‌زدنِ آن، چیزی می‌سازد که کاربر نگفته. برنامه‌ی بی‌ساعت `time` خالی
 * می‌گیرد و `sortTasksByTime` خودش آن را ته فهرستِ همان روز می‌نشاند.
 * چون بازه‌ای ندارد، با هیچ‌چیز هم تداخل پیدا نمی‌کند.
 */
export const DEFAULT_DURATION_MIN = 60;
export type AwakeWindow = { startMin: number; endMin: number };
export const DEFAULT_AWAKE: AwakeWindow = { startMin: 8 * 60, endMin: 22 * 60 };

/**
 * تکرارِ درون‌روزی («هر یک ساعت به مدتِ ۵ دقیقه») — یک add با فاصله‌ی
 * ثابت چند بار در همان روز تکرار می‌شود، نه یک برنامه‌ی تک.
 */
export const MIN_REPEAT_EVERY_MIN = 5;
export const MAX_REPEAT_EVERY_MIN = 720;
export const DEFAULT_REPEAT_DURATION_MIN = 5;
/** سقفِ تعدادِ تکرار در یک op — جلوی یک repeatEveryMin خیلی کوچک را می‌گیرد */
export const MAX_REPEATS_PER_OP = 48;

export const DAY_NAME_FA: Record<number, string> = {
  6: "شنبه", 0: "یکشنبه", 1: "دوشنبه", 2: "سه‌شنبه", 3: "چهارشنبه", 4: "پنجشنبه", 5: "جمعه",
};

// ─────────────────────────────────────────────────────────────────────────
// شکلِ خامِ چیزی که مدل برمی‌گرداند (هیچ فیلدی تضمین‌شده نیست)
// ─────────────────────────────────────────────────────────────────────────

export type RawOp = {
  op?: unknown;
  ref?: unknown;      // شماره‌ی ردیفِ برنامه در فهرستی که به مدل داده‌ایم (۱-پایه)
  name?: unknown;
  days?: unknown;     // برای add — آرایه‌ی روز (نامِ فارسی یا jsDay)
  toDay?: unknown;    // برای move
  start?: unknown;
  end?: unknown;
  importance?: unknown;
  tag?: unknown;
  notify?: unknown;
  /** برای add — تکرارِ درون‌روزی: هر چند دقیقه یک‌بار («هر یک ساعت») */
  repeatEveryMin?: unknown;
  /** برای add — آخرین ساعتِ مجاز برای شروعِ یک تکرار؛ نبودش یعنی تا آخرِ بیداری */
  repeatUntil?: unknown;
  /** add: تاریخ‌های مشخصِ تک‌روزه (تکرار نمی‌شوند) */
  date?: unknown;
  dates?: unknown;
  /** retime/move/delete: فقط همین یک تاریخ، نه کلِ تکرارها */
  toDate?: unknown;
  /** add/update/delete: بازه‌ی دوره */
  from?: unknown;
  until?: unknown;
  weeks?: unknown;
  months?: unknown;
};

export type AssistantPlan = {
  /** مدل تشخیص داده پیام ربطی به برنامه‌ریزی ندارد */
  offTopic?: boolean;
  /** پاسخِ متنی برای وقتی که فقط سوال پرسیده شده (بدون تغییر) */
  reply?: string;
  ops?: RawOp[];
};

export type ApplyOutcome = {
  occurrences: CustomOccurrence[];
  removed: string[];
  /** جمله‌های «انجام شد» — دقیقا چیزی که واقعا اتفاق افتاد */
  applied: string[];
  /** جمله‌های «نشد، چون…» — هر کدام باید خودش کامل و قابل‌فهم باشد */
  problems: string[];
  /**
   * پاسخ‌های آماده‌ای که کاربر می‌تواند فقط رویشان بزند به‌جای تایپ‌کردن.
   * وقتی کاری نشد، بن‌بست ندهیم: راهِ ادامه را جلوی دستش بگذاریم.
   */
  options: string[];
  /** آیا چیزی واقعا تغییر کرد (یعنی باید ذخیره شود) */
  changed: boolean;
};

// ─────────────────────────────────────────────────────────────────────────
// کمکی‌ها
// ─────────────────────────────────────────────────────────────────────────

function newOccId(): string {
  return "custom-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function isBlank(v: unknown): boolean {
  return v === undefined || v === null || v === "";
}

/** ساعتِ معتبر «HH:MM» با ارقامِ فارسی، یا null اگر ورودی بدشکل/خارج از بازه بود */
export function parseClock(v: unknown): { fa: string; min: number } | null {
  if (typeof v !== "string") return null;
  const en = toEnDigits(v).trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(en) || /^(\d{1,2})$/.exec(en);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = m[2] === undefined ? 0 : Number(m[2]);
  if (!Number.isInteger(hh) || !Number.isInteger(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  const fa = normalizeTimeToFa(`${hh}:${String(mm).padStart(2, "0")}`);
  return { fa, min: hh * 60 + mm };
}

function isJsDay(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 6;
}

const DAY_BY_NAME: Record<string, number> = {
  "شنبه": 6, "یکشنبه": 0, "دوشنبه": 1, "سهشنبه": 2, "چهارشنبه": 3, "پنجشنبه": 4, "جمعه": 5,
};

/**
 * روزِ هفته از خروجیِ مدل — هم نامِ فارسی («سه‌شنبه») هم عدد.
 *
 * چرا نام: نگاشتِ «شنبه=6، یکشنبه=0» برخلافِ ترتیبِ طبیعیِ هفته‌ی ایرانی
 * است و مدل گاهی یکی جابه‌جا می‌زد — یعنی برنامه روزِ اشتباه ثبت می‌شد.
 * حالا مدل همان نامی را می‌نویسد که کاربر گفته و تبدیل این‌جا انجام می‌شود.
 */
export function parseDay(v: unknown): number | null {
  if (isJsDay(v)) return v;
  if (typeof v !== "string") return null;
  const en = toEnDigits(v).trim();
  if (/^\d$/.test(en)) return isJsDay(Number(en)) ? Number(en) : null;
  const key = en.replace(/[\s‌‏]/g, "").replace(/ي/g, "ی").replace(/ك/g, "ک");
  return key in DAY_BY_NAME ? DAY_BY_NAME[key] : null;
}

function parseDays(v: unknown): number[] {
  const arr = Array.isArray(v) ? v : isBlank(v) ? [] : [v];
  const out: number[] = [];
  for (const x of arr) {
    const d = parseDay(x);
    if (d !== null && !out.includes(d)) out.push(d);
  }
  return out;
}

/**
 * تاریخ از خروجیِ مدل → ISO محلی. میلادی («2026-10-01») و جلالی
 * («1405/07/09») هر دو پذیرفته‌اند؛ مدل تاریخِ جلالی را که کاربر گفته
 * («تا ۱۵ آبان») مستقیم می‌نویسد و تبدیلِ دقیق این‌جا انجام می‌شود، نه با
 * حسابِ ذهنیِ مدل.
 */
export function parseDateInput(v: unknown, todayIso: string): string | null {
  if (typeof v !== "string") return null;
  const t = toEnDigits(v).trim().replace(/‌/g, "");
  if (t === "امروز" || t.toLowerCase() === "today") return todayIso;
  if (t === "فردا" || t.toLowerCase() === "tomorrow") return addDaysIso(todayIso, 1);
  if (t === "پسفردا" || t === "پس فردا") return addDaysIso(todayIso, 2);
  const m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(t);
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  if (y >= 1300 && y <= 1500) return jalaliToIso(y, mo, d);
  if (y < 1900 || y > 2200) return null;
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return isoLocal(date);
}

/** «۵ مهر» — برچسبِ کوتاهِ تاریخ برای پیام‌ها */
export function faDateLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${faNum(j[2])} ${J_MONTHS[j[1] - 1]}`;
}

/** بازه‌ی تاریخیِ یک برنامه — هر دو سر شامل؛ نبودِ هر سر یعنی باز */
export type Period = { from?: string; to?: string };

function periodOf(o: CustomOccurrence): Period {
  return { from: o.startDate, to: o.endDate };
}

function periodsOverlap(a: Period, b: Period): boolean {
  return (!a.from || !b.to || a.from <= b.to) && (!b.from || !a.to || b.from <= a.to);
}

function periodLabel(p: Period, todayIso: string): string {
  if (p.from && p.to && p.from === p.to) return `(فقط ${faDateLabel(p.from)})`;
  if (p.to) return `(${p.from && p.from > todayIso ? `از ${faDateLabel(p.from)} ` : ""}تا ${faDateLabel(p.to)})`;
  if (p.from && p.from > todayIso) return `(از ${faDateLabel(p.from)})`;
  return "";
}

/** آیا این برنامه در تاریخِ `iso` واقعا اتفاق می‌افتد؟ */
function occursOn(o: CustomOccurrence, iso: string): boolean {
  return o.jsDay === jsDayOfIso(iso) && (!o.startDate || o.startDate <= iso) && (!o.endDate || iso <= o.endDate);
}

/**
 * آیا متنِ کاربر اصلا حرفی از ساعت زده؟ مدل با وجودِ دستورِ صریح گاهی برای
 * برنامه‌ی بی‌ساعت ساعت می‌سازد («هر روز ورزش» → ۰۸:۰۰)؛ این قفلِ سمتِ
 * سرور است: اگر کاربر هیچ نشانه‌ای از زمان نداده، ساعتِ پیشنهادیِ مدل
 * برای add/move دور ریخته می‌شود.
 */
const TIME_HINT_RE = new RegExp(
  [
    String.raw`\d{1,2}\s*[:٫.]\s*\d{2}`,
    String.raw`\d{1,2}\s*(?:تا|الی|-|–)\s*\d{1,2}(?!\s*(?:روز|هفته|ماه|جلسه|بار|تا|عدد|نفر))`,
    "ساعت", "صبح", "ظهر", "عصر", "شب", "غروب", "سحر", "طلوع", "بامداد", "نهار", "ناهار", "شام", "دقیقه",
    String.raw`\b(?:am|pm)\b`,
  ].join("|"),
  "i"
);
export function mentionsTime(text: string): boolean {
  return TIME_HINT_RE.test(toEnDigits(text));
}

/**
 * ساعتی که کاربر نگفته، از add/move پاک می‌شود. retime دست نمی‌خورد: آن
 * عملیات خودش یعنی «ساعت را عوض کن» و بدونِ ساعت معنایش «ساعت را بردار» است.
 */
export function stripInventedTimes(ops: RawOp[], userTexts: string[]): { ops: RawOp[]; stripped: number } {
  if (userTexts.some(mentionsTime)) return { ops, stripped: 0 };
  let stripped = 0;
  const out = ops.map((o) => {
    if ((o?.op === "add" || o?.op === "move") && (!isBlank(o.start) || !isBlank(o.end))) {
      stripped++;
      const { start: _s, end: _e, ...rest } = o;
      return rest;
    }
    return o;
  });
  return { ops: out, stripped };
}

function occStart(o: CustomOccurrence): number | null {
  return timeStartMinutes(o.time);
}

/** پایانِ بازه؛ برنامه‌ی بدونِ ساعتِ پایان یک لحظه حساب می‌شود (مثل rangesOverlap) */
function occEnd(o: CustomOccurrence): number | null {
  const parts = toEnDigits(o.time).split(/[–—-]/);
  if (parts.length !== 2) return null;
  const m = /(\d{1,2}):(\d{2})/.exec(parts[1]);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function timeLabel(startFa: string, endFa?: string | null): string {
  return endFa ? `${startFa} – ${endFa}` : startFa;
}

/**
 * تداخل را روی خودِ فهرستِ occurrences می‌سنجد، نه با tasksForDate.
 *
 * چرا: tasksForDate به یک `Date` نیاز دارد و «هفته‌ی جاری» را فرض می‌کند،
 * ولی این‌جا در حال ساختنِ یک وضعیتِ *میانی* هستیم که هنوز ذخیره نشده و
 * ممکن است چند عملیات پشت‌سرهم رویش اجرا شود.
 *
 * `period` بازه‌ی تاریخیِ برنامه‌ی جدید است: دو برنامه فقط وقتی تداخل دارند
 * که دوره‌هایشان هم هم‌پوشانی داشته باشد — یک کلاسِ تمام‌شده یا یک
 * برنامه‌ی تک‌روزه‌ی هفته‌ی بعد نباید جلوی ساعتِ این هفته را بگیرد.
 */
export function findConflict(
  list: CustomOccurrence[],
  jsDay: number,
  startMin: number,
  endMin: number | null,
  excludeId?: string,
  period?: Period
): CustomOccurrence | null {
  for (const o of list) {
    if (o.jsDay !== jsDay) continue;
    if (excludeId && o.id === excludeId) continue;
    if (period && !periodsOverlap(period, periodOf(o))) continue;
    const s = occStart(o);
    if (s === null) continue;
    if (rangesOverlap(startMin, endMin, s, occEnd(o))) return o;
  }
  return null;
}

/**
 * اولین بازه‌ی آزادِ `durationMin`دقیقه‌ای از `fromMin` به بعد، حداکثر تا
 * `untilMin`.
 */
export function findFreeSlot(
  list: CustomOccurrence[],
  jsDay: number,
  fromMin: number,
  durationMin: number,
  untilMin: number,
  excludeId?: string,
  period?: Period
): { startMin: number; endMin: number | null } | null {
  const STEP = 15;
  for (let s = fromMin; s + durationMin <= untilMin; s += STEP) {
    const e = durationMin === 0 ? null : s + durationMin;
    if (!findConflict(list, jsDay, s, e, excludeId, period)) return { startMin: s, endMin: e };
  }
  return null;
}

export function minutesToFa(min: number): string {
  return normalizeTimeToFa(`${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`);
}

/**
 * نزدیک‌ترین بازه‌ی آزادِ هم‌طولِ همان روز — پاسخِ سوالِ «اون ساعت پره، پس کِی؟».
 * null یعنی آن روز واقعا جای خالیِ هم‌اندازه ندارد.
 */
export function suggestFreeSlot(
  list: CustomOccurrence[],
  jsDay: number,
  startMin: number,
  endMin: number | null,
  excludeId?: string,
  period?: Period
): { startFa: string; endFa: string | null } | null {
  const duration = endMin === null ? 0 : endMin - startMin;
  const slot = findFreeSlot(list, jsDay, startMin, duration, 24 * 60 - 1, excludeId, period);
  if (!slot) return null;
  return {
    startFa: minutesToFa(slot.startMin),
    endFa: slot.endMin === null ? null : minutesToFa(slot.endMin),
  };
}

const IMPORTANCE_VALUES: Importance[] = ["low", "medium", "high", "veryHigh"];
function parseImportance(v: unknown): Importance | null {
  return typeof v === "string" && (IMPORTANCE_VALUES as string[]).includes(v) ? (v as Importance) : null;
}

/**
 * فهرستی که به مدل داده می‌شود — با شماره‌ی ردیفِ ۱-پایه.
 *
 * عمدا شناسه‌ی واقعی (`custom-m3x8...`) به مدل داده نمی‌شود: رشته‌های تصادفیِ
 * بلند را مدل‌ها خوب کپی نمی‌کنند. نگاشتِ عدد → شناسه فقط سمتِ سرور است.
 *
 * برنامه‌های تمام‌شده (endDate قبل از امروز) و مخفی‌شده (کلیدِ قدیمیِ
 * removed) نشان داده نمی‌شوند — کاربر آن‌ها را نمی‌بیند و مدل نباید با
 * آن‌ها «امروز چی دارم» را جواب بدهد. شماره‌ها ولی همان اندیسِ فهرستِ کامل
 * می‌مانند تا نگاشتِ applyOps عوض نشود.
 */
export function describeSchedule(
  list: CustomOccurrence[],
  opts: { todayIso?: string; removed?: Set<string> } = {}
): string {
  const lines: string[] = [];
  list.forEach((o, i) => {
    if (opts.todayIso && o.endDate && o.endDate < opts.todayIso) return;
    if (opts.removed?.has(`${o.id}|${o.jsDay}`)) return;
    const bits = [`#${i + 1}`, DAY_NAME_FA[o.jsDay] ?? "?", o.time ? toEnDigits(o.time) : "بی‌ساعت", o.name];
    if (o.startDate && o.endDate && o.startDate === o.endDate) bits.push(`فقط ${o.startDate}`);
    else if (o.endDate) bits.push(`دوره ${o.startDate ?? "?"} تا ${o.endDate}`);
    else if (o.startDate && opts.todayIso && o.startDate > opts.todayIso) bits.push(`از ${o.startDate}`);
    if (o.tag) bits.push(`تگ:${o.tag}`);
    if (o.importance) bits.push(`اهمیت:${o.importance}`);
    if (o.notify === false) bits.push("اعلان:خاموش");
    lines.push(bits.join(" | "));
  });
  return lines.length ? lines.join("\n") : "(برنامه‌ای ثبت نشده)";
}

// ─────────────────────────────────────────────────────────────────────────
// اعمالِ نقشه
// ─────────────────────────────────────────────────────────────────────────

type TimeSpec = { kind: "keep" } | { kind: "clear" } | { kind: "set"; start: { fa: string; min: number }; end: { fa: string; min: number } | null };

/**
 * `ops` را یکی‌یکی و به‌ترتیب روی فهرست اعمال می‌کند. هر عملیات روی نتیجه‌ی
 * عملیاتِ قبلی سوار می‌شود، و هر شکستْ فقط همان عملیات را رد می‌کند نه کلِ پیام را.
 *
 * هیچ تغییری گذشته را پاک نمی‌کند (همان قراردادِ فرم‌های دستی): حذف/تغییرِ
 * «از امروز به بعد» ردیفِ قبلی را با endDate می‌بندد و ردیفِ تازه از امروز
 * شروع می‌شود؛ تغییرِ «فقط یک روز» ردیف را دورِ همان روز دو تکه می‌کند.
 */
export function applyOps(
  input: CustomOccurrence[],
  removedInput: string[],
  ops: RawOp[],
  todayIso: string,
  awake: AwakeWindow = DEFAULT_AWAKE
): ApplyOutcome {
  let list = [...input];
  let removed = [...removedInput];
  const applied: string[] = [];
  const problems: string[] = [];
  const options: string[] = [];

  /** گزینه‌ی تکراری اضافه نکن و بیش از چهار تا هم نده — انتخاب باید ساده بماند */
  function offer(...items: string[]) {
    for (const it of items) if (it && !options.includes(it) && options.length < 4) options.push(it);
  }

  // نگاشتِ شماره‌ی ردیف → شناسه، *قبل* از هر تغییری گرفته می‌شود.
  const refToId = new Map<number, string>();
  input.forEach((o, i) => refToId.set(i + 1, o.id));
  // وقتی یک عملیات ردیفی را با ردیفِ تازه عوض می‌کند، عملیاتِ بعدیِ همان
  // پیام روی همان ref باید به ردیفِ تازه برسد («ساعتش رو ۱۰ کن و اسمش رو
  // عوض کن»). null یعنی در همین پیام حذف شد.
  const successor = new Map<string, string | null>();

  function resolve(ref: unknown): CustomOccurrence | { error: string } {
    const n = typeof ref === "string" ? Number(toEnDigits(ref).replace(/^#/, "")) : ref;
    if (typeof n !== "number" || !Number.isInteger(n)) {
      offer("همه‌ی برنامه‌هایم را نشانم بده");
      return { error: "نفهمیدم کدام برنامه را می‌گویی. اسمش را دقیق بنویس." };
    }
    let id: string | null | undefined = refToId.get(n);
    if (!id) {
      offer("همه‌ی برنامه‌هایم را نشانم بده");
      return { error: "برنامه‌ای که گفتی در فهرستِ برنامه‌هایت نیست." };
    }
    for (let guard = 0; guard < 50 && id && successor.has(id); guard++) id = successor.get(id)!;
    if (!id) return { error: "آن برنامه در همین پیام حذف شده بود." };
    const found = list.find((o) => o.id === id);
    if (!found) return { error: "آن برنامه در همین پیام حذف شده بود." };
    return found;
  }

  /** کلیدهای «این وقوع حذف شده» را برای یک شناسه پاک می‌کند */
  function clearRemovedFor(id: string) {
    removed = removed.filter((k) => !k.startsWith(id + "|"));
  }

  function replaceRow(id: string, rows: CustomOccurrence[]) {
    list = list.filter((o) => o.id !== id);
    list.push(...rows);
    if (!rows.some((r) => r.id === id)) clearRemovedFor(id);
  }

  /**
   * برنامه را از `fromIso` به بعد می‌بندد. روزهای قبل از آن دست‌نخورده
   * می‌مانند؛ اگر برنامه اصلا قبل از `fromIso` شروع نشده بود، کامل می‌رود.
   */
  function closeFrom(target: CustomOccurrence, fromIso: string): CustomOccurrence[] {
    if (!target.startDate || target.startDate < fromIso) {
      const cutoff = dayBeforeIso(fromIso);
      return [{ ...target, endDate: target.endDate && target.endDate < cutoff ? target.endDate : cutoff }];
    }
    return [];
  }

  /**
   * فقط روزِ `iso` را از یک برنامه برمی‌دارد: تکه‌ی قبل (همان شناسه) و
   * تکه‌ی بعد (شناسه‌ی نو). برنامه‌ی تک‌روزه کامل می‌رود.
   */
  function carveOut(target: CustomOccurrence, iso: string): CustomOccurrence[] {
    const rows: CustomOccurrence[] = [];
    if (!target.startDate || target.startDate < iso) rows.push({ ...target, endDate: dayBeforeIso(iso) });
    if (!target.endDate || target.endDate > iso) {
      const after = { ...target, startDate: addDaysIso(iso, 1) };
      // تکه‌ی قبلی اگر وجود داشت شناسه را نگه داشته؛ این یکی باید نو باشد
      rows.push(rows.length ? { ...after, id: newOccId() } : after);
    }
    return rows;
  }

  function parseTimeSpec(raw: RawOp, name: string): TimeSpec | { error: string } {
    if (isBlank(raw.start) && isBlank(raw.end)) return { kind: "keep" };
    if (isBlank(raw.start)) return { error: `ساعتِ شروعِ «${name}» را نفهمیدم.` };
    const start = parseClock(raw.start);
    if (!start) return { error: `ساعتِ شروعِ «${name}» را نفهمیدم. مثلا «۸:۳۰» بنویس.` };
    const end = isBlank(raw.end) ? null : parseClock(raw.end);
    if (!isBlank(raw.end) && !end) return { error: `ساعتِ پایانِ «${name}» را نفهمیدم.` };
    if (end && end.min <= start.min) return { error: `ساعتِ پایانِ «${name}» باید بعد از ساعتِ شروع باشد.` };
    return { kind: "set", start, end };
  }

  /** دوره‌ی add/update: from (پیش‌فرض امروز) و until یا weeks/months */
  function parsePeriod(raw: RawOp, name: string, defaults: Period): Period | { error: string } {
    let from = defaults.from;
    if (!isBlank(raw.from)) {
      const f = parseDateInput(raw.from, todayIso);
      if (!f) return { error: `تاریخِ شروعِ «${name}» را نفهمیدم.` };
      from = f;
    }
    let to = defaults.to;
    if (raw.until === null) to = undefined;
    else if (!isBlank(raw.until)) {
      const u = parseDateInput(raw.until, todayIso);
      if (!u) return { error: `تاریخِ پایانِ «${name}» را نفهمیدم.` };
      to = u;
    } else if (!isBlank(raw.weeks) || !isBlank(raw.months)) {
      const base = from ?? todayIso;
      const weeks = Number(raw.weeks), months = Number(raw.months);
      if (!isBlank(raw.weeks) && Number.isInteger(weeks) && weeks >= 1 && weeks <= 104) {
        to = addDaysIso(base, weeks * 7 - 1);
      } else if (!isBlank(raw.months) && Number.isInteger(months) && months >= 1 && months <= 24) {
        const d = new Date(base + "T00:00:00");
        d.setMonth(d.getMonth() + months);
        to = addDaysIso(isoLocal(d), -1);
      } else {
        return { error: `طولِ دوره‌ی «${name}» را نفهمیدم.` };
      }
    }
    if (from && to && to < from) return { error: `تاریخِ پایانِ «${name}» قبل از شروعش است.` };
    return { from, to };
  }

  function conflictProblem(
    name: string, jsDay: number, period: Period,
    start: { fa: string; min: number }, end: { fa: string; min: number } | null,
    conflict: CustomOccurrence, excludeId?: string, singleDay = false
  ) {
    const dayFa = DAY_NAME_FA[jsDay];
    const slot = suggestFreeSlot(list, jsDay, start.min, end?.min ?? null, excludeId, period);
    problems.push(
      slot
        ? `${dayFa} ساعتِ ${timeLabel(start.fa, end?.fa)} با «${conflict.name}» پر است. نزدیک‌ترین وقتِ آزاد ${timeLabel(slot.startFa, slot.endFa)} است.`
        : `${dayFa} ساعتِ ${timeLabel(start.fa, end?.fa)} با «${conflict.name}» پر است و تا آخرِ آن روز هم جای خالیِ هم‌اندازه نمانده.`
    );
    if (slot) offer(`«${name}» را ${singleDay ? "همان روز" : dayFa} ساعتِ ${slot.startFa} بگذار`);
    offer(`«${name}» را یک روزِ دیگر بگذار`, `«${conflict.name}» را جابه‌جا کن`);
  }

  for (const raw of ops.slice(0, MAX_OPS_PER_MESSAGE)) {
    if (!raw || typeof raw !== "object") { problems.push("یکی از کارهایی که خواستی را بلد نیستم انجام بدهم."); continue; }
    const op = typeof raw.op === "string" ? raw.op : "";

    // ---------- افزودن ----------
    if (op === "add") {
      const name = typeof raw.name === "string" ? raw.name.trim().slice(0, 60) : "";
      if (!name) { problems.push("برای برنامه‌ی جدید اسمی نگفتی."); continue; }

      // تاریخ‌های مشخص (تک‌روزه) بر روزهای هفته مقدم‌اند: «فقط همین پنجشنبه»
      // نباید هر پنجشنبه تکرار شود.
      const rawDates = Array.isArray(raw.dates) ? raw.dates : isBlank(raw.date) ? [] : [raw.date];
      const dates: string[] = [];
      let badDate = false;
      for (const d of rawDates) {
        const iso = parseDateInput(d, todayIso);
        if (!iso) { badDate = true; continue; }
        if (!dates.includes(iso)) dates.push(iso);
      }
      if (badDate && !dates.length) { problems.push(`تاریخِ «${name}» را نفهمیدم.`); continue; }
      if (badDate) problems.push(`یکی از تاریخ‌های «${name}» را نفهمیدم و از آن گذشتم.`);

      type Target = { jsDay: number; period: Period };
      let targets: Target[];
      if (dates.length) {
        targets = dates.slice(0, 31).map((iso) => ({ jsDay: jsDayOfIso(iso), period: { from: iso, to: iso } }));
      } else {
        const days = parseDays(raw.days);
        if (!days.length) {
          problems.push(`برای «${name}» روزی مشخص نکردی — کدام روزِ هفته؟`);
          offer(`«${name}» را برای امروز بگذار`, `«${name}» را برای فردا بگذار`, `«${name}» را هر روز بگذار`);
          continue;
        }
        const period = parsePeriod(raw, name, { from: todayIso });
        if ("error" in period) { problems.push(period.error); continue; }
        targets = days.map((jsDay) => ({ jsDay, period }));
      }

      // ساعت *اختیاری* است. نبودش یعنی برنامه‌ی بی‌ساعت، نه ساعتِ حدسی.
      const hasStart = !isBlank(raw.start);
      const start = hasStart ? parseClock(raw.start) : null;
      if (hasStart && !start) { problems.push(`ساعتِ شروعِ «${name}» را نفهمیدم. مثلا «۸:۳۰» بنویس.`); continue; }
      const end = isBlank(raw.end) ? null : parseClock(raw.end);
      if (!isBlank(raw.end) && !end) { problems.push(`ساعتِ پایانِ «${name}» را نفهمیدم.`); continue; }
      if (start && end && end.min <= start.min) {
        problems.push(`ساعتِ پایانِ «${name}» باید بعد از ساعتِ شروع باشد.`);
        continue;
      }

      const importance = parseImportance(raw.importance) ?? "medium";
      const tag = typeof raw.tag === "string" && raw.tag.trim() ? raw.tag.trim().slice(0, 30) : null;
      const base = (t: Target): Omit<CustomOccurrence, "id" | "time"> => ({
        name, jsDay: t.jsDay,
        startDate: t.period.from ?? todayIso,
        ...(t.period.to ? { endDate: t.period.to } : {}),
        importance, ...(tag ? { tag } : {}),
        ...(raw.notify === false ? { notify: false } : {}),
      });
      const where = (t: Target) => `${DAY_NAME_FA[t.jsDay]}${periodLabel(t.period, todayIso) ? " " + periodLabel(t.period, todayIso) : ""}`;

      // ── تکرارِ درون‌روزی («هر یک ساعت یک‌بار به مدتِ ۵ دقیقه») ──────────
      if (!isBlank(raw.repeatEveryMin)) {
        const everyRaw = Number(toEnDigits(String(raw.repeatEveryMin)));
        if (!Number.isFinite(everyRaw) || !Number.isInteger(everyRaw) || everyRaw < MIN_REPEAT_EVERY_MIN || everyRaw > MAX_REPEAT_EVERY_MIN) {
          problems.push(`بازه‌ی تکرارِ «${name}» را نفهمیدم — بین ${MIN_REPEAT_EVERY_MIN} تا ${MAX_REPEAT_EVERY_MIN} دقیقه بنویس.`);
          continue;
        }
        const hasRepeatUntil = !isBlank(raw.repeatUntil);
        const repeatUntilParsed = hasRepeatUntil ? parseClock(raw.repeatUntil) : null;
        if (hasRepeatUntil && !repeatUntilParsed) {
          problems.push(`ساعتِ پایانِ تکرارِ «${name}» را نفهمیدم.`);
          continue;
        }
        const anchor = start ?? { fa: minutesToFa(awake.startMin), min: awake.startMin };
        const duration = end ? end.min - anchor.min : DEFAULT_REPEAT_DURATION_MIN;
        if (duration <= 0) {
          problems.push(`ساعتِ پایانِ «${name}» باید بعد از ساعتِ شروع باشد.`);
          continue;
        }
        const repeatUntilMin = repeatUntilParsed ? repeatUntilParsed.min : awake.endMin;

        for (const t of targets) {
          let created = 0, skipped = 0, iterations = 0, capped = false;
          for (let m = anchor.min; m <= repeatUntilMin && iterations < MAX_REPEATS_PER_OP; m += everyRaw, iterations++) {
            if (list.length >= MAX_OCCURRENCES) {
              problems.push(`به سقفِ ${MAX_OCCURRENCES} برنامه رسیدی — اول چند تا را پاک کن.`);
              capped = true;
              break;
            }
            const slotEnd = m + duration;
            if (findConflict(list, t.jsDay, m, slotEnd, undefined, t.period)) { skipped++; continue; }
            list.push({ ...base(t), id: newOccId(), time: timeLabel(minutesToFa(m), minutesToFa(slotEnd)) });
            created++;
          }
          if (created > 0) {
            const everyLabel = everyRaw % 60 === 0
              ? `${toFaDigits(String(everyRaw / 60))} ساعت`
              : `${toFaDigits(String(everyRaw))} دقیقه`;
            let msg = `«${name}» ${where(t)} هر ${everyLabel} یک‌بار (${toFaDigits(String(duration))} دقیقه‌ای) از ${minutesToFa(anchor.min)} تا ${minutesToFa(repeatUntilMin)} — ${toFaDigits(String(created))} بار اضافه شد.`;
            if (skipped > 0) msg += ` (${toFaDigits(String(skipped))} بار به‌خاطرِ تداخل با برنامه‌های دیگر رد شد)`;
            applied.push(msg);
          } else if (!capped) {
            problems.push(`«${name}» ${where(t)} هیچ‌کدام از بازه‌های تکرار آزاد نبود — همه با برنامه‌ی دیگری تداخل داشتند.`);
          }
          if (capped) break;
        }
        continue;
      }

      for (const t of targets) {
        if (list.length >= MAX_OCCURRENCES) {
          problems.push(`به سقفِ ${MAX_OCCURRENCES} برنامه رسیدی — اول چند تا را پاک کن.`);
          break;
        }
        if (!start) {
          list.push({ ...base(t), id: newOccId(), time: "" });
          applied.push(`«${name}» ${where(t)} بدونِ ساعت اضافه شد.`);
          offer(`برای «${name}» ساعت هم بگذار`);
          continue;
        }
        const conflict = findConflict(list, t.jsDay, start.min, end?.min ?? null, undefined, t.period);
        if (conflict) {
          conflictProblem(name, t.jsDay, t.period, start, end, conflict, undefined, !!dates.length);
          continue;
        }
        list.push({ ...base(t), id: newOccId(), time: timeLabel(start.fa, end?.fa) });
        applied.push(`«${name}» ${where(t)} ساعتِ ${timeLabel(start.fa, end?.fa)} اضافه شد.`);
      }
      continue;
    }

    // ---------- تغییرِ ساعت / جابه‌جایی ----------
    if (op === "retime" || op === "move") {
      const target = resolve(raw.ref);
      if ("error" in target) { problems.push(target.error); continue; }

      // retime بدونِ هیچ ساعتی یعنی «ساعتش را بردار»؛ move بدونِ ساعت یعنی «همان ساعت»
      let spec = parseTimeSpec(raw, target.name);
      if ("error" in spec) { problems.push(spec.error); continue; }
      if (op === "retime" && spec.kind === "keep") spec = { kind: "clear" };
      if (spec.kind === "clear" && !target.time) { problems.push(`«${target.name}» از قبل بی‌ساعت است.`); continue; }

      // ── فقط یک روز («فقط همین شنبه») ──
      const singleIso = isBlank(raw.date) ? null : parseDateInput(raw.date, todayIso);
      if (!isBlank(raw.date) && !singleIso) { problems.push(`تاریخِ «${target.name}» را نفهمیدم.`); continue; }
      if (singleIso && !occursOn(target, singleIso)) {
        problems.push(`«${target.name}» در ${faDateLabel(singleIso)} (${DAY_NAME_FA[jsDayOfIso(singleIso)]}) برنامه‌ای ندارد.`);
        continue;
      }

      let newJsDay = target.jsDay;
      let destIso: string | null = singleIso;
      if (op === "move") {
        const toDateIso = isBlank(raw.toDate) ? null : parseDateInput(raw.toDate, todayIso);
        if (!isBlank(raw.toDate) && !toDateIso) { problems.push(`نفهمیدم «${target.name}» را به کدام تاریخ ببرم.`); continue; }
        const toDay = parseDay(raw.toDay);
        if (toDateIso) {
          // مقصدِ تاریخ‌دار همیشه یعنی «فقط همان روز»
          if (!singleIso && !(target.startDate && target.startDate === target.endDate)) {
            // جابه‌جاییِ کلِ تکرارها به یک تاریخِ مشخص معنی ندارد — روزِ هفته‌اش را می‌گیریم
            newJsDay = jsDayOfIso(toDateIso);
          } else {
            destIso = toDateIso;
            newJsDay = jsDayOfIso(toDateIso);
          }
        } else if (toDay !== null) {
          newJsDay = toDay;
          if (singleIso) destIso = sameWeekIso(singleIso, toDay);
        } else {
          problems.push(`نفهمیدم «${target.name}» را به کدام روز ببرم.`);
          continue;
        }
        if (newJsDay === target.jsDay && spec.kind === "keep" && (!destIso || destIso === singleIso)) {
          problems.push(`«${target.name}» همین حالا هم ${DAY_NAME_FA[newJsDay]} است.`);
          continue;
        }
      }

      // برنامه‌ی تک‌روزه همیشه «فقط همان روز» جابه‌جا می‌شود
      const isOneOff = !!target.startDate && target.startDate === target.endDate;
      const sourceIso = singleIso ?? (isOneOff ? target.startDate! : null);
      if (sourceIso && !destIso) destIso = newJsDay === target.jsDay ? sourceIso : sameWeekIso(sourceIso, newJsDay);

      const newTime =
        spec.kind === "clear" ? "" : spec.kind === "set" ? timeLabel(spec.start.fa, spec.end?.fa) : target.time;
      const newStart = spec.kind === "set" ? spec.start : null;
      const newEnd = spec.kind === "set" ? spec.end : null;
      const curStart = occStart(target);
      const checkStart = newStart ?? (spec.kind === "keep" && curStart !== null ? { fa: "", min: curStart } : null);
      const checkEnd = newStart ? newEnd : spec.kind === "keep" ? (occEnd(target) === null ? null : { fa: "", min: occEnd(target)! }) : null;

      if (sourceIso && destIso) {
        const period = { from: destIso, to: destIso };
        if (checkStart) {
          const conflict = findConflict(list, newJsDay, checkStart.min, checkEnd?.min ?? null, target.id, period);
          if (conflict) {
            const s = { fa: minutesToFa(checkStart.min), min: checkStart.min };
            const e = checkEnd ? { fa: minutesToFa(checkEnd.min), min: checkEnd.min } : null;
            conflictProblem(target.name, newJsDay, period, s, e, conflict, target.id, true);
            continue;
          }
        }
        const moved: CustomOccurrence = { ...target, id: newOccId(), jsDay: newJsDay, time: newTime, startDate: destIso, endDate: destIso };
        replaceRow(target.id, [...carveOut(target, sourceIso), moved]);
        if (!list.some((o) => o.id === target.id)) successor.set(target.id, moved.id);
        const dayPart = destIso !== sourceIso
          ? `از ${DAY_NAME_FA[target.jsDay]} ${faDateLabel(sourceIso)} به ${DAY_NAME_FA[newJsDay]} ${faDateLabel(destIso)} منتقل شد`
          : `در ${DAY_NAME_FA[newJsDay]} ${faDateLabel(destIso)}`;
        const timePart = spec.kind === "set" ? ` ساعتِ ${newTime}` : spec.kind === "clear" ? " بدونِ ساعت" : "";
        applied.push(destIso !== sourceIso
          ? `«${target.name}» فقط برای همان یک روز ${dayPart}${timePart}.`
          : `«${target.name}» فقط ${dayPart}${spec.kind === "clear" ? " ساعتش برداشته شد" : ` ساعتِ ${newTime} شد`}.`);
        continue;
      }

      // ── کلِ تکرارها، از امروز به بعد ──
      const effectiveFrom = target.startDate && target.startDate > todayIso ? target.startDate : todayIso;
      if (target.endDate && target.endDate < effectiveFrom) { problems.push(`«${target.name}» تمام شده است.`); continue; }
      const period: Period = { from: effectiveFrom, to: target.endDate };
      if (checkStart) {
        const conflict = findConflict(list, newJsDay, checkStart.min, checkEnd?.min ?? null, target.id, period);
        if (conflict) {
          const s = { fa: minutesToFa(checkStart.min), min: checkStart.min };
          const e = checkEnd ? { fa: minutesToFa(checkEnd.min), min: checkEnd.min } : null;
          conflictProblem(target.name, newJsDay, period, s, e, conflict, target.id);
          continue;
        }
      }
      const next: CustomOccurrence = {
        ...target, id: newOccId(), jsDay: newJsDay, time: newTime, startDate: effectiveFrom,
        ...(target.endDate ? { endDate: target.endDate } : {}),
      };
      replaceRow(target.id, [...closeFrom(target, effectiveFrom), next]);
      successor.set(target.id, next.id);
      if (op === "retime") {
        applied.push(spec.kind === "clear"
          ? `ساعتِ «${target.name}» (${target.time}) برداشته شد.`
          : `ساعتِ «${target.name}» از ${target.time || "بی‌ساعت"} به ${newTime} تغییر کرد.`);
      } else {
        applied.push(`«${target.name}» از ${DAY_NAME_FA[target.jsDay]} به ${DAY_NAME_FA[newJsDay]}${newTime ? ` ساعتِ ${newTime}` : ""} منتقل شد${newTime ? "" : " (همچنان بدونِ ساعت)"}.`);
      }
      continue;
    }

    // ---------- ویرایشِ مشخصات (اسم، اهمیت، تگ، اعلان، دوره) ----------
    if (op === "update") {
      const target = resolve(raw.ref);
      if ("error" in target) { problems.push(target.error); continue; }
      const patch: Partial<CustomOccurrence> = {};
      const notes: string[] = [];
      if (typeof raw.name === "string" && raw.name.trim() && raw.name.trim() !== target.name) {
        patch.name = raw.name.trim().slice(0, 60);
        notes.push(`اسم «${patch.name}» شد`);
      }
      const imp = parseImportance(raw.importance);
      if (imp && imp !== target.importance) { patch.importance = imp; notes.push("اهمیتش عوض شد"); }
      if (raw.tag === null || raw.tag === "") {
        if (target.tag) { patch.tag = undefined; notes.push("تگش برداشته شد"); }
      } else if (typeof raw.tag === "string" && raw.tag.trim() !== (target.tag ?? "")) {
        patch.tag = raw.tag.trim().slice(0, 30);
        notes.push(`تگ «${patch.tag}» گرفت`);
      }
      if (typeof raw.notify === "boolean" && raw.notify !== (target.notify !== false)) {
        patch.notify = raw.notify ? undefined : false;
        notes.push(raw.notify ? "اعلانش روشن شد" : "اعلانش خاموش شد");
      }
      const touchesPeriod = !isBlank(raw.from) || raw.until !== undefined || !isBlank(raw.weeks) || !isBlank(raw.months);
      if (touchesPeriod) {
        const period = parsePeriod(raw, target.name, { from: target.startDate, to: target.endDate });
        if ("error" in period) { problems.push(period.error); continue; }
        const s = occStart(target);
        if (s !== null) {
          const conflict = findConflict(list, target.jsDay, s, occEnd(target), target.id, period);
          if (conflict) { problems.push(`با این دوره، «${target.name}» با «${conflict.name}» تداخل پیدا می‌کند.`); continue; }
        }
        patch.startDate = period.from;
        patch.endDate = period.to;
        notes.push(period.to ? `دوره‌اش ${periodLabel(period, todayIso) || `تا ${faDateLabel(period.to)}`} شد` : "دیگر تاریخِ پایان ندارد");
      }
      if (!notes.length) { problems.push(`برای «${target.name}» تغییری نگفتی.`); continue; }
      const updated: CustomOccurrence = { ...target, ...patch };
      (Object.keys(updated) as (keyof CustomOccurrence)[]).forEach((k) => { if (updated[k] === undefined) delete updated[k]; });
      list = list.map((o) => (o.id === target.id ? updated : o));
      applied.push(`«${target.name}»: ${notes.join("، ")}.`);
      continue;
    }

    // ---------- حذف ----------
    if (op === "delete") {
      const target = resolve(raw.ref);
      if ("error" in target) { problems.push(target.error); continue; }
      const whenLabel = target.time ? `${DAY_NAME_FA[target.jsDay]} ${target.time}` : DAY_NAME_FA[target.jsDay];

      if (!isBlank(raw.date)) {
        const iso = parseDateInput(raw.date, todayIso);
        if (!iso) { problems.push(`تاریخِ «${target.name}» را نفهمیدم.`); continue; }
        if (!occursOn(target, iso)) { problems.push(`«${target.name}» در ${faDateLabel(iso)} برنامه‌ای ندارد.`); continue; }
        replaceRow(target.id, carveOut(target, iso));
        if (!list.some((o) => o.id === target.id)) successor.set(target.id, null);
        applied.push(`«${target.name}» فقط برای ${DAY_NAME_FA[target.jsDay]} ${faDateLabel(iso)} حذف شد.`);
        continue;
      }

      let fromIso = todayIso;
      if (!isBlank(raw.from)) {
        const f = parseDateInput(raw.from, todayIso);
        if (!f) { problems.push(`تاریخِ «${target.name}» را نفهمیدم.`); continue; }
        fromIso = f;
      }
      replaceRow(target.id, closeFrom(target, fromIso));
      successor.set(target.id, null);
      applied.push(fromIso > todayIso
        ? `«${target.name}» (${whenLabel}) از ${faDateLabel(fromIso)} به بعد حذف شد.`
        : `«${target.name}» (${whenLabel}) حذف شد.`);
      continue;
    }

    problems.push("یکی از کارهایی که خواستی را بلد نیستم انجام بدهم.");
  }

  if (ops.length > MAX_OPS_PER_MESSAGE) {
    problems.push(`در هر پیام حداکثر ${MAX_OPS_PER_MESSAGE} تغییر انجام می‌دهم — بقیه را در پیامِ بعدی بگو.`);
  }

  return { occurrences: list, removed, applied, problems, options, changed: applied.length > 0 };
}

/** مرتب‌سازیِ نمایشی: روزِ هفته به ترتیبِ شنبه..جمعه، بعد ساعت */
export function sortOccurrences(list: CustomOccurrence[]): CustomOccurrence[] {
  const dayRank = new Map(WEEK_ORDER.map((d, i) => [d.jsDay, i]));
  return [...list].sort((a, b) => {
    const da = dayRank.get(a.jsDay) ?? 99;
    const db = dayRank.get(b.jsDay) ?? 99;
    if (da !== db) return da - db;
    return (occStart(a) ?? 0) - (occStart(b) ?? 0);
  });
}
