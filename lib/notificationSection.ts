// فیلتر اعلان‌های درون‌برنامه‌ای بر اساس بخش (زیردامنه) — فقط سرور.
// روی زیردامنه‌ی یک بخش، اعلان‌های رابطه‌ی منتوری (و برنامه‌های اون) که حوزه‌اش با اون بخش
// اشتراک نداره پنهان می‌شه؛ اعلان‌های حساب و سیستم (پیام ادمین، آنالیز هفتگی، ...) و
// اعلان‌هایی که به رابطه‌ی مشخصی وصل نیستن همیشه دیده می‌شن. دامنه‌ی اصلی (null) فیلتر نداره.
// تشخیص از url اعلان: /mentorship/<id> و /mentor-programs/<id> (قرارداد notifyUser).
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SECTION_META, type SectionKey } from "@/lib/sections";
import { intersectsCategories } from "@/lib/mentorCategories";

/** urlهای اعلان‌هایی که روی این بخش نباید دیده بشن */
export async function hiddenNotificationUrls(userId: string, section: SectionKey | null): Promise<string[]> {
  if (!section) return [];
  const allowed = SECTION_META[section].mentorCategories;
  const rels = await prisma.mentorship.findMany({
    where: { OR: [{ studentId: userId }, { mentorId: userId }] },
    select: { id: true, categories: true },
  });
  // خالی = رابطه‌ی قدیمی بدون حوزه → همه‌ی بخش‌ها
  const hidden = rels.filter((r) => r.categories.length > 0 && !intersectsCategories(r.categories, allowed));
  if (hidden.length === 0) return [];
  const programs = await prisma.mentorProgram.findMany({
    where: { mentorshipId: { in: hidden.map((r) => r.id) } },
    select: { id: true },
  });
  return [...hidden.map((r) => `/mentorship/${r.id}`), ...programs.map((p) => `/mentor-programs/${p.id}`)];
}

/** شرط where برای InAppNotification (url خالی همیشه مجازه چون notIn روی NULL حذف می‌کنه) */
export function notificationSectionWhere(hiddenUrls: string[]): Prisma.InAppNotificationWhereInput {
  return hiddenUrls.length === 0 ? {} : { OR: [{ url: null }, { url: { notIn: hiddenUrls } }] };
}
