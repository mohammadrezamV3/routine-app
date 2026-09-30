// برنامه‌ی «لیستی» در «روتین من»: یک برنامه می‌تونه چند آیتمِ زیرمجموعه داشته
// باشه (مثلا «خرید»: نون، شیر، میوه). منطقِ خالص و تنها جای تصمیم برای همه‌ی
// جاهایی که تیک می‌زنن (/weekly، داشبورد، DayModal) — تعریفِ جدا نساز.
//
// ذخیره: هر آیتم کلیدِ خودش رو توی همون DailyRecord.tasks داره
// (`${occId}~${itemId}`) و کلیدِ خودِ برنامه (`occId`) همیشه = «همه‌ی آیتم‌ها
// تیک خوردن». یعنی درصد، استریک، اچیومنت‌ها، منتور و هرچیزی که فقط
// tasks[occId] رو می‌خونه بدونِ هیچ تغییری درست کار می‌کنه.

export type ChecklistItem = { id: string; name: string };
export type TaskMap = Record<string, boolean>;

export const ITEM_SEP = "~";
export const MAX_CHECKLIST_ITEMS = 30;

export function itemKey(occId: string, itemId: string): string {
  return `${occId}${ITEM_SEP}${itemId}`;
}

export function newItemId(): string {
  return "i" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** آیتم‌های معتبرِ یک برنامه (خالی/نامعتبر → []) */
export function checklistOf(occ: object | null | undefined): ChecklistItem[] {
  const raw = (occ as { items?: unknown } | null | undefined)?.items;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is ChecklistItem => !!x && typeof (x as ChecklistItem).id === "string" && typeof (x as ChecklistItem).name === "string" && !!(x as ChecklistItem).name.trim())
    .slice(0, MAX_CHECKLIST_ITEMS);
}

export function checklistProgress(tasks: TaskMap | undefined, occId: string, items: ChecklistItem[]): { done: number; total: number } {
  const t = tasks ?? {};
  return { done: items.filter((i) => t[itemKey(occId, i.id)]).length, total: items.length };
}

/** آیا کلِ برنامه انجام شده؟ (برای برنامه‌ی لیستی = همه‌ی آیتم‌ها) */
export function isOccDone(tasks: TaskMap | undefined, occId: string, items: ChecklistItem[]): boolean {
  const t = tasks ?? {};
  if (!items.length) return !!t[occId];
  return items.every((i) => t[itemKey(occId, i.id)]);
}

/**
 * تیکِ یک برنامه یا یکی از آیتم‌هاش — خروجی نقشه‌ی تازه‌ی tasks (immutable).
 *  • بدونِ itemId روی برنامه‌ی لیستی (زدنِ عنوان): اگه همه انجام شده بود همه
 *    برداشته می‌شن، وگرنه همه تیک می‌خورن.
 *  • با itemId: فقط همون آیتم عوض می‌شه و کلیدِ برنامه = «همه انجام شدن؟».
 *  • برنامه‌ی عادی (بدونِ آیتم): همون رفتارِ قبلی.
 */
export function toggleTask(tasks: TaskMap | undefined, occId: string, items: ChecklistItem[], itemId?: string): TaskMap {
  const next: TaskMap = { ...(tasks ?? {}) };
  if (!items.length) {
    next[occId] = !next[occId];
    return next;
  }
  if (itemId) {
    if (!items.some((i) => i.id === itemId)) return next;
    const k = itemKey(occId, itemId);
    next[k] = !next[k];
  } else {
    const target = !isOccDone(next, occId, items);
    for (const i of items) next[itemKey(occId, i.id)] = target;
  }
  next[occId] = isOccDone(next, occId, items);
  return next;
}
