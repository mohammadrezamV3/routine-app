// دیتابیس محلی آفلاین‌فرستِ ماژول رودمپ — جدا از mobile/src/db (arion-mobile)
// چون رودمپ یک ماژولِ پولی/مشروط (ROADMAP) است و منطقش (کش کاملِ محتوا +
// پیشرفتِ قابل‌ویرایشِ آفلاین) با موجودیت‌های پایه فرق دارد.
//
// دو جدول:
//   - roadmaps: کشِ فقط‌خواندنیِ کاملِ هر رودمپ — همیشه از
//     GET /api/mobile/roadmaps (مرجع کامل) بازنویسی می‌شود؛ خودش dirty
//     نمی‌شود و push نمی‌کند.
//   - progress: نسخه‌ی محلیِ *قابل‌ویرایشِ* stepProgress هر رودمپ —
//     dirty=1 یعنی «تیک‌خوردنِ آفلاین که هنوز push نشده». updatedAt همان
//     معنایِ editedAt در قراردادِ سرور را دارد؛ LWW با همین مقایسه می‌شود.
import Dexie, { Table } from "dexie";
import type { RoadmapPlan, RoadmapProgressSummary, RoadmapStepProgress } from "@/lib/api-contract";

export interface RoadmapCacheRow {
  id: string;
  topic: string;
  goal: string | null;
  generatedByAi: boolean;
  createdAt: string;
  plan: RoadmapPlan;
  /** آخرین stepProgress/progress که سرور توی فهرست فرستاده — فقط seed اولیه؛
   *  نمایش واقعی از جدول progress خونده می‌شه (که ممکنه محلی جدیدتر باشه) */
  serverStepProgress: RoadmapStepProgress;
  serverProgress: RoadmapProgressSummary;
  /** زمانِ سرور برای همین رکورد — فقط دیباگ */
  updatedAt: string;
}

export interface RoadmapProgressRow {
  /** = id خودِ رودمپ */
  id: string;
  stepProgress: RoadmapStepProgress;
  /** معنیِ editedAt — پایه‌ی LWW */
  updatedAt: string;
  dirty: 0 | 1;
}

export interface RoadmapMetaRow {
  key: string;
  value: string;
}

class RoadmapsDB extends Dexie {
  roadmaps!: Table<RoadmapCacheRow, string>;
  progress!: Table<RoadmapProgressRow, string>;
  meta!: Table<RoadmapMetaRow, string>;

  constructor() {
    super("arion-roadmaps");
    this.version(1).stores({
      roadmaps: "id, updatedAt",
      progress: "id, updatedAt, dirty",
      meta: "key",
    });
  }
}

export const db = new RoadmapsDB();

export function nowIso(): string {
  return new Date().toISOString();
}

export const LIST_ETAG_KEY = "listEtag";

export async function getListEtag(): Promise<string | undefined> {
  const row = await db.meta.get(LIST_ETAG_KEY);
  return row?.value;
}

export async function setListEtag(etag: string): Promise<void> {
  await db.meta.put({ key: LIST_ETAG_KEY, value: etag });
}
