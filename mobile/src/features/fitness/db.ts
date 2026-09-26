import Dexie, { type Table } from "dexie";
import type {
  ExercisePlanRow,
  ExerciseLogRow,
  SetLogRow,
  CalorieEntryRow,
  CalorieTargetRow,
  CustomFoodRow,
} from "./lib/exerciseTypes";

// دیتابیسِ محلیِ ماژولِ ورزش/کالری — کاملا مجزا از بقیه‌ی feature-ها
// (routine/trade/…)، هر کدوم دیتابیسِ Dexie خودشون رو دارن تا تغییرِ اسکیمای
// یکی، migration بقیه رو لمس نکنه.
export class FitnessDb extends Dexie {
  plans!: Table<ExercisePlanRow, string>;
  exerciseLogs!: Table<ExerciseLogRow, string>;
  setLogs!: Table<SetLogRow, string>;
  calorieEntries!: Table<CalorieEntryRow, string>;
  calorieTargets!: Table<CalorieTargetRow, string>;
  customFoods!: Table<CustomFoodRow, string>;

  constructor() {
    super("arion-fitness");
    this.version(1).stores({
      // ایندکس‌های ثانویه: هرچی توی صفحات واقعا باهاش فیلتر/سورت می‌کنیم.
      // isActive عمدا ایندکس نشده: IndexedDB اجازه‌ی key از نوع boolean
      // نمی‌ده — کوئریِ «پلنِ فعال» با .filter() در حافظه انجام می‌شه
      // (تعداد پلن‌های یک کاربر همیشه کوچیکه، پس هزینه‌ای نداره).
      plans: "id, dirty, updatedAt, deletedAt",
      exerciseLogs: "id, planId, date, dirty, updatedAt, deletedAt, [planId+date]",
      setLogs: "id, planId, date, itemKey, dirty, updatedAt, deletedAt, [planId+date+itemKey]",
      calorieEntries: "id, date, mealType, dirty, updatedAt, deletedAt",
      calorieTargets: "id, effectiveFrom, dirty, updatedAt, deletedAt",
      customFoods: "id, name, dirty, updatedAt, deletedAt",
    });
  }
}

export const fitnessDb = new FitnessDb();

// ============================================================================
// Sync hooks — قرارداد مشترکِ همه‌ی جدول‌های آفلاینِ اپ موبایل:
//   dirty=1 یعنی این ردیف از آخرین sync موفق تغییر کرده و باید push بشه.
//   markClean بعدِ push موفق صدا زده می‌شه (dirty=0 + updatedAt = مهرِ سرور).
//   applyRemote موقعِ pull صدا زده می‌شه؛ Last-Write-Wins روی updatedAt.
// ============================================================================

export type FitnessEntity = "plans" | "exerciseLogs" | "setLogs" | "calorieEntries" | "calorieTargets" | "customFoods";

function tableOf(entity: FitnessEntity): Table<any, string> {
  switch (entity) {
    case "plans":
      return fitnessDb.plans;
    case "exerciseLogs":
      return fitnessDb.exerciseLogs;
    case "setLogs":
      return fitnessDb.setLogs;
    case "calorieEntries":
      return fitnessDb.calorieEntries;
    case "calorieTargets":
      return fitnessDb.calorieTargets;
    case "customFoods":
      return fitnessDb.customFoods;
  }
}

/** همه‌ی ردیف‌های dirty=1 یک جدول — برای پوش به سرور. */
export async function getDirty(entity: FitnessEntity): Promise<any[]> {
  return tableOf(entity).where("dirty").equals(1).toArray();
}

/** همه‌ی ردیف‌های dirty=1 در تمام جدول‌های این ماژول — برای یک پوش دسته‌ای. */
export async function getAllDirty(): Promise<Partial<Record<FitnessEntity, any[]>>> {
  const entities: FitnessEntity[] = ["plans", "exerciseLogs", "setLogs", "calorieEntries", "calorieTargets", "customFoods"];
  const out: Partial<Record<FitnessEntity, any[]>> = {};
  for (const e of entities) {
    const rows = await getDirty(e);
    if (rows.length) out[e] = rows;
  }
  return out;
}

/** بعدِ push موفقِ یک ردیف — dirty رو پاک می‌کنه و مهرِ زمانِ سرور رو می‌نویسه. */
export async function markClean(entity: FitnessEntity, id: string, serverUpdatedAt: string): Promise<void> {
  await tableOf(entity).update(id, { dirty: 0, updatedAt: serverUpdatedAt } as any);
}

/**
 * اعمالِ یک رکوردِ pull-شده از سرور با Last-Write-Wins: فقط وقتی رکورد
 * محلی رو جایگزین می‌کنه که `remote.editedAt` (مهرِ زمانِ سرور) از
 * `updatedAt` محلی جدیدتر باشه — وگرنه تغییراتِ محلیِ هنوز-push-نشده
 * (dirty=1) با یک نسخه‌ی قدیمی‌تر از سرور بی‌صدا پاک نمی‌شن.
 */
export async function applyRemote(entity: FitnessEntity, record: any & { id: string; editedAt: string }): Promise<void> {
  const table = tableOf(entity);
  const local = await table.get(record.id);
  if (local && new Date(local.updatedAt).getTime() >= new Date(record.editedAt).getTime()) {
    return;
  }
  const { editedAt, ...rest } = record;
  await table.put({ ...rest, updatedAt: editedAt, dirty: 0 } as any);
}
