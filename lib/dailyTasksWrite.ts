import { prisma } from "@/lib/prisma";

// سقف تعداد کلید «انجام‌شده»ی یک روز — از هر برنامه‌ی واقعی خیلی بیشتره
export const MAX_DAILY_TASK_KEYS = 500;

/**
 * فقط کلیدهای boolean واقعی ذخیره می‌شن، با سقف تعداد/طول — این ستون Jsonه و
 * بدون سقف هر چیزی که فرستاده بشه عینا می‌نشست توی دیتابیس.
 * تک‌منبع مشترک بین POST /api/tasks/daily و دستیار نومو.
 */
export function sanitizeTaskMap(tasks: unknown): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  if (!tasks || typeof tasks !== "object") return out;
  for (const [k, v] of Object.entries(tasks as Record<string, unknown>).slice(0, MAX_DAILY_TASK_KEYS)) {
    if (typeof k === "string" && k.length <= 200) out[k.slice(0, 200)] = !!v;
  }
  return out;
}

export async function saveDailyTasks(userId: string, date: Date, tasks: unknown, wakeUpAt: Date | null) {
  const completedItems = sanitizeTaskMap(tasks);
  return prisma.dailyEntry.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, completedItems, wakeUpAt },
    update: { completedItems, wakeUpAt },
  });
}
