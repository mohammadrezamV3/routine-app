import { NextRequest, NextResponse } from "next/server";
import { requireMentorsUser } from "@/lib/mentorGuard";
import { isMentorCategory } from "@/lib/mentorCategories";
import { checkRateLimit } from "@/lib/rateLimit";
import { DISCOVERABLE_PROFILE_WHERE, blockedUserIds } from "@/lib/mentorServer";
import { filtersFromParams } from "@/lib/mentorSearch";
import { searchMentors } from "@/lib/mentorSearchServer";

const PAGE_SIZE = 20;
const MAX_PAGE = 50;

// GET /api/mentors → فهرست «پیدا کردن منتور» (همان کلیدهای نشانی صفحه):
//   q        جستجوی هوشمند (غلط املایی، هم‌معنی، فینگلیش — lib/mentorSearch.ts)
//   cat      حوزه (ROUTINE | FITNESS | NUTRITION)؛ «category» هم پذیرفته می‌شه
//   sort     best «بهترین نتیجه» (پیش‌فرض، امتیاز شایستگی — lib/mentorRanking.ts)
//            rating «بالاترین امتیاز» (نظرهای تاییدشده، بیزی) · new «تازه‌ترین»
//   cert=1   فقط دارای مدرک تاییدشده · open=1 فقط پذیرش باز
//   rating   حداقل امتیاز (4 | 4.5) · resp حداکثر زمان پاسخ (12 | 24 | 48 ساعت)
//   accepting=1 همان open=1 · verified=1 بی‌اثر (فهرست فقط هویت تاییدشده دارد)
//   page
// با عبارت جستجو، فقط منتورهای مرتبط میان و شایستگی فقط ترتیب همون‌ها رو تنظیم
// می‌کنه. فقط منتورهای قابل کشف (منتشرشده، غیرمعلق، هویت تاییدشده).
export async function GET(req: NextRequest) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  if (!(await checkRateLimit(`mentors:discover:${g.userId}`, 60, 60_000))) {
    return NextResponse.json({ error: "درخواست‌ها زیاد بوده؛ کمی بعد دوباره تلاش کن" }, { status: 429 });
  }

  const sp = req.nextUrl.searchParams;
  const filters = filtersFromParams(sp, isMentorCategory);
  const pageNum = Number(sp.get("page") || 1);
  const page = Number.isInteger(pageNum) && pageNum >= 1 ? Math.min(pageNum, MAX_PAGE) : 1;

  // کسی که با من (از بخش دوستان) رابطه‌ی بلاک داره در جستجو دیده نمی‌شه
  const blocked = await blockedUserIds(g.userId);
  const base = { ...DISCOVERABLE_PROFILE_WHERE, ...(blocked.length ? { userId: { notIn: blocked } } : {}) };

  const { cards, hasMore } = await searchMentors(filters, base, page, PAGE_SIZE);
  return NextResponse.json({ mentors: cards, hasMore });
}
