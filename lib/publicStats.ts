import { prisma } from "@/lib/prisma";
import { DEMO_USER_WHERE } from "@/lib/demoData";

// عددِ «کاربران» روی لندینگ — طبقِ درخواستِ صریحِ صاحبِ محصول، تعدادِ واقعیِ
// کاربرانِ ثبت‌نام‌کرده (بدونِ کاربرانِ آزمایشیِ demo_*) به‌علاوه‌ی این پایه.
export const USER_COUNT_BASE = 1312;

// کشِ درون‌حافظه‌ای ۱۰ دقیقه‌ای: روتِ عمومی و بدونِ احرازهویته، پس هر بازدیدِ
// لندینگ نباید یک COUNT روی جدولِ User بزنه.
const TTL_MS = 10 * 60 * 1000;
let cache: { value: number; at: number } | null = null;

export async function getPublicUserCount(): Promise<number> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  try {
    const real = await prisma.user.count({ where: { NOT: DEMO_USER_WHERE } });
    cache = { value: real + USER_COUNT_BASE, at: Date.now() };
  } catch {
    // دیتابیس در دسترس نبود: آخرین مقدارِ کش‌شده یا دستِ‌کم خودِ پایه.
    if (!cache) return USER_COUNT_BASE;
  }
  return cache!.value;
}
