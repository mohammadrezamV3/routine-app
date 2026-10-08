import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeAvailability, type Availability, type IntakeAnswer } from "@/lib/mentorAvailability";
import { openAtRest, sealAtRest } from "@/lib/e2ee/server";

// سمت سرور گزینه‌های دسترس‌پذیری و مدیریت شاگرد. خواندن/نوشتن متن‌های
// آزاد بین دو طرف (جواب سؤال‌های پذیرش، یادداشت خصوصی، پیام خوش‌آمد)
// فقط از همین تابع‌ها می‌گذرد تا رمزنگاری سرتاسری بعدا فقط همین‌جا عوض شود.

export const AVAILABILITY_SELECT = {
  acceptingStudents: true,
  maxActiveStudents: true,
  awayUntil: true,
  awayMessage: true,
  awayPausesRequests: true,
  responseTimeHours: true,
} satisfies Prisma.MentorProfileSelect;

export type AvailabilityFields = Prisma.MentorProfileGetPayload<{ select: typeof AVAILABILITY_SELECT }>;

export async function countActiveStudents(mentorId: string): Promise<number> {
  return prisma.mentorship.count({ where: { mentorId, status: "ACTIVE" } });
}

/** «امروز» برای مقایسه‌ی تاریخ بازگشت — تهران (بازار اصلی اپ) */
export function availabilityToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function availabilityOf(p: AvailabilityFields, activeStudents: number): Availability {
  return computeAvailability(p, activeStudents, availabilityToday());
}

// ───────────────────────── سؤال‌های پذیرش ─────────────────────────

/** جایگزینی کامل جواب‌های یک رابطه (درخواست دوباره جواب‌های قبلی را پاک می‌کند) */
export async function writeIntakeAnswers(tx: Prisma.TransactionClient, mentorshipId: string, answers: IntakeAnswer[] | null): Promise<void> {
  await tx.mentorIntakeAnswer.deleteMany({ where: { mentorshipId } });
  if (answers && answers.length) {
    await tx.mentorIntakeAnswer.createMany({
      // جواب رمزشده در حال سکون (agent D — docs/mentor-e2ee.md)؛ سؤال متن عمومی خود منتور است
      data: answers.map((a, order) => ({ mentorshipId, order, question: a.question, answer: sealAtRest(a.answer, intakeAad(mentorshipId, order)) })),
    });
  }
}

export function intakeAad(mentorshipId: string, order: number): (string | number)[] {
  return ["MentorIntakeAnswer.answer", mentorshipId, order];
}

/** جواب‌ها به‌ازای هر رابطه، به‌ترتیب سؤال */
export async function readIntakeAnswers(mentorshipIds: string[]): Promise<Map<string, IntakeAnswer[]>> {
  const out = new Map<string, IntakeAnswer[]>();
  if (mentorshipIds.length === 0) return out;
  const rows = await prisma.mentorIntakeAnswer.findMany({
    where: { mentorshipId: { in: mentorshipIds } },
    orderBy: [{ mentorshipId: "asc" }, { order: "asc" }],
    select: { mentorshipId: true, order: true, question: true, answer: true },
  });
  for (const r of rows) {
    const answer = openAtRest(r.answer, intakeAad(r.mentorshipId, r.order)) ?? "";
    out.set(r.mentorshipId, [...(out.get(r.mentorshipId) ?? []), { question: r.question, answer }]);
  }
  return out;
}

// ───────────────────────── پیام خوش‌آمد ─────────────────────────

/**
 * پیام خوش‌آمد منتور (متن عمومی خود منتور، نه گفت‌وگوی خصوصی). چون
 * گفت‌وگو رمزگذاری سرتاسری دارد، سرور پیامی در گفت‌وگو نمی‌نویسد؛ این متن
 * با شروع رابطه در اعلان پذیرش به شاگرد می‌رسد و در صفحه‌ی رابطه نمایش
 * داده می‌شود (MentorshipRow.welcomeMessage).
 */
export async function readWelcomeMessage(mentorId: string): Promise<string | null> {
  try {
    const p = await prisma.mentorProfile.findUnique({ where: { userId: mentorId }, select: { welcomeMessage: true } });
    return p?.welcomeMessage?.trim() || null;
  } catch {
    return null;
  }
}

/** تا چند روز بعد از شروع رابطه پیام خوش‌آمد در صفحه‌ی رابطه دیده می‌شود */
export const WELCOME_VISIBLE_DAYS = 14;

// ───────────────────────── یادداشت خصوصی ─────────────────────────

export type StudentNoteRow = { id: string; body: string; createdAt: Date; updatedAt: Date };

export async function readStudentNotes(mentorshipId: string, mentorId: string, take = 200): Promise<StudentNoteRow[]> {
  return prisma.mentorStudentNote.findMany({
    where: { mentorshipId, mentorId },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, body: true, createdAt: true, updatedAt: true },
  });
}

export async function createStudentNote(mentorshipId: string, mentorId: string, body: string): Promise<StudentNoteRow> {
  return prisma.mentorStudentNote.create({
    data: { mentorshipId, mentorId, body },
    select: { id: true, body: true, createdAt: true, updatedAt: true },
  });
}

/** ویرایش فقط با where {id, mentorshipId, mentorId} (ضد IDOR)؛ null یعنی پیدا نشد */
export async function updateStudentNote(id: string, mentorshipId: string, mentorId: string, body: string): Promise<StudentNoteRow | null> {
  const res = await prisma.mentorStudentNote.updateMany({ where: { id, mentorshipId, mentorId }, data: { body } });
  if (res.count === 0) return null;
  return prisma.mentorStudentNote.findUnique({ where: { id }, select: { id: true, body: true, createdAt: true, updatedAt: true } });
}

export async function deleteStudentNote(id: string, mentorshipId: string, mentorId: string): Promise<boolean> {
  const res = await prisma.mentorStudentNote.deleteMany({ where: { id, mentorshipId, mentorId } });
  return res.count > 0;
}

// ───────────────────────── برچسب ─────────────────────────

export type LabelRow = { id: string; name: string };

export async function readLabels(profileId: string): Promise<LabelRow[]> {
  return prisma.mentorStudentLabel.findMany({ where: { profileId }, orderBy: { createdAt: "asc" }, select: { id: true, name: true } });
}

/** فقط idهایی که هنوز برچسب موجود همین منتورند */
export function liveLabelIds(ids: string[], labels: LabelRow[]): string[] {
  const set = new Set(labels.map((l) => l.id));
  return ids.filter((id) => set.has(id));
}
