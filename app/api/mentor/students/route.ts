import { NextResponse } from "next/server";
import { requireMentorsUser, forbidden } from "@/lib/mentorGuard";
import { liveLabelIds } from "@/lib/mentorManageServer";
import { coachStudentRows, loadStudentBase } from "@/lib/coachStudentsServer";
import { tr } from "@/lib/i18n";

// GET /api/mentor/students → فهرست شاگردهای فعال منتور برای صفحه‌ی «شاگردها».
// هر ردیف فیلدهای قبلی (student، adherence، lastActivityAt، ...) را نگه می‌دارد و
// فیلدهای CoachStudentRow (user، weekRate، idleDays، goal، needsHelp، ...) هم دارد.
// همه‌ی عددها فقط از برنامه‌ها و پیام‌های *همین منتور*؛ منتور تعلیق‌شده فعالیت شاگرد را نمی‌بیند.
export async function GET() {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const base = await loadStudentBase(g.userId);
  if (!base) return forbidden(tr("اول پروفایل مربی‌گری بساز", "Create your mentor profile first"));

  const coach = await coachStudentRows(base);
  const coachById = new Map(coach.map((c) => [c.mentorshipId, c]));
  const rowById = new Map(base.rows.map((r) => [r.id, r]));

  const students = base.rels.map((m) => {
    const row = rowById.get(m.id)!;
    const c = coachById.get(m.id)!;
    return {
      // فیلدهای قبلی
      student: row.counterpart,
      startedAt: m.startedAt,
      categories: row.categories,
      labelIds: liveLabelIds(m.mentorLabelIds, base.labels),
      adherence: base.hideActivity ? null : base.adherence.get(m.studentId) ?? null,
      lastActivityAt: base.hideActivity ? null : base.lastActivity.get(m.studentId) ?? null,
      activePrograms: row.activePrograms,
      pausedAt: m.pausedAt,
      // CoachStudentRow
      ...c,
    };
  });

  return NextResponse.json({ students, labels: base.labels, capacity: base.profile.maxActiveStudents });
}
