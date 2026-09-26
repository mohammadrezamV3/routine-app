// قلاب‌های موردِ نیازِ لایه‌ی سینک (mobile/src/sync — تیمِ دیگه‌ای موازی
// می‌سازدش). این فایل هیچ فرضی درباره‌ی شکلِ پروتکلِ سرور نداره؛ فقط سه
// عملیاتِ عمومی روی جدول‌های Dexie می‌ده: چه‌چیزی «dirty»ه، یک رکورد را
// «تمیز» علامت بزن (بعدِ push موفق)، یک رکوردِ ریموت را با last-write-wins
// اعمال کن (بعدِ pull).
import { db, DailyEntryRow, TaskRow, SleepEntryRow, SettingRow } from "./db";

export type EntityName = "dailyEntries" | "tasks" | "sleepEntries" | "settings";

type RowOf<E extends EntityName> = E extends "dailyEntries"
  ? DailyEntryRow
  : E extends "tasks"
    ? TaskRow
    : E extends "sleepEntries"
      ? SleepEntryRow
      : SettingRow;

/** کلیدِ اصلیِ هر جدول — dailyEntries/sleepEntries با `date`، tasks با
 *  `id`، settings با `key`. سینک با همین کلید رکورد را شناسایی می‌کند. */
function primaryKeyField(entity: EntityName): "date" | "id" | "key" {
  if (entity === "dailyEntries" || entity === "sleepEntries") return "date";
  if (entity === "tasks") return "id";
  return "key";
}

function keyOf<E extends EntityName>(entity: E, row: RowOf<E>): string {
  return (row as any)[primaryKeyField(entity)];
}

/** همه‌ی ردیف‌های dirty=1 یک جدول — چیزی که باید به سرور push بشه. رکوردهای
 *  soft-delete شده (deletedAt غیرِ null) هم اینجا میان، چون خودِ حذف هم
 *  باید سینک بشه. */
export async function getDirty<E extends EntityName>(entity: E): Promise<RowOf<E>[]> {
  const table = db[entity] as any;
  return table.where("dirty").equals(1).toArray();
}

/** بعدِ اینکه سرور یک رکوردِ dirty را با موفقیت پذیرفت — dirty را صفر می‌کند
 *  و updatedAt را با مهرِ زمانِ سرور (منبعِ حقیقتِ نهایی بعدِ سینک) جایگزین
 *  می‌کند، تا دفعه‌ی بعد یک pull با updatedAt قدیمی‌تر آن را بازنویسی نکند. */
export async function markClean<E extends EntityName>(
  entity: E,
  id: string,
  serverUpdatedAt: string
): Promise<void> {
  const table = db[entity] as any;
  await table.update(id, { dirty: 0, updatedAt: serverUpdatedAt });
}

/**
 * یک رکوردِ آمده از سرور (قبلا به شکلِ ردیفِ محلی نگاشت شده — mobile/src/sync/mappers.ts)
 * را با last-write-wins اعمال می‌کند. `record.updatedAt` باید `editedAt`ِ
 * سرور باشد (زمانِ منطقیِ ویرایش — نه updatedAtِ سرور که فقط cursor است).
 *
 * قاعده: ریموت برنده است اگر
 *   - محلی اصلا وجود نداشته باشد، یا
 *   - محلی dirty نباشد (یعنی چیزی برای از دست رفتن ندارد — سرور منبعِ حقیقت است)، یا
 *   - remote.editedAt > local.updatedAt (ویرایشِ دیگری بعد از ویرایشِ محلی).
 * در غیرِ این صورت (محلیِ dirty و جدیدتر/هم‌زمان) نسخه‌ی محلی می‌ماند تا خودش push شود.
 * با `force` (نتیجه‌ی push برای همان نسخه‌ای که فرستادیم) بی‌شرط اعمال می‌شود.
 * بعد از اعمال: updatedAt = editedAtِ سرور، dirty = 0.
 * خروجی: true اگر اعمال شد.
 */
export async function applyRemote<E extends EntityName>(
  entity: E,
  record: RowOf<E>,
  opts: { force?: boolean } = {}
): Promise<boolean> {
  const table = db[entity] as any;
  const id = keyOf(entity, record);
  return db.transaction("rw", table, async () => {
    const local = (await table.get(id)) as RowOf<E> | undefined;
    const wins =
      opts.force ||
      !local ||
      local.dirty !== 1 ||
      Date.parse(record.updatedAt) > Date.parse(local.updatedAt);
    if (!wins) return false;
    await table.put({ ...record, dirty: 0 });
    return true;
  });
}

/** همه‌ی ردیف‌های همه‌ی جدول‌ها را dirty می‌کند (بدونِ دست‌زدن به updatedAt) —
 *  برای ادغامِ دیتای مهمان/محلی در اولین ورود: LWWِ سرور تصمیم می‌گیرد. */
export async function markAllDirty(): Promise<void> {
  await db.transaction("rw", [db.dailyEntries, db.tasks, db.sleepEntries, db.settings], async () => {
    await Promise.all([
      db.dailyEntries.toCollection().modify({ dirty: 1 }),
      db.tasks.toCollection().modify({ dirty: 1 }),
      db.sleepEntries.toCollection().modify({ dirty: 1 }),
      db.settings.toCollection().modify({ dirty: 1 }),
    ]);
  });
}

/** پاک‌کردنِ کاملِ دیتای محلی (خروج با «پاک‌کردنِ داده‌های این دستگاه»). */
export async function wipeAll(): Promise<void> {
  await db.transaction("rw", [db.dailyEntries, db.tasks, db.sleepEntries, db.settings], async () => {
    await Promise.all([db.dailyEntries.clear(), db.tasks.clear(), db.sleepEntries.clear(), db.settings.clear()]);
  });
}

/** شناسه‌ی یک تسکِ محلی را عوض می‌کند (id قدیمیِ ناسازگار با سرور → id معتبر). */
export async function rekeyTask(oldId: string, newId: string): Promise<void> {
  await db.transaction("rw", db.tasks, async () => {
    const row = await db.tasks.get(oldId);
    if (!row) return;
    await db.tasks.put({ ...row, id: newId, dirty: 1 });
    await db.tasks.delete(oldId);
  });
}

/**
 * شنونده‌ی «نوشتنِ محلی» — هر create/update که ردیف را dirty=1 می‌گذارد (یعنی
 * نوشتنِ repo، نه applyRemote/markClean که dirty=0 می‌گذارند). برای
 * زمان‌بندیِ سینکِ debounced بعد از ویرایشِ کاربر. خروجی: تابعِ لغو.
 */
export function onLocalWrite(cb: () => void, extraTables: unknown[] = []): () => void {
  // extraTables: جدول‌های Dexieِ ماژول‌های دیگه (ورزش/ترید/رودمپ) با همون قراردادِ dirty
  const tables = [db.dailyEntries, db.tasks, db.sleepEntries, db.settings, ...extraTables] as any[];
  const creating = function (_pk: unknown, obj: any) {
    if (obj && obj.dirty === 1) queueMicrotask(cb);
  };
  const updating = function (mods: any, _pk: unknown, obj: any) {
    const dirty = mods && "dirty" in mods ? mods.dirty : obj?.dirty;
    // markAllDirty هم اینجا می‌رسد — بی‌ضرر، سینک single-flight است
    if (dirty === 1) queueMicrotask(cb);
  };
  for (const t of tables) {
    t.hook("creating", creating);
    t.hook("updating", updating);
  }
  return () => {
    for (const t of tables) {
      t.hook("creating").unsubscribe(creating);
      t.hook("updating").unsubscribe(updating);
    }
  };
}

/**
 * نتیجه‌ی push یک ردیف را اتمیک اعمال می‌کند — فقط اگر ردیف از لحظه‌ی
 * snapshot (زمانِ ساختنِ دسته) عوض نشده باشد (`updatedAt` هنوز همانی است که
 * فرستادیم). اگر کاربر در حینِ push دوباره ویرایشش کرده، دست نمی‌خورد و
 * dirty می‌ماند تا دورِ بعد push شود. `record` (نگاشت‌شده به شکلِ محلی، با
 * updatedAt = editedAtِ سرور) اگر null باشد فقط dirty صفر می‌شود.
 * خروجی: true اگر اعمال شد.
 */
export async function settlePushed<E extends EntityName>(
  entity: E,
  id: string,
  pushedUpdatedAt: string,
  record: RowOf<E> | null
): Promise<boolean> {
  const table = db[entity] as any;
  return db.transaction("rw", table, async () => {
    const local = (await table.get(id)) as RowOf<E> | undefined;
    if (local && local.updatedAt !== pushedUpdatedAt) return false;
    if (record) await table.put({ ...record, dirty: 0 });
    else if (local) await table.update(id, { dirty: 0 });
    return true;
  });
}
