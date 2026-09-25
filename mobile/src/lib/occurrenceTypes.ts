// انواع مشترکِ برنامه‌های سفارشی کاربر — پورت از lib/storage.ts (وب) بدون
// وابستگی به next-auth یا هیچ لایه‌ی fetch/شبکه‌ای. این تایپ‌ها همون شکلِ
// CustomOccurrence وب رو دارن تا سینک بعدی (mobile/src/sync) بدون تبدیل
// اضافه بین دو طرف رد و بدل بشه.

export type Importance = "low" | "medium" | "high" | "veryHigh";

export const IMPORTANCE_LABELS: Record<Importance, string> = {
  low: "کم",
  medium: "متوسط",
  high: "زیاد",
  veryHigh: "خیلی زیاد",
};

/** یک وقوعِ منفرد که کاربر داره روی اون کار می‌کنه (ویرایش/انتقال/حذف) —
 *  معادلِ تایپِ Occ در EditOccurrenceForm/MoveOccurrenceModal وب. */
export type Occ = {
  id: string;
  jsDay: number;
  time: string;
  custom?: boolean;
  importance?: Importance;
  tag?: string;
};

export type CustomOccurrence = {
  id: string;
  name: string;
  jsDay: number;
  time: string;
  startDate?: string; // ISO (YYYY-MM-DD)
  endDate?: string;
  importance?: Importance;
  tag?: string;
  notify?: boolean;
  roadmapId?: string;
};
