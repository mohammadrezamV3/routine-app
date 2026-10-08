// ساخت زنده‌ی یک هفته برای خواننده‌ی آنالیز هفتگی: از getWeeklyAnalysis (همیشه
// تازه، با هدف/بازتاب/مربی) و buildLetterData همون قالب هفته‌نامه ساخته می‌شه.
// ردیف WeeklyLetter فقط برای شماره، اعلان و علامت «خوانده شد» می‌مونه.
import { prisma } from "@/lib/prisma";
import { getWeeklyAnalysis } from "@/lib/weeklyAnalysis/service";
import { addDaysIso, isoToUtcDate, safeTimezone } from "@/lib/weeklyAnalysis/week";
import { buildLetterData, gatherLetterExtras } from "./build";
import { MAX_WEEKS_BACK } from "./weekParam";
import type { LiveWeekPayload } from "./types";

export async function buildLiveWeek(
  userId: string,
  opts: { timezone: string | null | undefined; isSuperAdmin: boolean; offset: number; now?: Date; markRead?: boolean },
): Promise<LiveWeekPayload> {
  const tz = safeTimezone(opts.timezone);
  const now = opts.now ?? new Date();
  const analysis = await getWeeklyAnalysis(userId, { timezone: tz, offset: opts.offset, isSuperAdmin: opts.isSuperAdmin, now, withUnreadLetter: false });
  const weekStart = isoToUtcDate(analysis.weekStart);

  const row = await prisma.weeklyLetter.findUnique({
    where: { userId_weekStart: { userId, weekStart } },
    select: { id: true, status: true, issueNo: true, readAt: true },
  });
  const stored = row && row.status === "READY" ? row : null;
  const issue = stored ? stored.issueNo : null;

  const extras = await gatherLetterExtras(userId, analysis, { timezone: tz, issueNo: issue ?? 0, now });
  const letter = buildLetterData(analysis, extras);

  // خوندن شماره‌ی ثبت‌شده = خوانده‌شده (و اعلان زنگوله‌ی همون هفته)
  if (stored && !stored.readAt && opts.markRead !== false) {
    const at = new Date();
    const urls = [`/analysis/weekly/letters/${analysis.weekStart}`, `/analysis/weekly?week=${analysis.weekStart}`];
    await Promise.all([
      prisma.weeklyLetter.updateMany({ where: { id: stored.id, userId, readAt: null }, data: { readAt: at } }),
      prisma.inAppNotification.updateMany({ where: { userId, type: "weekly.letter", url: { in: urls }, readAt: null }, data: { readAt: at } }),
    ]).catch(() => {});
  }

  const off = analysis.offset;
  return {
    letter,
    analysis,
    issue,
    prev: off > -MAX_WEEKS_BACK ? addDaysIso(analysis.weekStart, -7) : null,
    next: off < 0 ? addDaysIso(analysis.weekStart, 7) : null,
    weekStart: analysis.weekStart,
    offset: off,
    isCurrent: analysis.isCurrentWeek,
  };
}
