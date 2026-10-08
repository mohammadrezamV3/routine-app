import { NextResponse } from "next/server";
import { requireMentorsUser } from "@/lib/mentorGuard";
import { SAVED_MENTORS_MAX, loadSavedMentorCards } from "@/lib/savedMentors";

// GET /api/mentors/saved → منتورهای ذخیره‌شده‌ی خودم (تازه‌ترین اول) + سقف.
// فقط منتورهایی که هنوز قابل کشف‌اند و با من رابطه‌ی بلاک ندارند.
export async function GET() {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const mentors = await loadSavedMentorCards(g.userId);
  return NextResponse.json({ mentors, max: SAVED_MENTORS_MAX });
}
