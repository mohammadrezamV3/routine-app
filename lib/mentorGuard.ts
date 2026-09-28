import { NextResponse } from "next/server";
import type { Mentorship, MentorProfile } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireFeature, FeatureGuardResult } from "@/lib/featureFlagsServer";

// نگهبان‌های سمت سرورِ اکوسیستم منتور. قانونِ طلایی: هیچ روتی به id‌ای که
// از URL/بدنه اومده به‌تنهایی اعتماد نمی‌کنه — همیشه رابطه با userIdِ خودِ
// سشن توی where گذاشته می‌شه (ضد IDOR). پاسخ برای «وجود نداره» و «مالِ تو
// نیست» یکیه (۴۰۴) تا وجودِ رکوردِ دیگران لو نره.

export const notFound = () => NextResponse.json({ error: "not found" }, { status: 404 });
export const forbidden = (msg = "اجازه‌ی این کار رو نداری") => NextResponse.json({ error: msg }, { status: 403 });
export const badRequest = (msg: string) => NextResponse.json({ error: msg }, { status: 400 });
export const conflict = (msg: string) => NextResponse.json({ error: msg }, { status: 409 });

/** کاربرِ لاگین‌کرده، مسدودنشده، با فلگِ «mentors» روشن */
export async function requireMentorsUser(): Promise<FeatureGuardResult> {
  const g = await requireFeature("mentors");
  if (!g.ok) return g;
  const u = await prisma.user.findUnique({ where: { id: g.userId }, select: { deletedAt: true } });
  if (!u || u.deletedAt) return { ok: false, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  return g;
}

/** پروفایلِ منتوریِ فعال (غیرتعلیق) یا پاسخِ خطا */
export async function getActiveMentorProfile(
  userId: string
): Promise<{ ok: true; profile: MentorProfile } | { ok: false; response: NextResponse }> {
  const profile = await prisma.mentorProfile.findUnique({ where: { userId } });
  if (!profile) return { ok: false, response: forbidden("اول پروفایل مربی‌گری بساز") };
  if (profile.suspendedAt) return { ok: false, response: forbidden("حساب مربی‌گری تو تعلیق شده") };
  return { ok: true, profile };
}

/** رابطه‌ای که کاربرِ فعلی یکی از دو طرفشه؛ وگرنه null */
export async function getMentorshipForUser(id: string, userId: string): Promise<Mentorship | null> {
  if (typeof id !== "string" || !id || id.length > 64) return null;
  return prisma.mentorship.findFirst({ where: { id, OR: [{ mentorId: userId }, { studentId: userId }] } });
}

/** رابطه‌ی ACTIVE بین این منتور و این شاگرد — پایه‌ی هر دسترسیِ منتور به داده‌ی شاگرد */
export async function getActiveMentorshipAsMentor(mentorId: string, studentId: string): Promise<Mentorship | null> {
  if (typeof studentId !== "string" || !studentId || studentId.length > 64) return null;
  // منتورِ تعلیق‌شده و شاگردِ مسدود/حذف‌شده هم یعنی «دسترسی نیست» — تعلیق باید
  // فوراً دسترسی به داده‌ی شاگردهای فعلی رو هم ببنده، نه فقط کشف و شاگردِ جدید.
  return prisma.mentorship.findFirst({
    where: {
      mentorId,
      studentId,
      status: "ACTIVE",
      student: { isBlocked: false, deletedAt: null },
      mentor: { mentorProfile: { is: { suspendedAt: null } } },
    },
  });
}

/** منتورِ این رابطه تعلیق شده؟ (برای بستنِ چت/فیدبک/پذیرشِ برنامه) */
export async function isMentorSuspended(mentorId: string): Promise<boolean> {
  const p = await prisma.mentorProfile.findUnique({ where: { userId: mentorId }, select: { suspendedAt: true } });
  return !p || !!p.suspendedAt;
}

export function roleIn(m: Pick<Mentorship, "mentorId" | "studentId">, userId: string): "MENTOR" | "STUDENT" | null {
  if (m.mentorId === userId) return "MENTOR";
  if (m.studentId === userId) return "STUDENT";
  return null;
}

/** ثبتِ فعالیتِ منتور برای سیگنالِ «فعال‌بودن» در کشف — best-effort */
export function touchMentorActivity(userId: string): void {
  prisma.mentorProfile.updateMany({ where: { userId }, data: { lastActiveAt: new Date() } }).catch(() => {});
}
