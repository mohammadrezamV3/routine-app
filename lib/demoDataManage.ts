import type { Prisma } from "@prisma/client";
import { addDaysIso } from "@/lib/mentorServer";
import { sealAtRest } from "@/lib/e2ee/server";
import { intakeAad } from "@/lib/mentorManageServer";

// بخش «دسترس‌پذیری و مدیریت شاگرد» در داده‌ی آزمایشی (lib/demoData.ts) —
// جدا نگه داشته شده تا با حذف این گزینه‌ها فقط همین فایل و یک فراخوانی برود.
//
// همه‌چیز روی کاربرهای آزمایشی یا رابطه‌های آن‌هاست و با حذف آن‌ها cascade
// می‌شود؛ تنها استثنا برچسب‌هایی است که روی پروفایل منتوری *موجود* Owner
// ساخته می‌شوند — idشان برگردانده می‌شود تا در AppSetting ثبت و موقع
// پاک‌سازی حذف شوند. تنظیمات پروفایل موجود Owner (ظرفیت، عدم حضور، …) دست نمی‌خورد.

type Tx = Prisma.TransactionClient;

export type ManageDemoCtx = {
  tx: Tx;
  /** کلید کاربر آزمایشی (sara، ali، …) → userId */
  id: (key: string) => string;
  ownerId: string;
  /** پروفایلی که همین ابزار برای Owner ساخته؛ null یعنی پروفایل Owner از قبل بوده */
  ownerProfileCreated: boolean;
  today: string;
  now: Date;
};

const ago = (now: Date, days: number) => new Date(now.getTime() - days * 86_400_000);
const day = (today: string, offset: number) => new Date(addDaysIso(today, offset) + "T00:00:00.000Z");

async function rel(tx: Tx, mentorId: string, studentId: string) {
  return tx.mentorship.findUnique({ where: { mentorId_studentId: { mentorId, studentId } }, select: { id: true } });
}

async function answers(tx: Tx, mentorshipId: string, qa: [string, string][]) {
  // جواب رمزشده در حال سکون، مثل مسیر واقعی (writeIntakeAnswers — docs/mentor-e2ee.md)
  await tx.mentorIntakeAnswer.createMany({ data: qa.map(([question, answer], order) => ({ mentorshipId, order, question, answer: sealAtRest(answer, intakeAad(mentorshipId, order)) })) });
}

const SARA_QUESTIONS = ["پایه و رشته‌ات چیست؟", "در هفته چند ساعت برای ریاضی وقت داری؟", "نمره‌ی آخرین آزمون ریاضی‌ات چند بود؟"];
const OWNER_QUESTIONS = ["هدفت از این همکاری چیست؟", "در روز چند ساعت وقت آزاد داری؟"];

/**
 * تنظیمات و داده‌ی مدیریتی را روی دیتاست ساخته‌شده اعمال می‌کند.
 * خروجی: id برچسب‌هایی که روی پروفایل از قبل موجود Owner ساخته شد و تعداد رابطه‌های افزوده.
 */
export async function seedManageDemo(c: ManageDemoCtx): Promise<{ ownerLabelIds: string[]; addedMentorships: number }> {
  const { tx, id, ownerId, today, now } = c;

  // ── تنظیمات منتورهای آزمایشی ──
  // سارا: ظرفیت ۴ (با شاگردهای فعلی «۳ از ۴»)، سؤال‌های پذیرش، زمان پاسخ، پیام خوش‌آمد
  await tx.mentorProfile.update({
    where: { userId: id("sara") },
    data: {
      maxActiveStudents: 4,
      responseTimeHours: 24,
      intakeQuestions: SARA_QUESTIONS,
      welcomeMessage: "خوش آمدی. اول در بخش دسترسی‌ها برنامه‌ی درسی فعلی‌ات را با من به اشتراک بگذار تا برنامه‌ی هفته‌ی اول را بنویسم.",
    },
  });
  // امیر: در دسترس نیست (درخواست‌ها باز) + زمان پاسخ ۱۲ ساعت
  await tx.mentorProfile.update({
    where: { userId: id("amir") },
    data: {
      responseTimeHours: 12,
      awayUntil: day(today, 5),
      awayMessage: "در مسابقات استانی داوری می‌کنم؛ پیام‌ها را شب‌ها جواب می‌دهم.",
      awayPausesRequests: false,
      intakeQuestions: ["سابقه‌ی تمرینت چقدر است؟", "آسیب‌دیدگی یا محدودیت پزشکی داری؟"],
    },
  });
  // نگار: در دسترس نیست و درخواست‌های تازه متوقف (در فهرست: «در دسترس نیست تا …»)
  await tx.mentorProfile.update({
    where: { userId: id("negar") },
    data: { awayUntil: day(today, 12), awayMessage: "تا پایان آزمون‌های آزمایشی مهر شاگرد جدید نمی‌پذیرم.", awayPausesRequests: true, responseTimeHours: 48 },
  });
  // مهدی: ظرفیت ۱ و یک شاگرد فعال → «ظرفیت تکمیل»
  await tx.mentorProfile.update({ where: { userId: id("mahdi") }, data: { maxActiveStudents: 1, responseTimeHours: 72 } });
  await tx.mentorship.create({
    data: {
      mentorId: id("mahdi"), studentId: id("pouya"), status: "ACTIVE", initiatedBy: "STUDENT", categories: ["FITNESS"],
      startedAt: ago(now, 6), createdAt: ago(now, 7),
    },
  });
  // Owner به‌عنوان شاگرد: رابطه‌ی پایان‌یافته با دلیل
  await tx.mentorship.create({
    data: {
      mentorId: id("mahdi"), studentId: ownerId, status: "ENDED", initiatedBy: "STUDENT", categories: ["FITNESS"],
      startedAt: ago(now, 50), endedAt: ago(now, 8), createdAt: ago(now, 51),
      endReason: "دوره‌ی سه‌ماهه‌ی مبتدی تمام شد؛ برای ادامه، برنامه‌ی سطح متوسط لازم است.", endedBy: "MENTOR",
    },
  });

  // ── جواب‌های پذیرش روی درخواست‌های باز ──
  const saraHossein = await rel(tx, id("sara"), id("hossein"));
  if (saraHossein) {
    await answers(tx, saraHossein.id, [
      [SARA_QUESTIONS[0], "یازدهم ریاضی"],
      [SARA_QUESTIONS[1], "حدود 8 ساعت؛ عصرها بعد از مدرسه"],
      [SARA_QUESTIONS[2], "13 از 20 در آزمون مستمر مهر"],
    ]);
  }
  const ownerHossein = await rel(tx, ownerId, id("hossein"));
  if (ownerHossein) {
    await answers(tx, ownerHossein.id, [
      [OWNER_QUESTIONS[0], "یک برنامه‌ی روزانه که بتوانم دو ماه پشت سر هم اجرایش کنم."],
      [OWNER_QUESTIONS[1], "روزهای عادی سه ساعت، پنجشنبه‌ها بیشتر."],
    ]);
  }

  // ── پایان رابطه با دلیل (هر دو جهت) ──
  const saraFatemeh = await rel(tx, id("sara"), id("fatemeh"));
  if (saraFatemeh) await tx.mentorship.update({ where: { id: saraFatemeh.id }, data: { endReason: "امتحان نهایی تمام شد و هدف دوره به نتیجه رسید.", endedBy: "MENTOR" } });
  const maryamZahra = await rel(tx, id("maryam"), id("zahra"));
  if (maryamZahra) await tx.mentorship.update({ where: { id: maryamZahra.id }, data: { endReason: "ترم تمام شد و فعلا برنامه‌ی ورزشی نمی‌خواهم.", endedBy: "STUDENT" } });

  // ── Owner به‌عنوان منتور ──
  if (c.ownerProfileCreated) {
    await tx.mentorProfile.update({
      where: { userId: ownerId },
      data: {
        maxActiveStudents: 5,
        responseTimeHours: 24,
        intakeQuestions: OWNER_QUESTIONS,
        welcomeMessage: "سلام و خوش آمدی. برنامه‌ی هفته‌ی اول را تا دو روز دیگر می‌فرستم.",
      },
    });
  }
  const ownerProfile = await tx.mentorProfile.findUnique({ where: { userId: ownerId }, select: { id: true } });
  const ownerLabelIds: string[] = [];
  const labelId: Record<string, string> = {};
  if (ownerProfile) {
    for (const name of ["کنکور 1406", "نیاز به پیگیری", "دانشجو"]) {
      const existing = await tx.mentorStudentLabel.findUnique({ where: { profileId_name: { profileId: ownerProfile.id, name } }, select: { id: true } });
      if (existing) { labelId[name] = existing.id; continue; }
      const l = await tx.mentorStudentLabel.create({ data: { profileId: ownerProfile.id, name }, select: { id: true } });
      labelId[name] = l.id;
      if (!c.ownerProfileCreated) ownerLabelIds.push(l.id);
    }
  }

  const ownerFatemeh = await rel(tx, ownerId, id("fatemeh"));
  if (ownerFatemeh) {
    if (ownerProfile) await tx.mentorship.update({ where: { id: ownerFatemeh.id }, data: { mentorLabelIds: [labelId["کنکور 1406"]] } });
    await answers(tx, ownerFatemeh.id, [
      [OWNER_QUESTIONS[0], "برای کنکور تجربی برنامه‌ی مطالعه‌ی منظم می‌خواهم."],
      [OWNER_QUESTIONS[1], "حدود پنج ساعت."],
    ]);
    // یادداشت خصوصی سرتاسری (فقط برای کلید خود Owner) است و سرور کلید خصوصی Owner را ندارد؛
    // پس این‌ها متن ساده‌ی «قدیمی» ساخته می‌شوند و کلاینت Owner در اولین بازشدن بازرمزشان می‌کند.
    await tx.mentorStudentNote.createMany({
      data: [
        { mentorshipId: ownerFatemeh.id, mentorId: ownerId, body: "شیمی نقطه‌ضعف اصلی است؛ در برنامه‌ی بعد تست شیمی را به چهار روز برسان.", createdAt: ago(now, 6), updatedAt: ago(now, 6) },
        { mentorshipId: ownerFatemeh.id, mentorId: ownerId, body: "آزمون آزمایشی 20 مهر؛ هفته‌ی قبلش حجم مطالعه‌ی جدید را کم کن.", createdAt: ago(now, 1), updatedAt: ago(now, 1) },
      ],
    });
  }
  const ownerPouya = await rel(tx, ownerId, id("pouya"));
  if (ownerPouya) {
    if (ownerProfile) await tx.mentorship.update({ where: { id: ownerPouya.id }, data: { mentorLabelIds: [labelId["نیاز به پیگیری"], labelId["دانشجو"]] } });
    await tx.mentorStudentNote.create({
      data: { mentorshipId: ownerPouya.id, mentorId: ownerId, body: "صبح‌ها سر کار است؛ هر برنامه‌ای بعد از ساعت 17 باشد.", createdAt: ago(now, 3), updatedAt: ago(now, 3) },
    });
  }
  // توقف موقت با دلیل
  const ownerElham = await rel(tx, ownerId, id("elham"));
  if (ownerElham) {
    await tx.mentorship.update({
      where: { id: ownerElham.id },
      data: {
        pausedAt: ago(now, 4),
        pauseReason: "تا پایان امتحانات میان‌ترم برنامه‌ی تازه نمی‌فرستم.",
        ...(ownerProfile ? { mentorLabelIds: [labelId["دانشجو"]] } : {}),
      },
    });
  }

  return { ownerLabelIds, addedMentorships: 2 };
}

/** برچسب‌هایی که روی پروفایل از قبل موجود Owner ساخته شده بود */
export async function clearManageDemo(db: Pick<Tx, "mentorStudentLabel" | "mentorship">, ownerId: string, labelIds: string[]): Promise<void> {
  if (labelIds.length === 0) return;
  const tagged = await db.mentorship.findMany({ where: { mentorId: ownerId, mentorLabelIds: { hasSome: labelIds } }, select: { id: true, mentorLabelIds: true } });
  for (const m of tagged) {
    await db.mentorship.update({ where: { id: m.id }, data: { mentorLabelIds: m.mentorLabelIds.filter((x) => !labelIds.includes(x)) } });
  }
  await db.mentorStudentLabel.deleteMany({ where: { id: { in: labelIds }, profile: { userId: ownerId } } });
}
