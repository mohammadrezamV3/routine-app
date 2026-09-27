import { NextResponse } from "next/server";
import { requireMentorsUser } from "@/lib/mentorGuard";
import { checkRateLimit } from "@/lib/rateLimit";
import { DISCOVERABLE_PROFILE_WHERE, blockedUserIds, loadPopularCards } from "@/lib/mentorServer";

const TOP_N = 12;

// GET /api/mentors/popular → منتورهای محبوب با امتیازِ ترکیبیِ lib/mentorRanking.ts
// (نه صرفاً تعدادِ شاگرد). فقط کسایی که شاگرد می‌پذیرن — ویترینِ «محبوب‌ها»
// نباید کاربر رو به منتوری بفرسته که درخواستش رو اصلا قبول نمی‌کنه.
export async function GET() {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  if (!(await checkRateLimit(`mentors:popular:${g.userId}`, 60, 60_000))) {
    return NextResponse.json({ error: "درخواست‌ها زیاده؛ کمی بعد دوباره امتحان کن" }, { status: 429 });
  }

  const blocked = await blockedUserIds(g.userId);
  const { cards } = await loadPopularCards(
    { ...DISCOVERABLE_PROFILE_WHERE, acceptingStudents: true, ...(blocked.length ? { userId: { notIn: blocked } } : {}) },
    0,
    TOP_N
  );
  return NextResponse.json({ mentors: cards });
}
