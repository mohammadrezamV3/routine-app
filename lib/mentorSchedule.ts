import { prisma } from "@/lib/prisma";
import { activateDuePrograms } from "@/lib/mentorProgramMirror";
import { todayIsoForUser, todayIsoInTz, dateFromIso } from "@/lib/mentorServer";
import { notifyUser } from "@/lib/inAppNotify";

// زمان‌بندی شروع برنامه — برنامه‌ی پذیرفته‌شده (ACCEPTED) با تاریخ شروع
// آینده، در همان روز خودکار ACTIVE می‌شود. هیچ زمان‌بند بیرونی (cron) لازم
// نیست: فعال‌سازی lazy است، هر بار که یکی از دو طرف اپ را باز می‌کند
// (اعلان‌ها موقع لود هر صفحه خوانده می‌شوند) یا داشبورد منتور/فهرست
// برنامه‌ها خوانده می‌شود. همان روح ensureFreshCalendar در CLAUDE.md.

export type ScheduleState = "scheduled" | "due" | null;

/** برنامه‌ی ACCEPTED با شروع آینده = «زمان‌بندی‌شده»؛ رسیده ولی هنوز فعال‌نشده = «due» */
export function scheduleState(p: { status: string; startDate: string | null }, todayIso: string): ScheduleState {
  if (p.status !== "ACCEPTED" || !p.startDate) return null;
  return p.startDate.slice(0, 10) > todayIso ? "scheduled" : "due";
}

/**
 * برنامه‌های رسیده‌ی کاربر (به‌عنوان شاگرد یا منتور) را فعال می‌کند و به هر
 * دو طرف خبر می‌دهد. ارزان است: وقتی چیزی رسیده نباشد فقط یک کوئری می‌زند.
 * هرگز throw نمی‌کند.
 */
export async function activateDueForUser(userId: string): Promise<string[]> {
  try {
    // «امروز» جلوترین تایم‌زون دنیا (UTC+14) به‌عنوان مرز؛ تصمیم دقیق با todayIsoForUser شاگرد است
    const horizon = dateFromIso(todayIsoInTz("Pacific/Kiritimati"));
    const due = await prisma.mentorProgram.findMany({
      where: { status: "ACCEPTED", startDate: { lte: horizon }, OR: [{ studentId: userId }, { mentorId: userId }] },
      select: { id: true, studentId: true, mentorId: true, status: true, startDate: true, mentorshipId: true, title: true },
      take: 50,
    });
    if (due.length === 0) return [];
    const activated = await activateDuePrograms(due, todayIsoForUser);
    for (const id of activated) {
      const p = due.find((x) => x.id === id)!;
      const url = `/mentor-programs/${p.id}`;
      await notifyUser(p.studentId, { type: "program.started", title: "شروع برنامه", body: `برنامه‌ی «${p.title}» طبق زمان‌بندی از امروز فعال شد.`, url });
      await notifyUser(p.mentorId, { type: "program.started", title: "شروع برنامه", body: `برنامه‌ی «${p.title}» طبق زمان‌بندی برای شاگرد فعال شد.`, url });
    }
    return activated;
  } catch {
    return [];
  }
}
