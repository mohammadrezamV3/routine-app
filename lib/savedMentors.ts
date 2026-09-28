import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { faNum } from "@/lib/jalali";
import { DISCOVERABLE_PROFILE_WHERE, MENTOR_CARD_INCLUDE, blockedUserIds, buildMentorCards, isUniqueViolation, usersBlockEachOther, type MentorCard } from "@/lib/mentorServer";

// منتورهای ذخیره‌شده (نشانک) — کاربر چند منتور را برای تصمیمِ بعدی کنار می‌گذارد.
// • سقف SAVED_MENTORS_MAX سمتِ سرور؛ دو درخواستِ هم‌زمان هم از سقف رد نمی‌شوند
//   (بعد از ساخت دوباره شمرده و در صورتِ عبور، همان ردیف برداشته می‌شود).
// • فقط ذخیره‌هایی شمرده/نمایش داده می‌شوند که منتورشان هنوز قابلِ کشف است و با
//   بیننده رابطه‌ی بلاک ندارد — ذخیره‌ی پنهان جای خالی را نمی‌گیرد.
// • همه‌ی کوئری‌ها با userIdِ خودِ سشن (ضد IDOR).

export const SAVED_MENTORS_MAX = 10;
export const SAVED_LIMIT_MSG = `حداکثر ${faNum(SAVED_MENTORS_MAX)} منتور ذخیره می‌شود؛ برای ذخیره‌ی این منتور، یکی از ذخیره‌شده‌ها را بردار`;

function visibleSavedWhere(userId: string, blocked: string[]): Prisma.SavedMentorWhereInput {
  return {
    userId,
    mentor: { mentorProfile: { is: DISCOVERABLE_PROFILE_WHERE } },
    ...(blocked.length ? { mentorUserId: { notIn: blocked } } : {}),
  };
}

export async function countSavedMentors(userId: string, blocked?: string[]): Promise<number> {
  return prisma.savedMentor.count({ where: visibleSavedWhere(userId, blocked ?? (await blockedUserIds(userId))) });
}

export type SaveResult =
  | { ok: true; saved: boolean; count: number }
  | { ok: false; status: 400 | 404 | 409; error: string };

/** ذخیره (بی‌اثر اگر از قبل ذخیره شده باشد) */
export async function saveMentor(userId: string, mentorUserId: string): Promise<SaveResult> {
  if (typeof mentorUserId !== "string" || !mentorUserId || mentorUserId.length > 64) return { ok: false, status: 404, error: "not found" };
  if (mentorUserId === userId) return { ok: false, status: 400, error: "پروفایلِ خودت را نمی‌توانی ذخیره کنی" };

  const target = await prisma.mentorProfile.findFirst({ where: { ...DISCOVERABLE_PROFILE_WHERE, userId: mentorUserId }, select: { id: true } });
  if (!target || (await usersBlockEachOther(userId, mentorUserId))) return { ok: false, status: 404, error: "not found" };

  const blocked = await blockedUserIds(userId);
  const existing = await prisma.savedMentor.findUnique({ where: { userId_mentorUserId: { userId, mentorUserId } }, select: { id: true } });
  if (existing) return { ok: true, saved: true, count: await countSavedMentors(userId, blocked) };

  if ((await countSavedMentors(userId, blocked)) >= SAVED_MENTORS_MAX) return { ok: false, status: 409, error: SAVED_LIMIT_MSG };

  let createdId: string;
  try {
    createdId = (await prisma.savedMentor.create({ data: { userId, mentorUserId }, select: { id: true } })).id;
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: true, saved: true, count: await countSavedMentors(userId, blocked) };
    throw e;
  }
  // مسابقه‌ی دو درخواستِ هم‌زمان: اگر از سقف گذشتیم، همین ذخیره برداشته می‌شود
  const count = await countSavedMentors(userId, blocked);
  if (count > SAVED_MENTORS_MAX) {
    await prisma.savedMentor.deleteMany({ where: { id: createdId, userId } });
    return { ok: false, status: 409, error: SAVED_LIMIT_MSG };
  }
  return { ok: true, saved: true, count };
}

/** برداشتن از ذخیره‌شده‌ها (بی‌اثر اگر ذخیره نبود) */
export async function unsaveMentor(userId: string, mentorUserId: string): Promise<SaveResult> {
  if (typeof mentorUserId !== "string" || !mentorUserId || mentorUserId.length > 64) return { ok: false, status: 404, error: "not found" };
  await prisma.savedMentor.deleteMany({ where: { userId, mentorUserId } });
  return { ok: true, saved: false, count: await countSavedMentors(userId) };
}

export async function isMentorSaved(userId: string, mentorUserId: string): Promise<boolean> {
  const row = await prisma.savedMentor.findUnique({ where: { userId_mentorUserId: { userId, mentorUserId } }, select: { id: true } });
  return !!row;
}

/** کارت‌های ذخیره‌شده‌ی قابلِ نمایش، تازه‌ترین ذخیره اول */
export async function loadSavedMentorCards(userId: string): Promise<MentorCard[]> {
  const blocked = await blockedUserIds(userId);
  const rows = await prisma.savedMentor.findMany({
    where: visibleSavedWhere(userId, blocked),
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: SAVED_MENTORS_MAX,
    select: { mentorUserId: true },
  });
  if (rows.length === 0) return [];
  const profiles = await prisma.mentorProfile.findMany({
    where: { ...DISCOVERABLE_PROFILE_WHERE, userId: { in: rows.map((r) => r.mentorUserId) } },
    include: MENTOR_CARD_INCLUDE,
  });
  const cards = await buildMentorCards(profiles);
  const byUser = new Map(cards.map((c) => [c.userId, c]));
  return rows.map((r) => byUser.get(r.mentorUserId)).filter((c): c is MentorCard => !!c);
}
