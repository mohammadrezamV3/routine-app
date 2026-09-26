// قلاب‌های موردِ نیازِ لایه‌ی سینک برای موجودیتِ roadmapProgress — همون الگوی
// mobile/src/db/syncHooks.ts (سه عملیاتِ عمومی: چه‌چیزی dirty است، یک رکورد
// را «تمیز» علامت بزن، یک رکوردِ ریموت را با LWW اعمال کن)، فقط این‌جا چون
// یک جدولِ تک (progress) داریم امضا ساده‌تر است — بدونِ generic نامِ جدول.
import { db, RoadmapProgressRow } from "./db";

/** همه‌ی ردیف‌های dirty=1 — چیزی که باید به سرور push بشه
 *  (entity: "roadmapProgress"، کلید: id). */
export async function getDirty(): Promise<RoadmapProgressRow[]> {
  return db.progress.where("dirty").equals(1).toArray();
}

/** بعدِ اینکه سرور یک رکوردِ dirty را با موفقیت پذیرفت (status: "applied"). */
export async function markClean(id: string, serverUpdatedAt: string): Promise<void> {
  await db.progress.update(id, { dirty: 0, updatedAt: serverUpdatedAt });
}

/**
 * یک RoadmapProgressRecord آمده از سرور (پول یا پاسخِ push با status
 * "stale") را اعمال می‌کند — فقط اگر `record.editedAt` از نسخه‌ی محلی
 * جدیدتر باشد. اگر همین لحظه کاربر محلی تیک زده (dirty=1 با updatedAt
 * جدیدتر)، نسخه‌ی محلی برنده می‌ماند تا بعدا خودش push شود.
 */
export async function applyRemote(record: { id: string; stepProgress: RoadmapProgressRow["stepProgress"]; editedAt: string }): Promise<void> {
  const local = await db.progress.get(record.id);
  if (!local || local.updatedAt < record.editedAt) {
    await db.progress.put({ id: record.id, stepProgress: record.stepProgress, updatedAt: record.editedAt, dirty: 0 });
  }
  // local.updatedAt >= record.editedAt: نسخه‌ی محلی جدیدتر یا مساوی — دست‌نخورده می‌ماند.
}
