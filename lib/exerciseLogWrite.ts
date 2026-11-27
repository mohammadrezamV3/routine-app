import { prisma } from "@/lib/prisma";

/**
 * ثبت «انجام شد/نشد» تمرین یک روز یک برنامه — تک‌منبع مشترک بین
 * POST /api/exercise/log و دستیار نومو. completedItems فقط وقتی داده شده
 * دست می‌خوره؛ سقف تعداد/طول چون ستون Jsonه.
 */
export async function upsertExerciseLog(userId: string, planId: string, date: Date, completed: boolean, completedItems?: unknown) {
  const items = Array.isArray(completedItems)
    ? completedItems.filter((x) => typeof x === "string").slice(0, 500).map((x: string) => x.slice(0, 200))
    : undefined;
  await prisma.exerciseLog.upsert({
    where: { userId_planId_date: { userId, planId, date } },
    create: { userId, planId, date, completed: !!completed, completedItems: items ?? undefined },
    update: { completed: !!completed, ...(items !== undefined ? { completedItems: items } : {}) },
  });
}
