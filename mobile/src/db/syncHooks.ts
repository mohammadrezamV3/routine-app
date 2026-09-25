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
 * یک رکوردِ آمده از سرور را اعمال می‌کند — فقط اگر `remote.updatedAt` از
 * نسخه‌ی محلی جدیدتر باشد (last-write-wins). یعنی: اگر همین لحظه که pull
 * در حال اجراست کاربر محلی همان رکورد را ویرایش کرده (dirty=1 با
 * updatedAt جدیدتر)، نسخه‌ی محلی برنده می‌ماند تا بعدا خودش push شود.
 * رکوردی که محلی اصلا وجود ندارد، مستقیم درج می‌شود (dirty=0، چون از
 * سرور آمده و نیازی به push دوباره ندارد).
 */
export async function applyRemote<E extends EntityName>(entity: E, record: RowOf<E>): Promise<void> {
  const table = db[entity] as any;
  const id = keyOf(entity, record);
  const local = await table.get(id);
  if (!local || local.updatedAt < record.updatedAt) {
    await table.put({ ...record, dirty: 0 });
  }
  // local.updatedAt >= record.updatedAt: نسخه‌ی محلی جدیدتر یا مساوی است،
  // چیزی عوض نمی‌شود — نسخه‌ی محلی (شاید هنوز dirty) دست‌نخورده می‌ماند.
}
