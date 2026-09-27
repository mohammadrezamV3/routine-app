import type { Prisma, PrismaClient } from "@prisma/client";

// داده‌ی آزمایشیِ ابزارهای منتور (قالبِ برنامه، پاسخِ آماده، هشدارِ پایبندی)
// روی پروفایلِ منتوریِ Owner — جدا از lib/demoData.ts تا با حذفِ این گزینه‌ها
// فقط همین فایل و یک فراخوانی برداشته شود.
//
// اگر پروفایلِ منتوریِ Owner را خودِ ابزارِ داده‌ی آزمایشی ساخته باشد، همه‌ی
// این‌ها با حذفِ پروفایل cascade می‌شوند؛ وگرنه idها در state نگه داشته
// می‌شوند و clearToolsDemo فقط همان‌ها را برمی‌دارد (داده‌ی واقعیِ Owner دست نمی‌خورد).

export type ToolsDemoState = { templateIds: string[]; replyIds: string[]; alertSet: boolean };

type Tx = Prisma.TransactionClient;

type TplItem = { title: string; details?: string; days: number[]; startTime?: string; durationMin?: number; sets?: number; reps?: string; weightKg?: number; restSec?: number };

function items(type: "ROUTINE" | "WORKOUT", xs: TplItem[]): Prisma.InputJsonValue {
  return xs.map((it, order) => ({
    order,
    title: it.title,
    details: it.details ?? null,
    repeat: it.days.length === 7 ? "DAILY" : "WEEKLY",
    days: it.days,
    startTime: it.startTime ?? null,
    durationMin: it.durationMin ?? null,
    sets: type === "WORKOUT" ? it.sets ?? null : null,
    reps: type === "WORKOUT" ? it.reps ?? null : null,
    weightKg: type === "WORKOUT" ? it.weightKg ?? null : null,
    restSec: type === "WORKOUT" ? it.restSec ?? null : null,
  }));
}

const ALL = [0, 1, 2, 3, 4, 5, 6];

export async function seedToolsDemo(c: {
  tx: Tx;
  ownerProfileId: string;
  ownerProfileCreated: boolean;
  routineOk: boolean;
  workoutOk: boolean;
  now: Date;
}): Promise<ToolsDemoState> {
  const { tx, ownerProfileId: profileId, now } = c;
  const ago = (d: number) => new Date(now.getTime() - d * 86_400_000);

  const templates: Prisma.MentorProgramTemplateCreateManyInput[] = [];
  if (c.routineOk) {
    const study: TplItem[] = [
      { title: "مطالعه‌ی درس اصلی", details: "یک فصل؛ آخرش خلاصه‌ی یک‌صفحه‌ای", days: [6, 0, 1, 2, 3], startTime: "08:00", durationMin: 120 },
      { title: "تست زمان‌دار", details: "۳۰ تست در ۴۵ دقیقه", days: [1, 3], startTime: "16:00", durationMin: 45 },
      { title: "مرور هفتگی", days: [4], startTime: "10:00", durationMin: 60 },
      { title: "خواب قبل از ۲۳:۳۰", days: ALL, startTime: "23:30" },
    ];
    templates.push(
      {
        profileId, name: "روتین مطالعه‌ی چهار هفته‌ای", type: "ROUTINE", title: "روتین مطالعه‌ی روزانه",
        description: "پایه‌ی برنامه‌ی درسی برای شاگرد تازه.", note: "هفته‌ی اول فقط نظم خواب و ساعت شروع را جدی بگیر.",
        durationDays: 27, items: items("ROUTINE", study), itemCount: study.length, usedCount: 3, lastUsedAt: ago(4), createdAt: ago(40), updatedAt: ago(4),
      },
      {
        profileId, name: "هفته‌ی امتحان", type: "ROUTINE", title: "برنامه‌ی هفته‌ی امتحان",
        description: null, note: "روز امتحان فقط مرور سبک.",
        durationDays: 6, items: items("ROUTINE", study.slice(0, 2)), itemCount: 2, usedCount: 0, createdAt: ago(9), updatedAt: ago(9),
      },
    );
  }
  if (c.workoutOk) {
    const full: TplItem[] = [
      { title: "اسکوات با هالتر", days: [6, 1, 3], sets: 4, reps: "8-10", weightKg: 50, restSec: 120 },
      { title: "پرس سینه", days: [6, 1, 3], sets: 4, reps: "8-12", weightKg: 40, restSec: 90 },
      { title: "زیربغل سیم‌کش", days: [6, 1, 3], sets: 3, reps: "10-12", restSec: 90 },
      { title: "پلانک", details: "هر ست ۴۵ ثانیه", days: [6, 1, 3], sets: 3, restSec: 45 },
    ];
    templates.push({
      profileId, name: "تمام‌بدن سه‌روزه‌ی مبتدی", type: "WORKOUT", title: "تمام‌بدن سه‌روزه",
      description: "شنبه، دوشنبه، چهارشنبه.", note: "وزنه را فقط وقتی بالا ببر که همه‌ی ست‌ها با فرم درست کامل شد.",
      durationDays: 55, items: items("WORKOUT", full), itemCount: full.length, usedCount: 1, lastUsedAt: ago(15), createdAt: ago(30), updatedAt: ago(15),
    });
  }
  const tpl = templates.length ? await tx.mentorProgramTemplate.createManyAndReturn({ data: templates, select: { id: true } }) : [];

  const replies = await tx.mentorSavedReply.createManyAndReturn({
    data: [
      { profileId, title: "یادآوری تیک روزانه", body: "برنامه‌ی امروز را در «روتین من» تیک بزن تا پیشرفتت درست ثبت شود.", createdAt: ago(20) },
      { profileId, title: "بازبینی هفتگی", body: "گزارش این هفته را دیدم. جمعه ده دقیقه وقت بگذار و بنویس کدام آیتم سخت‌تر بود تا برنامه‌ی هفته‌ی بعد را تنظیم کنم.", createdAt: ago(18) },
      { profileId, title: "روز جاافتاده", body: "دیروز برنامه انجام نشد. اگر مانعی بوده بگو تا ساعت یا حجم آیتم‌ها را عوض کنم.", createdAt: ago(10) },
      { profileId, title: "تبریک پیوستگی", body: "یک هفته‌ی کامل بدون جاافتادن. همین ریتم را نگه دار.", createdAt: ago(3) },
    ],
    select: { id: true },
  });

  // هشدار پایبندی: پروفایلِ ساخته‌ی همین ابزار → روشن؛ پروفایلِ واقعیِ Owner → فقط اگر خاموش بوده
  let alertSet = false;
  if (c.ownerProfileCreated) {
    await tx.mentorProfile.update({ where: { id: profileId }, data: { alertMissedDays: 3 } });
  } else {
    const res = await tx.mentorProfile.updateMany({ where: { id: profileId, alertMissedDays: null }, data: { alertMissedDays: 3 } });
    alertSet = res.count > 0;
  }

  return { templateIds: tpl.map((t) => t.id), replyIds: replies.map((r) => r.id), alertSet };
}

/** برداشتنِ داده‌ی آزمایشیِ ابزارها از پروفایلِ از قبل موجودِ Owner */
export async function clearToolsDemo(db: PrismaClient, ownerId: string, s: ToolsDemoState): Promise<void> {
  const profile = await db.mentorProfile.findUnique({ where: { userId: ownerId }, select: { id: true } });
  if (!profile) return;
  if (s.templateIds.length) await db.mentorProgramTemplate.deleteMany({ where: { id: { in: s.templateIds }, profileId: profile.id } });
  if (s.replyIds.length) await db.mentorSavedReply.deleteMany({ where: { id: { in: s.replyIds }, profileId: profile.id } });
  if (s.alertSet) await db.mentorProfile.update({ where: { id: profile.id }, data: { alertMissedDays: null } });
}

export function parseToolsDemoState(v: unknown): ToolsDemoState | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const ids = (x: unknown) => (Array.isArray(x) ? x.filter((y): y is string => typeof y === "string") : []);
  return { templateIds: ids(o.templateIds), replyIds: ids(o.replyIds), alertSet: o.alertSet === true };
}
