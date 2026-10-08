// هسته‌ی خالص «پیشرفت خودکار»ی برنامه‌ی منتور — بدون دیتابیس، تا هم سرور
// (lib/mentorProgress.ts) و هم تست‌ها و کلاینت از همین یک تعریف استفاده کنن.
//
// منبع حقیقت تیک‌های خود شاگرد در «روتین من»ـه (DailyEntry.completedItems،
// کلید = id occurrence). برنامه‌ی منتور (ROUTINE و WORKOUT) با idهای قطعی
// `mp-<programId>-<order>-<jsDay>` در روتین شاگرد آینه می‌شه؛ پس هر تیک مستقیم
// به یک آیتم برمی‌گرده. occurrenceهایی که شاگرد ویرایش/جابه‌جا کرده id تصادفی
// می‌گیرن ولی mentorProgramId (و از این به بعد mentorItemId) رو نگه می‌دارن.
//
// روزها رشته‌ی «YYYY-MM-DD» تقویم محلی شاگردن (همون کلید DailyEntry)؛ روز
// هفته با getUTCDay روی نیمه‌شب UTC همون تاریخ حساب می‌شه، پس DST و ساعت
// سرور هیچ اثری ندارن.

export type ProgressState = "done" | "partial" | "missed" | "upcoming" | "untracked";

export type DeriveItem = {
  id: string;
  order: number;
  title: string;
  days: number[];
  sets?: number | null;
  reps?: string | null;
};

export type MirrorOccurrenceLike = { id: string; name?: string; mentorProgramId?: string; mentorItemId?: string };

export type DerivedCell = { date: string; itemId: string; state: "done" | "missed" | "upcoming"; doneOn: string | null };

// ارقام در کل سایت انگلیسی‌اند
const fa = (s: string | number) => String(s);
// کلید مقایسه‌ی اسم: occurrenceهای قدیمی با ارقام فارسی ذخیره شده‌اند («اسکوات · ۴×۸»)
// و باید با اسم تازه‌ی لاتین («اسکوات · 4×8») جور دربیان.
const nameKey = (s: string) => s.trim().replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

// ───────────────────────── تاریخ ─────────────────────────

export function isoAddDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function jsDayOfIso(iso: string): number {
  return new Date(iso + "T00:00:00.000Z").getUTCDay();
}

/** شنبه‌ی هفته‌ی ایرانی حاوی iso */
export function weekStartIso(iso: string): string {
  return isoAddDays(iso, -((jsDayOfIso(iso) + 1) % 7));
}

export function isoRange(from: string, to: string, max = 400): string[] {
  const out: string[] = [];
  for (let d = from; d <= to && out.length < max; d = isoAddDays(d, 1)) out.push(d);
  return out;
}

const maxIso = (a: string, b: string) => (a > b ? a : b);
const minIso = (a: string, b: string) => (a < b ? a : b);

// ───────────────────────── آینه ─────────────────────────

export function mirrorOccurrenceId(programId: string, order: number, jsDay: number): string {
  return `mp-${programId}-${order}-${jsDay}`;
}

/** order و jsDay از id قطعی آینه؛ برای id برنامه‌ی دیگر یا id تصادفی null */
export function parseMirrorOccurrenceId(programId: string, occId: string): { order: number; jsDay: number } | null {
  const prefix = `mp-${programId}-`;
  if (!occId.startsWith(prefix)) return null;
  const m = /^(\d{1,4})-([0-6])$/.exec(occId.slice(prefix.length));
  return m ? { order: Number(m[1]), jsDay: Number(m[2]) } : null;
}

/** اسم occurrence آینه در روتین شاگرد — حرکت WORKOUT ست×تکرار رو هم کنارش داره */
export function mirrorOccurrenceName(item: Pick<DeriveItem, "title" | "sets" | "reps">, type: "ROUTINE" | "WORKOUT"): string {
  if (type !== "WORKOUT" || !item.sets) return item.title;
  return `${item.title} · ${fa(item.sets)}${item.reps ? `×${fa(item.reps)}` : " ست"}`;
}

/**
 * id occurrence → id آیتم. ترتیب تشخیص: id قطعی → mentorItemId روی
 * occurrence ویرایش‌شده → (occurrenceهای قدیمی بدون mentorItemId) اسم یکتا.
 */
export function buildOccurrenceItemMap(
  programId: string,
  type: "ROUTINE" | "WORKOUT",
  items: DeriveItem[],
  occurrences: MirrorOccurrenceLike[]
): (occId: string) => string | null {
  const byOrder = new Map(items.map((i) => [i.order, i.id]));
  const ids = new Set(items.map((i) => i.id));
  const byName = new Map<string, string | null>();
  for (const it of items) {
    for (const n of new Set([nameKey(it.title), nameKey(mirrorOccurrenceName(it, type))])) {
      // اسم تکراری بین دو آیتم مبهمه — هیچ‌کدوم رو اعتبار نمی‌ده
      byName.set(n, byName.has(n) && byName.get(n) !== it.id ? null : it.id);
    }
  }
  const extra = new Map<string, string>();
  for (const o of occurrences) {
    if (!o || o.mentorProgramId !== programId || typeof o.id !== "string") continue;
    if (parseMirrorOccurrenceId(programId, o.id)) continue;
    const viaId = o.mentorItemId && ids.has(o.mentorItemId) ? o.mentorItemId : null;
    const viaName = !viaId && typeof o.name === "string" ? byName.get(nameKey(o.name)) ?? null : null;
    const itemId = viaId ?? viaName;
    if (itemId) extra.set(o.id, itemId);
  }
  return (occId: string) => {
    const parsed = parseMirrorOccurrenceId(programId, occId);
    if (parsed) return byOrder.get(parsed.order) ?? null;
    return extra.get(occId) ?? null;
  };
}

// ───────────────────────── مشتق‌سازی ─────────────────────────

export type DeriveInput = {
  items: DeriveItem[];
  /** اولین و آخرین روز برنامه در این محاسبه (شامل) */
  from: string;
  to: string;
  /**
   * روز «باز»: قبل از آن هر روز قطعی است (انجام/انجام‌نشده)، خود آن روز فقط
   * «انجام» یا «پیش رو»، و بعد از آن همه «پیش رو». برای برنامه‌ی فعال امروز شاگرد.
   */
  openDay: string;
  /** date → completedItems DailyEntry */
  ticks: Map<string, Record<string, unknown>>;
  itemOf: (occId: string) => string | null;
};

/**
 * وضعیت هر آیتم در هر روز برنامه‌ریزی‌شده‌ی [from, to].
 *
 * هر تیک حداکثر یک بار حساب می‌شه: اول تیک همون روز، بعد تیک روز دیگری از
 * *همان هفته* (شاگرد آیتم رو در روتینش جابه‌جا کرده) به زودترین روز
 * انجام‌نشده‌ی همان آیتم در همان هفته نسبت داده می‌شه — با doneOn = روز تیک.
 */
export function deriveItemStates(input: DeriveInput): DerivedCell[] {
  const { items, from, to, openDay, ticks, itemOf } = input;
  if (to < from || items.length === 0) return [];
  const tickLast = minIso(to, openDay);

  // itemId → (روز → تعداد occurrenceهای تیک‌خورده‌ی این آیتم در آن روز)؛ فقط تیک true و تا روز باز
  const tickCounts = new Map<string, Map<string, number>>();
  ticks.forEach((rec, date) => {
    if (date < from || date > tickLast || !rec || typeof rec !== "object") return;
    for (const [occId, v] of Object.entries(rec)) {
      if (v !== true) continue;
      const itemId = itemOf(occId);
      if (!itemId) continue;
      if (!tickCounts.has(itemId)) tickCounts.set(itemId, new Map());
      const m = tickCounts.get(itemId)!;
      m.set(date, (m.get(date) ?? 0) + 1);
    }
  });

  const out: DerivedCell[] = [];
  const dates = isoRange(from, to);
  for (const it of items) {
    const daySet = new Set(it.days);
    const sched = dates.filter((d) => daySet.has(jsDayOfIso(d)));
    if (sched.length === 0) continue;
    const counts = tickCounts.get(it.id) ?? new Map<string, number>();

    // گروه‌بندی هفتگی
    const weeks = new Map<string, string[]>();
    for (const d of sched) {
      const w = weekStartIso(d);
      if (!weeks.has(w)) weeks.set(w, []);
      weeks.get(w)!.push(d);
    }
    const doneOn = new Map<string, string>();
    weeks.forEach((wDays, w) => {
      const wEnd = isoAddDays(w, 6);
      const left = new Map<string, number>();
      counts.forEach((n, d) => {
        if (d >= w && d <= wEnd) left.set(d, n);
      });
      for (const d of wDays) {
        const n = left.get(d) ?? 0;
        if (n > 0) {
          doneOn.set(d, d);
          left.set(d, n - 1);
        }
      }
      // تیک‌های باقی‌مانده (روز دیگر یا occurrence دوم در همان روز) به ترتیب زمان
      const leftovers: string[] = [];
      Array.from(left.keys())
        .sort()
        .forEach((d) => {
          for (let i = 0; i < (left.get(d) ?? 0); i++) leftovers.push(d);
        });
      for (const d of wDays) {
        if (doneOn.has(d) || leftovers.length === 0) continue;
        doneOn.set(d, leftovers.shift()!);
      }
    });

    for (const d of sched) {
      const on = doneOn.get(d);
      if (on) out.push({ date: d, itemId: it.id, state: "done", doneOn: on === d ? null : on });
      else if (d >= openDay) out.push({ date: d, itemId: it.id, state: "upcoming", doneOn: null });
      else out.push({ date: d, itemId: it.id, state: "missed", doneOn: null });
    }
  }
  return out.sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1));
}

/** بازه‌ی مؤثر برنامه برای یک شاگرد — همه به تقویم محلی خود او */
export function programWindow(p: {
  startIso: string | null;
  endIso: string | null;
  activationIso: string;
  closeIso: string | null;
  todayIso: string;
}): { from: string; to: string | null; openDay: string; lastFinal: string } {
  // آینه از روز فعال‌سازی نوشته می‌شه (روزهای قبلش در روتین شاگرد نبوده)
  const from = p.startIso ? maxIso(p.startIso, p.activationIso) : p.activationIso;
  const openDay = p.closeIso ? minIso(p.closeIso, p.todayIso) : p.todayIso;
  let to = p.endIso;
  if (p.closeIso) to = to ? minIso(to, p.closeIso) : p.closeIso;
  // آخرین روزی که وضعیتش (انجام/انجام‌نشده یا انجام امروز) نوشته می‌شه
  const lastFinal = to && to < openDay ? to : openDay;
  return { from, to, openDay, lastFinal };
}

/** خلاصه‌ی یک روز از وضعیت آیتم‌هایش — برای ستون روز در نمای هفته */
export function summarizeDay(states: ProgressState[]): ProgressState | null {
  const s = states.filter((x) => x !== "untracked");
  if (s.length === 0) return states.length ? "untracked" : null;
  const done = s.filter((x) => x === "done").length;
  const partial = s.filter((x) => x === "partial").length;
  const upcoming = s.filter((x) => x === "upcoming").length;
  if (done === s.length) return "done";
  if (done === 0 && partial === 0) return upcoming > 0 ? "upcoming" : "missed";
  return "partial";
}

export const LOG_STATUS_TO_STATE = { COMPLETED: "done", PARTIAL: "partial", MISSED: "missed" } as const;
