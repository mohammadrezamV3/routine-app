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
import { timeStartMinutes, toEnDigits, WEEK_ORDER } from "./schedule";
import { normalizeTimeToFa } from "./timeUtils";
import { rangesOverlap } from "./conflict";

/** سقفِ تعدادِ برنامه‌ی یک کاربر — جلوی پرکردنِ UserSetting با یک درخواست را می‌گیرد */
export const MAX_OCCURRENCES = 200;
/** سقفِ عملیاتِ یک پیام — «همه‌ی برنامه‌هام رو پاک کن» نباید یک‌جا ۲۰۰ حذف بزند */
export const MAX_OPS_PER_MESSAGE = 12;
/** تعدادِ استفاده‌ی رایگان برای کاربرِ بدونِ اشتراک */
export const FREE_ASSISTANT_USES = 3;

/**
 * وقتی کاربر ساعت نمی‌گوید («مطالعه رو برای امروز اضافه کن») خودمان یک
 * بازه‌ی آزاد پیدا می‌کنیم. طولِ پیش‌فرض یک ساعت است و جست‌وجو داخلِ
 * ساعت‌های بیداریِ خودِ کاربر انجام می‌شود، نه کلِ شبانه‌روز — وگرنه ممکن
 * بود برنامه سرِ ۳ بامداد بنشیند.
 */
export const DEFAULT_DURATION_MIN = 60;
export type AwakeWindow = { startMin: number; endMin: number };
export const DEFAULT_AWAKE: AwakeWindow = { startMin: 8 * 60, endMin: 22 * 60 };

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
  days?: unknown;     // برای add — آرایه‌ی jsDay
  toDay?: unknown;    // برای move
  start?: unknown;
  end?: unknown;
  importance?: unknown;
  tag?: unknown;
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
 * ممکن است چند عملیات پشت‌سرهم رویش اجرا شود. سنجشِ مستقیم هم دقیق‌تر است
 * هم به تاریخِ امروز گره نمی‌خورد.
 */
export function findConflict(
  list: CustomOccurrence[],
  jsDay: number,
  startMin: number,
  endMin: number | null,
  excludeId?: string
): CustomOccurrence | null {
  for (const o of list) {
    if (o.jsDay !== jsDay) continue;
    if (excludeId && o.id === excludeId) continue;
    const s = occStart(o);
    if (s === null) continue;
    if (rangesOverlap(startMin, endMin, s, occEnd(o))) return o;
  }
  return null;
}

/**
 * اولین بازه‌ی آزادِ `durationMin`دقیقه‌ای از `fromMin` به بعد، حداکثر تا
 * `untilMin`. پایه‌ی هر دو کاربرد است: پیشنهادِ جایگزین وقتی ساعتِ خواسته‌شده
 * پر است، و جای‌گذاریِ خودکار وقتی کاربر اصلا ساعتی نگفته.
 */
export function findFreeSlot(
  list: CustomOccurrence[],
  jsDay: number,
  fromMin: number,
  durationMin: number,
  untilMin: number,
  excludeId?: string
): { startMin: number; endMin: number | null } | null {
  const STEP = 15;
  for (let s = fromMin; s + durationMin <= untilMin; s += STEP) {
    const e = durationMin === 0 ? null : s + durationMin;
    if (!findConflict(list, jsDay, s, e, excludeId)) return { startMin: s, endMin: e };
  }
  return null;
}

export function minutesToFa(min: number): string {
  return normalizeTimeToFa(`${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`);
}

/**
 * نزدیک‌ترین بازه‌ی آزادِ هم‌طولِ همان روز — پاسخِ سوالِ «اون ساعت پره، پس کِی؟».
 * از ساعتِ درخواستی به جلو می‌گردد و فقط تا پایانِ همان روز (۲۳:۵۹).
 * null یعنی آن روز واقعا جای خالیِ هم‌اندازه ندارد.
 */
export function suggestFreeSlot(
  list: CustomOccurrence[],
  jsDay: number,
  startMin: number,
  endMin: number | null,
  excludeId?: string
): { startFa: string; endFa: string | null } | null {
  const duration = endMin === null ? 0 : endMin - startMin;
  const slot = findFreeSlot(list, jsDay, startMin, duration, 24 * 60 - 1, excludeId);
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
 * بلند را مدل‌ها خوب کپی نمی‌کنند و یک کاراکترِ جابه‌جا یعنی «برنامه پیدا نشد».
 * یک عددِ کوچک هم کم‌خطاتر است هم توکنِ کمتری می‌گیرد. نگاشتِ عدد → شناسه
 * فقط سمتِ سرور انجام می‌شود، پس مدل هیچ‌وقت به شناسه‌ی واقعی دست نمی‌زند.
 */
export function describeSchedule(list: CustomOccurrence[]): string {
  if (!list.length) return "(برنامه‌ای ثبت نشده)";
  return list
    .map((o, i) => {
      const bits = [`#${i + 1}`, DAY_NAME_FA[o.jsDay] ?? "?", o.time, o.name];
      if (o.tag) bits.push(`تگ:${o.tag}`);
      if (o.importance) bits.push(`اهمیت:${o.importance}`);
      return bits.join(" | ");
    })
    .join("\n");
}

// ─────────────────────────────────────────────────────────────────────────
// اعمالِ نقشه
// ─────────────────────────────────────────────────────────────────────────

/**
 * `ops` را یکی‌یکی و به‌ترتیب روی فهرست اعمال می‌کند. هر عملیات روی نتیجه‌ی
 * عملیاتِ قبلی سوار می‌شود (پس «ساعت X رو ببر ۱۰، بعد یه برنامه بذار ۹»
 * درست کار می‌کند)، و هر شکستْ فقط همان عملیات را رد می‌کند نه کلِ پیام را.
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
  // اگر بعد از یک حذف دوباره ایندکس‌گذاری می‌کردیم، `ref` های بعدیِ همان
  // پیام به برنامه‌ی اشتباهی اشاره می‌کردند — همان کلاسیکِ «حذف در حالِ پیمایش».
  const refToId = new Map<number, string>();
  input.forEach((o, i) => refToId.set(i + 1, o.id));

  function resolve(ref: unknown): CustomOccurrence | { error: string } {
    if (typeof ref !== "number" || !Number.isInteger(ref)) {
      offer("همه‌ی برنامه‌هایم را نشانم بده");
      return { error: "نفهمیدم کدام برنامه را می‌گویی. اسمش را دقیق بنویس." };
    }
    const id = refToId.get(ref);
    if (!id) {
      offer("همه‌ی برنامه‌هایم را نشانم بده");
      return { error: "برنامه‌ای که گفتی در فهرستِ برنامه‌هایت نیست." };
    }
    const found = list.find((o) => o.id === id);
    if (!found) return { error: "آن برنامه در همین پیام حذف شده بود." };
    return found;
  }

  /** کلیدهای «این وقوع حذف شده» را برای یک شناسه پاک می‌کند */
  function clearRemovedFor(id: string) {
    removed = removed.filter((k) => !k.startsWith(id + "|"));
  }

  for (const raw of ops.slice(0, MAX_OPS_PER_MESSAGE)) {
    const op = typeof raw.op === "string" ? raw.op : "";

    // ---------- افزودن ----------
    if (op === "add") {
      const name = typeof raw.name === "string" ? raw.name.trim().slice(0, 60) : "";
      if (!name) { problems.push("برای برنامه‌ی جدید اسمی نگفتی."); continue; }

      const days = Array.isArray(raw.days) ? raw.days.filter(isJsDay) : [];
      if (!days.length) {
        problems.push(`برای «${name}» روزی مشخص نکردی — کدام روزِ هفته؟`);
        offer(`«${name}» را برای امروز بگذار`, `«${name}» را برای فردا بگذار`, `«${name}» را هر روز بگذار`);
        continue;
      }

      // ساعت *اختیاری* است. «مطالعه رو برای امروز اضافه کن» باید کار کند —
      // نبودِ ساعت دلیلِ رد کردن نیست، دلیلِ انتخاب‌کردن است. فقط اگر کاربر
      // چیزی نوشته باشد که ساعت نیست، خطا می‌دهیم؛ نبودِ کامل یعنی «خودت بگذار».
      const hasStart = raw.start !== undefined && raw.start !== null && raw.start !== "";
      const start = hasStart ? parseClock(raw.start) : null;
      if (hasStart && !start) { problems.push(`ساعتِ شروعِ «${name}» را نفهمیدم. مثلا «۸:۳۰» بنویس.`); continue; }
      const end = raw.end === undefined || raw.end === null || raw.end === "" ? null : parseClock(raw.end);
      if (raw.end && !end) { problems.push(`ساعتِ پایانِ «${name}» را نفهمیدم.`); continue; }
      if (start && end && end.min <= start.min) {
        problems.push(`ساعتِ پایانِ «${name}» باید بعد از ساعتِ شروع باشد.`);
        continue;
      }
      const autoDuration = start && end ? end.min - start.min : DEFAULT_DURATION_MIN;

      const importance = parseImportance(raw.importance) ?? "medium";
      const tag = typeof raw.tag === "string" && raw.tag.trim() ? raw.tag.trim().slice(0, 30) : null;

      for (const jsDay of days) {
        if (list.length >= MAX_OCCURRENCES) {
          problems.push(`به سقفِ ${MAX_OCCURRENCES} برنامه رسیدی — اول چند تا را پاک کن.`);
          break;
        }
        const dayFa = DAY_NAME_FA[jsDay];

        // ── کاربر ساعت نگفته: خودمان اولین بازه‌ی آزادِ داخلِ ساعت‌های
        //    بیداری را برمی‌داریم و صریح می‌گوییم کجا گذاشتیم.
        if (!start) {
          const slot = findFreeSlot(list, jsDay, awake.startMin, autoDuration, awake.endMin);
          if (!slot) {
            problems.push(`${dayFa} بینِ ${minutesToFa(awake.startMin)} تا ${minutesToFa(awake.endMin)} جای خالی نمانده.`);
            offer(`«${name}» را یک روزِ دیگر بگذار`, "برنامه‌های آن روز را نشانم بده");
            continue;
          }
          const sFa = minutesToFa(slot.startMin);
          const eFa = slot.endMin === null ? null : minutesToFa(slot.endMin);
          list.push({
            id: newOccId(), name, jsDay, time: timeLabel(sFa, eFa),
            startDate: todayIso, importance, ...(tag ? { tag } : {}),
          });
          applied.push(`«${name}» ${dayFa} ساعتِ ${timeLabel(sFa, eFa)} اضافه شد (ساعتش را خودم انتخاب کردم).`);
          // فقط گزینه‌ی *اصلاح* — یک دکمه‌ی «همین خوبه» یک فراخوانیِ AI و
          // یک واحد از سهمیه‌ی کاربر را خرجِ کاری می‌کرد که خودبه‌خود انجام شده.
          offer("ساعتش را عوض کن");
          continue;
        }

        const conflict = findConflict(list, jsDay, start.min, end?.min ?? null);
        if (conflict) {
          const slot = suggestFreeSlot(list, jsDay, start.min, end?.min ?? null);
          problems.push(
            slot
              ? `${dayFa} ساعتِ ${timeLabel(start.fa, end?.fa)} با «${conflict.name}» پر است. نزدیک‌ترین وقتِ آزاد ${timeLabel(slot.startFa, slot.endFa)} است.`
              : `${dayFa} ساعتِ ${timeLabel(start.fa, end?.fa)} با «${conflict.name}» پر است و تا آخرِ آن روز هم جای خالیِ هم‌اندازه نمانده.`
          );
          if (slot) offer(`«${name}» را ${dayFa} ساعتِ ${slot.startFa} بگذار`);
          offer(`«${name}» را یک روزِ دیگر بگذار`, `«${conflict.name}» را جابه‌جا کن`);
          continue;
        }
        list.push({
          id: newOccId(),
          name,
          jsDay,
          time: timeLabel(start.fa, end?.fa),
          startDate: todayIso,
          importance,
          ...(tag ? { tag } : {}),
        });
        applied.push(`«${name}» ${dayFa} ساعتِ ${timeLabel(start.fa, end?.fa)} اضافه شد.`);
      }
      continue;
    }

    // ---------- تغییرِ ساعت ----------
    if (op === "retime") {
      const target = resolve(raw.ref);
      if ("error" in target) { problems.push(target.error); continue; }

      const start = parseClock(raw.start);
      if (!start) { problems.push(`ساعتِ جدیدِ «${target.name}» را نفهمیدم.`); continue; }
      const end = raw.end === undefined || raw.end === null || raw.end === "" ? null : parseClock(raw.end);
      if (raw.end && !end) { problems.push(`ساعتِ پایانِ جدیدِ «${target.name}» را نفهمیدم.`); continue; }
      if (end && end.min <= start.min) {
        problems.push(`ساعتِ پایانِ «${target.name}» باید بعد از ساعتِ شروع باشد.`);
        continue;
      }

      const conflict = findConflict(list, target.jsDay, start.min, end?.min ?? null, target.id);
      if (conflict) {
        const slot = suggestFreeSlot(list, target.jsDay, start.min, end?.min ?? null, target.id);
        problems.push(
          slot
            ? `${DAY_NAME_FA[target.jsDay]} ساعتِ ${timeLabel(start.fa, end?.fa)} با «${conflict.name}» پر است. نزدیک‌ترین وقتِ آزاد ${timeLabel(slot.startFa, slot.endFa)} است.`
            : `${DAY_NAME_FA[target.jsDay]} ساعتِ ${timeLabel(start.fa, end?.fa)} با «${conflict.name}» پر است و جای خالیِ دیگری هم آن روز نمانده.`
        );
        if (slot) offer(`«${target.name}» را ساعتِ ${slot.startFa} بگذار`);
        offer(`«${target.name}» را به یک روزِ دیگر ببر`, `«${conflict.name}» را جابه‌جا کن`);
        continue;
      }

      const oldTime = target.time;
      // مثلِ EditOccurrenceForm: ردیفِ قبلی می‌رود و ردیفِ تازه با شناسه‌ی
      // نو می‌نشیند، تا تیکِ «انجام‌شده»ی روزهای قبل به وقتِ جدید نچسبد.
      list = list.filter((o) => o.id !== target.id);
      clearRemovedFor(target.id);
      list.push({ ...target, id: newOccId(), time: timeLabel(start.fa, end?.fa), startDate: todayIso });
      applied.push(`ساعتِ «${target.name}» از ${oldTime} به ${timeLabel(start.fa, end?.fa)} تغییر کرد.`);
      continue;
    }

    // ---------- جابه‌جایی به روزِ دیگر ----------
    if (op === "move") {
      const target = resolve(raw.ref);
      if ("error" in target) { problems.push(target.error); continue; }
      if (!isJsDay(raw.toDay)) { problems.push(`نفهمیدم «${target.name}» را به کدام روز ببرم.`); continue; }
      const toDay = raw.toDay;
      if (toDay === target.jsDay) {
        problems.push(`«${target.name}» همین حالا هم ${DAY_NAME_FA[toDay]} است.`);
        continue;
      }

      // ساعت می‌تواند همراهِ جابه‌جایی عوض شود؛ اگر نگفته باشد، همان ساعتِ فعلی
      const curStart = occStart(target);
      const curEnd = occEnd(target);
      const start = raw.start ? parseClock(raw.start) : (curStart === null ? null : { fa: target.time.split(/[–—-]/)[0].trim(), min: curStart });
      if (!start) { problems.push(`ساعتِ «${target.name}» قابلِ خواندن نبود.`); continue; }
      const end = raw.end
        ? parseClock(raw.end)
        : (raw.start || curEnd === null ? null : { fa: target.time.split(/[–—-]/)[1]?.trim() || "", min: curEnd });
      if (end && end.min <= start.min) {
        problems.push(`ساعتِ پایانِ «${target.name}» باید بعد از ساعتِ شروع باشد.`);
        continue;
      }

      const conflict = findConflict(list, toDay, start.min, end?.min ?? null, target.id);
      if (conflict) {
        const slot = suggestFreeSlot(list, toDay, start.min, end?.min ?? null, target.id);
        problems.push(
          slot
            ? `${DAY_NAME_FA[toDay]} ساعتِ ${timeLabel(start.fa, end?.fa)} با «${conflict.name}» پر است. نزدیک‌ترین وقتِ آزادِ آن روز ${timeLabel(slot.startFa, slot.endFa)} است.`
            : `${DAY_NAME_FA[toDay]} ساعتِ ${timeLabel(start.fa, end?.fa)} با «${conflict.name}» پر است و آن روز جای خالیِ هم‌اندازه ندارد.`
        );
        if (slot) offer(`«${target.name}» را ${DAY_NAME_FA[toDay]} ساعتِ ${slot.startFa} بگذار`);
        offer(`«${target.name}» را یک روزِ دیگر ببر`, `«${conflict.name}» را جابه‌جا کن`);
        continue;
      }

      list = list.filter((o) => o.id !== target.id);
      clearRemovedFor(target.id);
      list.push({ ...target, id: newOccId(), jsDay: toDay, time: timeLabel(start.fa, end?.fa), startDate: todayIso });
      applied.push(`«${target.name}» از ${DAY_NAME_FA[target.jsDay]} به ${DAY_NAME_FA[toDay]} ساعتِ ${timeLabel(start.fa, end?.fa)} منتقل شد.`);
      continue;
    }

    // ---------- حذف ----------
    if (op === "delete") {
      const target = resolve(raw.ref);
      if ("error" in target) { problems.push(target.error); continue; }
      list = list.filter((o) => o.id !== target.id);
      clearRemovedFor(target.id);
      applied.push(`«${target.name}» (${DAY_NAME_FA[target.jsDay]} ${target.time}) حذف شد.`);
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
