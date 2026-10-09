import { NextResponse } from "next/server";
import { requireMentorsUser } from "@/lib/mentorGuard";
import { checkRateLimit } from "@/lib/rateLimit";
import { DISCOVERABLE_PROFILE_WHERE, blockedUserIds } from "@/lib/mentorServer";
import { loadNewcomerCards, loadPopularMentorCards } from "@/lib/mentorRankingStats";
import { tr } from "@/lib/i18n";

const TOP_N = 12;
const NEWCOMERS_N = 6;

// GET /api/mentors/popular → دو ویترین جدا:
//   mentors   «منتورهای محبوب»: فقط منتورهایی که حداقل نمونه، احراز هویت و
//             سلامت کافی دارن، به ترتیب امتیاز شایستگی (lib/mentorRanking.ts)
//   newcomers «منتورهای تازه»: منتور تاییدشده با پروفایل کامل که هنوز نمونه‌ی
//             کافی نداره — جایگاه جدا و برچسب‌دار، قاطی رتبه‌بندی نمی‌شه
// هر دو فقط کسانی که همین الان درخواست می‌پذیرن (پذیرش باز، ظرفیت خالی، در دسترس).
export async function GET() {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  if (!(await checkRateLimit(`mentors:popular:${g.userId}`, 60, 60_000))) {
    return NextResponse.json({ error: tr("درخواست‌ها زیاده؛ کمی بعد دوباره امتحان کن", "Too many requests; try again shortly") }, { status: 429 });
  }

  const blocked = await blockedUserIds(g.userId);
  const where = { ...DISCOVERABLE_PROFILE_WHERE, acceptingStudents: true, ...(blocked.length ? { userId: { notIn: blocked } } : {}) };
  const mentors = await loadPopularMentorCards(where, TOP_N);
  const newcomers = await loadNewcomerCards(where, [], NEWCOMERS_N);
  // یک منتور هم‌زمان در هر دو ویترین نمیاد
  const shown = new Set(mentors.map((m) => m.userId));
  return NextResponse.json({ mentors, newcomers: newcomers.filter((m) => !shown.has(m.userId)) });
}
