import crypto from "crypto";
import bcrypt from "bcryptjs";
import type { MentorProgramStatus, MentorProgramType, MentorshipStatus, Prisma, VerificationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addDaysIso, dateFromIso, feedbackAad, recomputeMentorRating, todayIsoInTz } from "@/lib/mentorServer";
import { loadMirrorOccurrences, removeProgramMirrors, writeProgramMirror } from "@/lib/mentorProgramMirror";
import { clearManageDemo, seedManageDemo } from "@/lib/demoDataManage";
import { clearToolsDemo, parseToolsDemoState, seedToolsDemo, type ToolsDemoState } from "@/lib/demoDataTools";
import { deriveChatKeys, encryptMessage, generateIdentityKeyPair, importPublicKey } from "@/lib/e2ee/core";
import { randomId } from "@/lib/e2ee/encoding";
import { encryptedMessageData } from "@/lib/mentorChatServer";
import { currentE2EKey, sealAtRest } from "@/lib/e2ee/server";
import { sealReportedText } from "@/lib/e2ee/reportServer";
import { syncProgramProgress } from "@/lib/mentorProgress";
import { mirrorOccurrenceId } from "@/lib/mentorProgressCore";
import { recomputeMentorRankings } from "@/lib/mentorRankingStats";

// داده‌ی آزمایشیِ اکوسیستمِ منتور — فقط از پنلِ Owner (/admin/demo-data).
//
// شناسه‌ی داده‌ی آزمایشی:
//   - کاربرِ آزمایشی = ایمیلِ demo+N@demo.arion.local *و* یوزرنیمِ demo_…؛ هر دو
//     شرط با هم، تا هیچ کاربرِ واقعی‌ای اتفاقی زیرِ پاک‌سازی نره.
//   - ورود ممکن نیست: رمز یک رشته‌ی تصادفیِ دورریخته‌ست و دامنه‌ی .local ایمیل
//     (OTP) دریافت نمی‌کنه.
//   - همه‌چیزِ دیگه‌ی آزمایشی به کاربرِ آزمایشی گره خورده و با حذفِ او cascade
//     می‌شه. استثناها (ردیف‌هایی که مالکشون Owner ـه) در AppSetting("demo_data")
//     ثبت می‌شن: پروفایلِ منتوریِ Owner اگه همین ابزار ساخته باشدش، و اعلان‌ها.
//     آینه‌ی برنامه در روتینِ Owner و گزارش‌های Owner علیهِ کاربرِ آزمایشی هم
//     موقعِ پاک‌سازی از روی خودِ داده پیدا و حذف می‌شن.
//
// ساختِ دوباره اول همه‌چیز رو پاک می‌کنه، پس idempotent ـه.

export const DEMO_DATA_SETTING_KEY = "demo_data";
const DEMO_EMAIL_DOMAIN = "@demo.arion.local";
const DEMO_USERNAME_PREFIX = "demo_";

export const DEMO_USER_WHERE: Prisma.UserWhereInput = {
  email: { endsWith: DEMO_EMAIL_DOMAIN },
  username: { startsWith: DEMO_USERNAME_PREFIX },
};

type DemoState = {
  seededAt: string;
  ownerId: string;
  // فقط وقتی Owner قبلا پروفایلِ منتوری نداشته و همین ابزار ساخته
  ownerProfileId: string | null;
  notificationIds: string[];
  // برچسب‌های مدیریتِ شاگرد روی پروفایلِ از قبل موجودِ Owner (lib/demoDataManage.ts)
  manageLabelIds?: string[];
  // قالب/پاسخ/هشدارِ آزمایشی روی پروفایلِ از قبل موجودِ Owner (lib/demoDataTools.ts)
  toolsDemo?: ToolsDemoState;
};

export type DemoStatus = {
  seeded: boolean;
  seededAt: string | null;
  ownerId: string | null;
  ownerProfileCreated: boolean;
  counts: { mentors: number; students: number; mentorships: number; programs: number; messages: number; reviews: number; reports: number };
};

export type SeedResult = { counts: DemoStatus["counts"]; warnings: string[] };

// ───────────────────────── وضعیت ─────────────────────────

async function readState(): Promise<DemoState | null> {
  const row = await prisma.appSetting.findUnique({ where: { key: DEMO_DATA_SETTING_KEY } });
  const v = row?.value as Partial<DemoState> | undefined;
  if (!v || typeof v !== "object" || typeof v.ownerId !== "string") return null;
  return {
    seededAt: typeof v.seededAt === "string" ? v.seededAt : "",
    ownerId: v.ownerId,
    ownerProfileId: typeof v.ownerProfileId === "string" ? v.ownerProfileId : null,
    notificationIds: Array.isArray(v.notificationIds) ? v.notificationIds.filter((x): x is string => typeof x === "string") : [],
    manageLabelIds: Array.isArray(v.manageLabelIds) ? v.manageLabelIds.filter((x): x is string => typeof x === "string") : [],
    toolsDemo: parseToolsDemoState(v.toolsDemo),
  };
}

async function demoUserIds(): Promise<string[]> {
  const rows = await prisma.user.findMany({ where: DEMO_USER_WHERE, select: { id: true } });
  return rows.map((r) => r.id);
}

async function countDemo(ids: string[]): Promise<DemoStatus["counts"]> {
  if (ids.length === 0) return { mentors: 0, students: 0, mentorships: 0, programs: 0, messages: 0, reviews: 0, reports: 0 };
  const inIds = { in: ids };
  const [mentors, mentorships, programs, messages, reviews, reports] = await Promise.all([
    prisma.mentorProfile.count({ where: { userId: inIds } }),
    prisma.mentorship.count({ where: { OR: [{ mentorId: inIds }, { studentId: inIds }] } }),
    prisma.mentorProgram.count({ where: { OR: [{ mentorId: inIds }, { studentId: inIds }] } }),
    prisma.mentorMessage.count({ where: { mentorship: { OR: [{ mentorId: inIds }, { studentId: inIds }] } } }),
    prisma.mentorReview.count({ where: { OR: [{ mentorId: inIds }, { studentId: inIds }] } }),
    prisma.mentorReport.count({ where: { OR: [{ reporterId: inIds }, { targetUserId: inIds }] } }),
  ]);
  return { mentors, students: ids.length - mentors, mentorships, programs, messages, reviews, reports };
}

export async function getDemoStatus(): Promise<DemoStatus> {
  const [state, ids] = await Promise.all([readState(), demoUserIds()]);
  return {
    seeded: ids.length > 0,
    seededAt: state?.seededAt || null,
    ownerId: state?.ownerId ?? null,
    ownerProfileCreated: !!state?.ownerProfileId,
    counts: await countDemo(ids),
  };
}

// ───────────────────────── پاک‌سازی ─────────────────────────

export async function clearDemoData(): Promise<{ deletedUsers: number }> {
  const state = await readState();
  const ids = await demoUserIds();

  if (ids.length > 0) {
    // آینه‌ی برنامه‌های منتورهای آزمایشی در روتینِ کاربرِ واقعی (Owner)
    const mirrored = await prisma.mentorProgram.findMany({
      where: { mentorId: { in: ids }, studentId: { notIn: ids } },
      select: { id: true, studentId: true },
    });
    const byStudent = new Map<string, string[]>();
    for (const p of mirrored) byStudent.set(p.studentId, [...(byStudent.get(p.studentId) ?? []), p.id]);
    for (const [studentId, programIds] of Array.from(byStudent)) {
      await removeProgramMirrors(studentId, programIds).catch(() => undefined);
      await stripDemoTicks(studentId, programIds);
    }

    // گزارش‌هایی که کاربرِ واقعی علیهِ کاربرِ آزمایشی ثبت کرده (reporter واقعیه، cascade نمی‌شه)
    await prisma.mentorReport.deleteMany({ where: { targetUserId: { in: ids } } });
  }

  // منتورهای واقعی‌ای که نظرِ شاگردِ آزمایشی دارن — امتیازشون بعد از حذف بازمحاسبه می‌شه
  const reviewed = ids.length
    ? await prisma.mentorReview.findMany({ where: { studentId: { in: ids }, mentorId: { notIn: ids } }, select: { mentorId: true }, distinct: ["mentorId"] })
    : [];

  if (state) {
    if (state.notificationIds.length) await prisma.inAppNotification.deleteMany({ where: { id: { in: state.notificationIds }, userId: state.ownerId } });
    if (state.ownerProfileId) await prisma.mentorProfile.deleteMany({ where: { id: state.ownerProfileId, userId: state.ownerId } });
    else await clearManageDemo(prisma, state.ownerId, state.manageLabelIds ?? []);
    if (!state.ownerProfileId && state.toolsDemo) await clearToolsDemo(prisma, state.ownerId, state.toolsDemo);
  }

  const res = await prisma.user.deleteMany({ where: DEMO_USER_WHERE });
  for (const r of reviewed) await recomputeMentorRating(r.mentorId);
  // امتیازِ منتورهای واقعی که شاگردِ آزمایشی داشتن (ردیف‌های آزمایشی با پروفایل cascade شدن)
  await recomputeMentorRankings().catch(() => undefined);
  await prisma.appSetting.deleteMany({ where: { key: DEMO_DATA_SETTING_KEY } });
  return { deletedUsers: res.count };
}

/**
 * تیک‌های آزمایشی (کلیدهای mp-<programId>-…) از DailyEntryِ کاربرِ واقعی (Owner)
 * برداشته می‌شن؛ تیک‌های خودِ او دست نمی‌خورن. ردیفِ روزی که فقط تیکِ آزمایشی
 * داشت و بیداری هم نداشت حذف می‌شه.
 */
async function stripDemoTicks(userId: string, programIds: string[]): Promise<void> {
  const prefixes = programIds.map((id) => `mp-${id}-`);
  const rows = await prisma.dailyEntry.findMany({ where: { userId }, select: { id: true, completedItems: true, wakeUpAt: true } });
  for (const r of rows) {
    const cur = (r.completedItems ?? {}) as Record<string, unknown>;
    const keys = Object.keys(cur);
    const kept = keys.filter((k) => !prefixes.some((p) => k.startsWith(p)));
    if (kept.length === keys.length) continue;
    if (kept.length === 0 && !r.wakeUpAt) await prisma.dailyEntry.delete({ where: { id: r.id } }).catch(() => undefined);
    else await prisma.dailyEntry.update({ where: { id: r.id }, data: { completedItems: Object.fromEntries(kept.map((k) => [k, cur[k]])) as Prisma.InputJsonValue } });
  }
}

// ───────────────────────── ساخت ─────────────────────────

// PNGِ ۱×۱ — جای مدرکِ واقعی تا صفِ احراز و نمایشگرِ مدرک چیزی برای باز کردن داشته باشن
const PLACEHOLDER_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
);
const PLACEHOLDER_SHA = crypto.createHash("sha256").update(PLACEHOLDER_PNG).digest("hex");

type Tx = Prisma.TransactionClient;

type Person = { key: string; name: string; lastName: string };

type MentorSpec = Person & {
  categories: string[];
  routineRole?: string;
  headline: string;
  bio: string;
  specialties: string[];
  identity: VerificationStatus;
  identityRejectReason?: string;
  credentials: Record<string, { status: VerificationStatus; rejectReason?: string }>;
  acceptingStudents?: boolean;
  suspendedReason?: string;
  lastActiveDaysAgo: number;
  // سنِ پروفایلِ منتوری (روز) — «منتورهای تازه» فقط پروفایلِ زیرِ ۹۰ روز؛ پیش‌فرض ۱۸۰
  profileAgeDays?: number;
};

const MENTORS: MentorSpec[] = [
  {
    key: "sara", name: "سارا", lastName: "احمدی",
    categories: ["ROUTINE"], routineRole: "استاد ریاضی",
    headline: "برنامه‌ی درسی هفتگی برای پایه‌ی دهم تا دوازدهم",
    bio: "دبیر ریاضی با دوازده سال سابقه در دبیرستان. برای هر شاگرد برنامه‌ی هفتگی تمرین و مرور می‌نویسم و هر هفته اجرای برنامه را بررسی می‌کنم.",
    specialties: ["حسابان", "هندسه", "برنامه‌ی مرور"],
    identity: "VERIFIED", credentials: { ROUTINE: { status: "VERIFIED" } },
    lastActiveDaysAgo: 0,
  },
  {
    key: "amir", name: "امیر", lastName: "رضایی",
    categories: ["FITNESS", "NUTRITION"],
    headline: "مربی بدنسازی، افزایش حجم و کاهش چربی",
    bio: "مربی بدنسازی با مدرک درجه‌ی دو فدراسیون. برنامه‌ی تمرینی را بر اساس سابقه‌ی تمرین و وقت آزاد شاگرد می‌نویسم و هر دو هفته وزنه‌ها را به‌روز می‌کنم.",
    specialties: ["هایپرتروفی", "کاهش چربی", "تمرین در خانه"],
    identity: "VERIFIED", credentials: { FITNESS: { status: "VERIFIED" }, NUTRITION: { status: "PENDING" } },
    lastActiveDaysAgo: 1,
  },
  {
    key: "negar", name: "نگار", lastName: "کریمی",
    categories: ["ROUTINE"], routineRole: "مشاور کنکور",
    headline: "برنامه‌ریزی کنکور تجربی و ریاضی",
    bio: "مشاور تحصیلی کنکور. برنامه‌ی روزانه‌ی مطالعه، آزمون و مرور را با توجه به تراز فعلی شاگرد تنظیم می‌کنم.",
    specialties: ["کنکور تجربی", "برنامه‌ی آزمون"],
    identity: "PENDING", credentials: { ROUTINE: { status: "PENDING" } },
    lastActiveDaysAgo: 2,
  },
  {
    key: "mahdi", name: "مهدی", lastName: "صادقی",
    categories: ["FITNESS"],
    headline: "تمرین قدرتی برای مبتدی‌ها",
    bio: "مربی باشگاه. برنامه‌ی سه‌روزه‌ی تمام‌بدن برای کسانی که تازه تمرین را شروع کرده‌اند.",
    specialties: ["مبتدی", "تمام‌بدن"],
    identity: "REJECTED", identityRejectReason: "تصویر کارت ملی خوانا نیست؛ عکس واضح‌تری از روی کارت بفرست.",
    credentials: { FITNESS: { status: "REJECTED", rejectReason: "مدرک ارسالی مربوط به دوره‌ی آمادگی جسمانی است، نه مربیگری بدنسازی." } },
    lastActiveDaysAgo: 5,
  },
  {
    key: "reza", name: "رضا", lastName: "نوری",
    categories: ["NUTRITION"],
    headline: "برنامه‌ی غذایی و کالری روزانه",
    bio: "کارشناس تغذیه. کالری و درشت‌مغذی‌های روزانه را با هدف شاگرد تنظیم می‌کنم.",
    specialties: ["کاهش وزن", "رژیم پرپروتئین"],
    identity: "VERIFIED", credentials: { NUTRITION: { status: "VERIFIED" } },
    suspendedReason: "سه گزارش تأییدشده درباره‌ی ارسال پیام تبلیغاتی به شاگردها.",
    lastActiveDaysAgo: 9,
  },
  {
    key: "maryam", name: "مریم", lastName: "حسینی",
    categories: ["ROUTINE", "FITNESS"], routineRole: "مربی مطالعه و برنامه‌ریزی",
    headline: "روتین روزانه‌ی مطالعه و ورزش سبک",
    bio: "برای دانشجوها روتین روزانه می‌نویسم که مطالعه، خواب و ورزش سبک را کنار هم نگه دارد. فعلا ظرفیت شاگرد جدید ندارم.",
    specialties: ["دانشجویی", "مدیریت زمان"],
    identity: "VERIFIED", credentials: { ROUTINE: { status: "VERIFIED" }, FITNESS: { status: "NOT_PROVIDED" } },
    acceptingStudents: false,
    lastActiveDaysAgo: 3,
  },
];

// منتورهای اضافه برای رتبه‌بندیِ شایستگی (lib/mentorRanking.ts):
//   پریسا — تأییدشده و تازه، بدونِ شاگرد → «منتورهای تازه»
//   کیان — چهار نظرِ ۵ستاره از رابطه‌های چندروزه و بدونِ برنامه → نظرها تأیید نمی‌شن
MENTORS.push(
  {
    key: "parisa", name: "پریسا", lastName: "مرادی",
    categories: ["FITNESS"],
    headline: "تمرین اصلاحی و تحرک برای پشت‌میزنشین‌ها",
    bio: "مربی حرکات اصلاحی. برای کسانی که بیشتر روز پشت میز هستند برنامه‌ی کوتاه روزانه‌ی تحرک و تقویت می‌نویسم.",
    specialties: ["حرکات اصلاحی", "درد کمر", "تحرک"],
    identity: "VERIFIED", credentials: { FITNESS: { status: "VERIFIED" } },
    lastActiveDaysAgo: 0, profileAgeDays: 6,
  },
  {
    key: "kian", name: "کیان", lastName: "فراهانی",
    categories: ["FITNESS"],
    headline: "برنامه‌ی کات و فرم بدن",
    bio: "مربی بدنسازی. برنامه‌ی کات و تمرین با وزنه برای آماده‌شدن در مدت کوتاه می‌نویسم.",
    specialties: ["کات", "فرم بدن"],
    identity: "VERIFIED", credentials: { FITNESS: { status: "PENDING" } },
    lastActiveDaysAgo: 1, profileAgeDays: 45,
  }
);

const STUDENTS: Person[] = [
  { key: "ali", name: "علی", lastName: "محمدی" },
  { key: "zahra", name: "زهرا", lastName: "موسوی" },
  { key: "hossein", name: "حسین", lastName: "جعفری" },
  { key: "fatemeh", name: "فاطمه", lastName: "قاسمی" },
  { key: "mohammad", name: "محمد", lastName: "کاظمی" },
  { key: "narges", name: "نرگس", lastName: "عباسی" },
  { key: "pouya", name: "پویا", lastName: "شریفی" },
  { key: "elham", name: "الهام", lastName: "رحیمی" },
  { key: "sina", name: "سینا", lastName: "اکبری" },
  { key: "mina", name: "مینا", lastName: "نظری" },
  { key: "kaveh", name: "کاوه", lastName: "یوسفی" },
  { key: "leila", name: "لیلا", lastName: "صالحی" },
];

type ItemSpec = {
  title: string;
  details?: string;
  days: number[]; // jsDay، ۰ = یکشنبه
  startTime?: string;
  durationMin?: number;
  sets?: number;
  reps?: string;
  weightKg?: number;
  restSec?: number;
};

type ProgramSpec = {
  type: MentorProgramType;
  title: string;
  description?: string;
  note?: string;
  status: MentorProgramStatus;
  startOffset?: number; // روز نسبت به امروز
  endOffset?: number;
  version?: number;
  changeRequestNote?: string;
  rejectReason?: string;
  items: ItemSpec[];
  // تیکِ روتینِ شاگرد برای روزهای گذشته (تا دیروز، یا امروز هم اگه withToday) —
  // پیشرفتِ خودکار از همین تیک‌ها ساخته می‌شه (lib/mentorProgress.ts)
  logs?: boolean;
  // یادداشتِ شاگرد برای منتور روی یک روز (offset نسبت به امروز)
  dayNotes?: { offset: number; body: string }[];
  withToday?: boolean;
  feedback?: { body: string; read: boolean }[];
};

type Rel = { id: string; mentorId: string; studentId: string };

const SAT_TO_WED = [6, 0, 1, 2, 3]; // شنبه تا چهارشنبه
const EVEN_DAYS = [6, 1, 3]; // شنبه، دوشنبه، چهارشنبه
const ODD_DAYS = [0, 2, 4]; // یکشنبه، سه‌شنبه، پنجشنبه
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const ROUTINE_ITEMS: ItemSpec[] = [
  { title: "حل تمرین حسابان", details: "۲۰ تست از فصل مشتق، بعد تصحیح و علامت‌گذاری غلط‌ها", days: SAT_TO_WED, startTime: "16:00", durationMin: 90 },
  { title: "مرور جزوه‌ی هندسه", details: "فقط خلاصه‌ی قضیه‌ها؛ حل تمرین نه", days: [1, 3], startTime: "18:00", durationMin: 45 },
  { title: "آزمون زمان‌دار", details: "۳۰ تست در ۴۵ دقیقه، بدون ماشین‌حساب", days: [4], startTime: "10:00", durationMin: 60 },
  { title: "خواب قبل از ۲۳:۳۰", days: ALL_DAYS, startTime: "23:30" },
];

const STUDY_ITEMS: ItemSpec[] = [
  { title: "مطالعه‌ی زیست", details: "فصل ۳ و ۴؛ هر روز یک گفتار", days: SAT_TO_WED, startTime: "08:00", durationMin: 120 },
  { title: "تست شیمی", details: "۴۰ تست با تحلیل", days: EVEN_DAYS, startTime: "15:00", durationMin: 75 },
  { title: "پیاده‌روی", days: ALL_DAYS, startTime: "19:00", durationMin: 30 },
];

const WORKOUT_A: ItemSpec[] = [
  { title: "اسکوات با هالتر", days: EVEN_DAYS, sets: 4, reps: "8-10", weightKg: 60, restSec: 120 },
  { title: "پرس سینه", days: EVEN_DAYS, sets: 4, reps: "8-12", weightKg: 50, restSec: 90 },
  { title: "بارفیکس", details: "اگه کامل نمی‌شه، با کش کمکی", days: EVEN_DAYS, sets: 3, reps: "6-8", restSec: 90 },
  { title: "ددلیفت رومانیایی", days: ODD_DAYS, sets: 3, reps: "10", weightKg: 50, restSec: 120 },
  { title: "پرس سرشانه دمبل", days: ODD_DAYS, sets: 3, reps: "10-12", weightKg: 12, restSec: 60 },
  { title: "پلانک", details: "هر ست ۴۵ ثانیه", days: ODD_DAYS, sets: 3, restSec: 45 },
];

const WORKOUT_B: ItemSpec[] = [
  { title: "لانگز دمبل", days: EVEN_DAYS, sets: 3, reps: "12", weightKg: 10, restSec: 60 },
  { title: "شنا سوئدی", days: EVEN_DAYS, sets: 4, reps: "10-15", restSec: 60 },
  { title: "زیربغل دمبل تک‌دست", days: ODD_DAYS, sets: 3, reps: "10", weightKg: 14, restSec: 60 },
];

/**
 * شبه‌تصادفیِ قطعی — آیا شاگرد این آیتم را در این روز در روتینش تیک زده؟
 * حدودِ دو سوم انجام، و هر چند روز یک روزِ کاملا خالی تا «انجام‌نشده» و
 * «نیمه‌کاره»ی روز هم دیده شود.
 */
function ticked(off: number, order: number): boolean {
  if (((off % 9) + 9) % 9 === 4) return false;
  return (((off + 100) * 31 + order * 17) % 11) <= 6;
}

class Seeder {
  counts = { mentorships: 0, programs: 0, messages: 0, reviews: 0, reports: 0 };
  // studentId → (روز → completedItems) — بعد از تراکنش در DailyEntry نوشته می‌شه
  ticks = new Map<string, Map<string, Record<string, boolean>>>();
  // برنامه‌های فعال/تمام‌شده که پیشرفتشان باید از تیک‌ها همگام شود؛ mirror = فعال و باید در روتین آینه شود
  tracked: { programId: string; studentId: string; activationIso: string; mirror: boolean }[] = [];
  constructor(private tx: Tx, private today: string, private now: Date) {}

  day(offset: number): Date {
    return dateFromIso(addDaysIso(this.today, offset));
  }
  ago(days: number, minutes = 0): Date {
    return new Date(this.now.getTime() - days * 86_400_000 - minutes * 60_000);
  }

  async mentorship(
    mentorId: string,
    studentId: string,
    status: MentorshipStatus,
    opts: {
      initiatedBy?: "STUDENT" | "MENTOR"; categories?: string[]; message?: string; startedDaysAgo?: number; endedDaysAgo?: number; blockedById?: string; createdDaysAgo?: number;
      showProgress?: boolean;
    } = {}
  ): Promise<Rel> {
    const createdDaysAgo = opts.createdDaysAgo ?? (opts.startedDaysAgo !== undefined ? opts.startedDaysAgo + 1 : 1);
    const started = status === "ACTIVE" || status === "ENDED" || (status === "BLOCKED" && opts.startedDaysAgo !== undefined);
    const m = await this.tx.mentorship.create({
      data: {
        mentorId,
        studentId,
        status,
        initiatedBy: opts.initiatedBy ?? "STUDENT",
        categories: opts.categories ?? [],
        message: opts.message ?? null,
        blockedById: status === "BLOCKED" ? opts.blockedById ?? studentId : null,
        ...(opts.showProgress === false ? { showProgress: false } : {}),
        startedAt: started ? this.ago(opts.startedDaysAgo ?? 30) : null,
        endedAt: status === "ENDED" || status === "BLOCKED" ? this.ago(opts.endedDaysAgo ?? 2) : null,
        createdAt: this.ago(createdDaysAgo),
      },
      select: { id: true, mentorId: true, studentId: true },
    });
    this.counts.mentorships++;
    return m;
  }

  async program(rel: Rel, spec: ProgramSpec): Promise<string> {
    const s = spec.status;
    const start = spec.startOffset ?? 0;
    const sent = s !== "DRAFT" || !!spec.changeRequestNote;
    const responded = ["ACCEPTED", "REJECTED", "ACTIVE", "COMPLETED"].includes(s) || !!spec.changeRequestNote;
    const activated = s === "ACTIVE" || s === "COMPLETED";
    const createdAt = this.ago(Math.max(1, -start) + 3);
    const p = await this.tx.mentorProgram.create({
      data: {
        mentorshipId: rel.id,
        mentorId: rel.mentorId,
        studentId: rel.studentId,
        type: spec.type,
        title: spec.title,
        description: spec.description ?? null,
        note: spec.note ?? null,
        status: s,
        version: spec.version ?? 1,
        changeRequestNote: spec.changeRequestNote ?? null,
        rejectReason: spec.rejectReason ?? null,
        startDate: spec.startOffset !== undefined ? this.day(spec.startOffset) : null,
        endDate: spec.endOffset !== undefined ? this.day(spec.endOffset) : null,
        sentAt: sent ? this.ago(Math.max(1, -start) + 2) : null,
        respondedAt: responded ? this.ago(Math.max(1, -start) + 1) : null,
        activatedAt: activated ? (start <= 0 ? this.day(start) : this.ago(0)) : null,
        completedAt: s === "COMPLETED" ? this.day(spec.endOffset ?? -1) : null,
        cancelledAt: s === "CANCELLED" ? this.ago(2) : null,
        createdAt,
      },
      select: { id: true },
    });
    this.counts.programs++;

    const items = await this.tx.mentorProgramItem.createManyAndReturn({
      data: spec.items.map((it, order) => ({
        programId: p.id,
        order,
        title: it.title,
        details: it.details ?? null,
        repeat: it.days.length === 7 ? "DAILY" : "WEEKLY",
        days: it.days,
        startTime: it.startTime ?? null,
        durationMin: it.durationMin ?? null,
        sets: spec.type === "WORKOUT" ? it.sets ?? null : null,
        reps: spec.type === "WORKOUT" ? it.reps ?? null : null,
        weightKg: spec.type === "WORKOUT" ? it.weightKg ?? null : null,
        restSec: spec.type === "WORKOUT" ? it.restSec ?? null : null,
      })),
      select: { id: true, order: true, days: true, sets: true },
    });

    if (activated) {
      this.tracked.push({ programId: p.id, studentId: rel.studentId, activationIso: addDaysIso(this.today, Math.min(0, start)), mirror: s === "ACTIVE" });
    }
    if (spec.logs && activated) {
      const lastOffset = s === "COMPLETED" ? spec.endOffset ?? -1 : spec.withToday ? 0 : -1;
      if (!this.ticks.has(rel.studentId)) this.ticks.set(rel.studentId, new Map());
      const byDay = this.ticks.get(rel.studentId)!;
      for (let off = start; off <= lastOffset; off++) {
        const iso = addDaysIso(this.today, off);
        const jsDay = dateFromIso(iso).getUTCDay();
        for (const it of items) {
          if (!it.days.includes(jsDay) || !ticked(off, it.order)) continue;
          if (!byDay.has(iso)) byDay.set(iso, {});
          byDay.get(iso)![mirrorOccurrenceId(p.id, it.order, jsDay)] = true;
        }
      }
    }
    if (spec.dayNotes?.length && activated) {
      await this.tx.mentorProgramDayNote.createMany({
        data: spec.dayNotes.map((n) => ({ programId: p.id, studentId: rel.studentId, date: this.day(n.offset), body: n.body })),
        skipDuplicates: true,
      });
    }

    if (spec.feedback?.length) {
      await this.tx.mentorFeedback.createMany({
        data: spec.feedback.map((f, i) => ({
          programId: p.id,
          itemId: i === 0 && items[0] ? items[0].id : null,
          logId: null,
          mentorId: rel.mentorId,
          studentId: rel.studentId,
          body: sealAtRest(f.body, feedbackAad(p.id, rel.mentorId)),
          readAt: f.read ? this.ago(0, 60) : null,
          createdAt: this.ago(0, 120 + (spec.feedback!.length - i) * 300),
        })),
      });
    }
    return p.id;
  }

  // ── رمزگذاریِ سرتاسریِ پیام‌های آزمایشی (docs/mentor-e2ee.md) ──
  // کاربرِ آزمایشی کلیدِ واقعیِ P-256 می‌گیرد که همین‌جا ساخته و بعد از ساخت دور
  // ریخته می‌شود (پشتیبان ندارد؛ کسی هم با این کاربرها وارد نمی‌شود). گفت‌وگوی
  // دو کاربرِ آزمایشی برای هیچ‌کس — حتی Owner — خواندنی نیست، همان‌طور که باید.
  // گفت‌وگو با Owner: اگر Owner کلید دارد، به کلیدِ عمومیِ او رمز می‌شود؛ وگرنه خالی می‌ماند.
  demoKeys = new Map<string, { version: number; publicB64: string; privateKey: CryptoKey; publicKey: CryptoKey }>();
  ownerKey: { userId: string; version: number; publicKey: CryptoKey } | null = null;
  skippedOwnerThreads = 0;

  private async demoKey(userId: string) {
    let k = this.demoKeys.get(userId);
    if (!k) {
      const kp = await generateIdentityKeyPair();
      await this.tx.userE2EKey.create({ data: { userId, version: 1, publicKey: kp.publicB64 } });
      k = { version: 1, publicB64: kp.publicB64, privateKey: kp.privateKey, publicKey: kp.publicKey };
      this.demoKeys.set(userId, k);
    }
    return k;
  }

  /**
   * پیام‌ها به‌ترتیبِ زمان؛ true = از طرفِ منتور. پیام‌های آخرِ «unreadTail» خوانده‌نشده می‌مونن.
   * خروجی: متن و clientIdِ هر پیام (برای ساختِ گزارشِ تأییدشده).
   */
  async messages(rel: Rel, lines: [boolean, string][], unreadTail = 0): Promise<{ clientId: string; senderId: string; text: string }[]> {
    const ownerSide = this.ownerKey && (rel.mentorId === this.ownerKey.userId || rel.studentId === this.ownerKey.userId) ? this.ownerKey : null;
    const involvesOwner = !this.isDemo(rel.mentorId) || !this.isDemo(rel.studentId);
    if (involvesOwner && !ownerSide) {
      this.skippedOwnerThreads++;
      return [];
    }
    // یک طرف همیشه کاربرِ آزمایشی است و کلیدِ خصوصی‌اش را داریم
    const demoId = this.isDemo(rel.mentorId) ? rel.mentorId : rel.studentId;
    const otherId = demoId === rel.mentorId ? rel.studentId : rel.mentorId;
    const mine = await this.demoKey(demoId);
    const other = ownerSide && otherId === ownerSide.userId ? ownerSide : await this.demoKey(otherId);
    const mentorV = rel.mentorId === demoId ? mine.version : other.version;
    const studentV = rel.studentId === demoId ? mine.version : other.version;
    const keys = await deriveChatKeys(mine.privateKey, other.publicKey, {
      mentorshipId: rel.id, mentorId: rel.mentorId, studentId: rel.studentId, mentorKeyVersion: mentorV, studentKeyVersion: studentV,
    });

    const n = lines.length;
    const out: { clientId: string; senderId: string; text: string }[] = [];
    const data: Prisma.MentorMessageCreateManyInput[] = [];
    for (let i = 0; i < n; i++) {
      const [fromMentor, text] = lines[i];
      const senderId = fromMentor ? rel.mentorId : rel.studentId;
      const clientId = randomId();
      const enc = await encryptMessage(fromMentor ? keys.fromMentor : keys.fromStudent, text, {
        mentorshipId: rel.id, senderId, clientId,
        senderKeyVersion: fromMentor ? mentorV : studentV,
        recipientKeyVersion: fromMentor ? studentV : mentorV,
      });
      const createdAt = this.ago(0, (n - i) * 47 + 30);
      data.push({ ...encryptedMessageData(rel, senderId, enc, createdAt), readAt: i >= n - unreadTail ? null : this.ago(0, (n - i) * 47) });
      out.push({ clientId, senderId, text });
    }
    await this.tx.mentorMessage.createMany({ data });
    this.counts.messages += n;
    return out;
  }

  demoIds = new Set<string>();
  private isDemo(userId: string): boolean {
    return this.demoIds.has(userId);
  }

  async review(rel: Rel, rating: number, body: string, hiddenReason?: string) {
    await this.tx.mentorReview.create({
      data: {
        mentorId: rel.mentorId,
        studentId: rel.studentId,
        mentorshipId: rel.id,
        rating,
        body,
        status: hiddenReason ? "HIDDEN" : "VISIBLE",
        hiddenReason: hiddenReason ?? null,
        createdAt: this.ago(4),
      },
    });
    this.counts.reviews++;
  }
}

async function createDemoUsers(tx: Tx, passwordHash: string) {
  const all = [...MENTORS, ...STUDENTS];
  const ids = new Map<string, string>();
  for (let i = 0; i < all.length; i++) {
    const p = all[i];
    const u = await tx.user.create({
      data: {
        email: `demo+${i + 1}${DEMO_EMAIL_DOMAIN}`,
        username: `${DEMO_USERNAME_PREFIX}${p.key}`,
        passwordHash,
        name: p.name,
        lastName: p.lastName,
        market: "IRAN",
        // در جست‌وجوی دوستان دیده نشن؛ کشفِ منتور از MentorProfile.published می‌خونه
        discoverable: false,
        createdAt: new Date(Date.now() - (60 - i) * 86_400_000),
      },
      select: { id: true },
    });
    ids.set(p.key, u.id);
  }
  return ids;
}

async function createMentorProfile(tx: Tx, userId: string, m: MentorSpec, ownerId: string, now: Date) {
  const profile = await tx.mentorProfile.create({
    data: {
      userId,
      headline: m.headline,
      bio: m.bio,
      specialties: m.specialties,
      categories: m.categories,
      routineRole: m.categories.includes("ROUTINE") ? m.routineRole ?? null : null,
      published: true,
      acceptingStudents: m.acceptingStudents ?? true,
      identityStatus: m.identity,
      identityRejectReason: m.identityRejectReason ?? null,
      identityReviewedAt: m.identity === "VERIFIED" || m.identity === "REJECTED" ? new Date(now.getTime() - 20 * 86_400_000) : null,
      suspendedAt: m.suspendedReason ? new Date(now.getTime() - 86_400_000) : null,
      suspendedReason: m.suspendedReason ?? null,
      lastActiveAt: new Date(now.getTime() - m.lastActiveDaysAgo * 86_400_000),
      createdAt: new Date(now.getTime() - (m.profileAgeDays ?? 180) * 86_400_000),
    },
    select: { id: true },
  });

  const doc = (kind: "IDENTITY" | "CERTIFICATE", category: string | null, fileName: string) => ({
    profileId: profile.id,
    kind,
    category,
    fileName,
    mimeType: "image/png",
    sizeBytes: PLACEHOLDER_PNG.length,
    sha256: PLACEHOLDER_SHA,
    data: PLACEHOLDER_PNG,
  });
  const docs = [];
  const events: Prisma.MentorVerificationEventCreateManyInput[] = [];
  if (m.identity !== "NOT_PROVIDED") {
    docs.push(doc("IDENTITY", null, "national-card.png"));
    if (m.identity !== "PENDING") {
      events.push({ profileId: profile.id, kind: "IDENTITY", fromStatus: "PENDING", toStatus: m.identity, reason: m.identityRejectReason ?? null, actorUserId: ownerId });
    }
  }
  for (const [category, c] of Object.entries(m.credentials)) {
    await tx.mentorCredential.create({
      data: { profileId: profile.id, category, status: c.status, rejectReason: c.rejectReason ?? null, reviewedAt: c.status === "VERIFIED" || c.status === "REJECTED" ? now : null },
    });
    if (c.status !== "NOT_PROVIDED") docs.push(doc("CERTIFICATE", category, `certificate-${category.toLowerCase()}.png`));
    if (c.status === "VERIFIED" || c.status === "REJECTED") {
      events.push({ profileId: profile.id, kind: "CERTIFICATE", category, fromStatus: "PENDING", toStatus: c.status, reason: c.rejectReason ?? null, actorUserId: ownerId });
    }
  }
  if (docs.length) await tx.mentorDocument.createMany({ data: docs });
  if (events.length) await tx.mentorVerificationEvent.createMany({ data: events });
}


/**
 * همه‌چیزِ قبلی رو پاک می‌کنه و دیتاستِ کامل رو می‌سازه. ownerId = Ownerی که
 * دکمه رو زده؛ به‌عنوانِ شاگرد و منتور وارد داده می‌شه تا از حسابِ خودش تست کنه.
 */
export async function seedDemoData(ownerId: string): Promise<SeedResult> {
  await clearDemoData();
  const warnings: string[] = [];

  const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { timezone: true, mentorProfile: { select: { id: true, categories: true } } } });
  if (!owner) throw new Error("owner not found");
  const today = todayIsoInTz(owner.timezone);
  const now = new Date();
  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);

  // حوزه‌های منتوریِ Owner: پروفایلِ موجود دست نمی‌خوره؛ نبود → با ROUTINE+FITNESS ساخته می‌شه
  const ownerCats = owner.mentorProfile ? owner.mentorProfile.categories : ["ROUTINE", "FITNESS"];
  const ownerRoutineOk = ownerCats.length === 0 || ownerCats.includes("ROUTINE");
  const ownerWorkoutOk = ownerCats.length === 0 || ownerCats.includes("FITNESS");
  const ownerRelCats = ownerCats.filter((c) => c === "ROUTINE" || c === "FITNESS" || c === "NUTRITION");

  // کلیدِ رمزگذاریِ Owner (اگر فعال کرده) — گفت‌وگوهای او با کاربرانِ آزمایشی به همین کلید رمز می‌شوند
  const ownerCur = await currentE2EKey(ownerId);
  const ownerE2E = ownerCur ? { userId: ownerId, version: ownerCur.version, publicKey: await importPublicKey(ownerCur.publicKey) } : null;
  let skippedOwnerThreads = 0;

  let tickPlan = new Map<string, Map<string, Record<string, boolean>>>();
  let tracked: Seeder["tracked"] = [];
  let ownerProfileId: string | null = null;
  let notificationIds: string[] = [];
  let manageLabelIds: string[] = [];
  let toolsDemo: ToolsDemoState | undefined;

  const counts = await prisma.$transaction(
    async (tx) => {
      const S = new Seeder(tx, today, now);
      const u = await createDemoUsers(tx, passwordHash);
      const id = (k: string) => u.get(k)!;
      for (const v of Array.from(u.values())) S.demoIds.add(v);
      S.ownerKey = ownerE2E;
      for (const m of MENTORS) await createMentorProfile(tx, id(m.key), m, ownerId, now);

      // ── سارا (ROUTINE، استاد ریاضی) ──
      const saraAli = await S.mentorship(id("sara"), id("ali"), "ACTIVE", { categories: ["ROUTINE"], startedDaysAgo: 40, message: "برای کنکور ریاضی برنامه‌ی هفتگی می‌خوام." });
      await S.program(saraAli, {
        type: "ROUTINE", title: "برنامه‌ی هفتگی ریاضی — مهر", status: "ACTIVE", startOffset: -18, endOffset: 12,
        description: "تمرکز روی مشتق و هندسه‌ی تحلیلی تا آزمون آبان.",
        note: "اگه تست‌های مشتق زیر ۶۰ درصد شد، جمعه یک جلسه‌ی مرور اضافه کن و بهم خبر بده.",
        items: ROUTINE_ITEMS, logs: true,
        dayNotes: [{ offset: -2, body: "مدرسه کلاس جبرانی گذاشت؛ حل تمرین نصفه ماند." }],
        feedback: [{ body: "آزمون پنجشنبه خوب بود؛ سرعتت از هفته‌ی قبل بهتره.", read: true }, { body: "مرور هندسه دو بار جا افتاده، این هفته حتما انجامش بده.", read: false }],
      });
      await S.program(saraAli, {
        type: "ROUTINE", title: "برنامه‌ی تابستان", status: "COMPLETED", startOffset: -40, endOffset: -20,
        note: "این برنامه تموم شد؛ نتیجه‌اش رو توی برنامه‌ی مهر لحاظ کردم.", items: ROUTINE_ITEMS.slice(0, 2), logs: true,
      });
      await S.messages(saraAli, [
        [false, "سلام، تست‌های مشتق این هفته سخت بود."],
        [true, "سلام. کدوم بخشش؟ مشتق ضمنی یا کاربرد مشتق؟"],
        [false, "کاربرد مشتق، مخصوصا بهینه‌سازی."],
        [true, "باشه، توی برنامه‌ی هفته‌ی بعد یک جلسه‌ی جدا براش می‌ذارم."],
      ], 1);
      await S.review(saraAli, 4, "برنامه‌ها دقیق و قابل‌اجراست. جواب پیام‌ها گاهی یک روز طول می‌کشه.");

      const saraZahra = await S.mentorship(id("sara"), id("zahra"), "ACTIVE", { categories: ["ROUTINE"], startedDaysAgo: 12 });
      await S.program(saraZahra, {
        type: "ROUTINE", title: "برنامه‌ی جبرانی فصل ۲", status: "PENDING", startOffset: 2, endOffset: 30,
        note: "قبل از شروع، جزوه‌ی فصل ۲ رو کامل داشته باش.", items: ROUTINE_ITEMS.slice(0, 3),
      });
      await S.program(saraZahra, {
        type: "ROUTINE", title: "برنامه‌ی آزمون میان‌ترم", status: "DRAFT", version: 2, startOffset: 5, endOffset: 20,
        changeRequestNote: "روزهای سه‌شنبه کلاس زبان دارم؛ لطفا تمرین‌های سه‌شنبه رو بذار روز دیگه.",
        note: "نسخه‌ی دوم؛ روزها طبق درخواستت عوض می‌شه.", items: ROUTINE_ITEMS.slice(0, 2),
      });

      await S.mentorship(id("sara"), id("hossein"), "PENDING", { categories: ["ROUTINE"], message: "پایه‌ی یازدهم هستم و توی حسابان ضعیفم. امکانش هست شاگردتون بشم؟", createdDaysAgo: 1 });

      const saraFatemeh = await S.mentorship(id("sara"), id("fatemeh"), "ENDED", { categories: ["ROUTINE"], startedDaysAgo: 90, endedDaysAgo: 20 });
      await S.program(saraFatemeh, { type: "ROUTINE", title: "آمادگی امتحان نهایی", status: "COMPLETED", startOffset: -80, endOffset: -25, items: ROUTINE_ITEMS.slice(0, 2), logs: true });
      await S.review(saraFatemeh, 5, "نمره‌ی نهایی ریاضی‌ام از ۱۴ به ۱۸ رسید.");

      // ── امیر (FITNESS + NUTRITION) ──
      const amirMohammad = await S.mentorship(id("amir"), id("mohammad"), "ACTIVE", { categories: ["FITNESS"], startedDaysAgo: 30 });
      await S.program(amirMohammad, {
        type: "WORKOUT", title: "حجم — دوره‌ی اول", status: "ACTIVE", startOffset: -21, endOffset: 35,
        description: "شش روز در هفته، دو الگوی تمرینی یک‌روز‌درمیان.",
        note: "وزنه‌ها رو فقط وقتی بالا ببر که همه‌ی ست‌ها رو با فرم درست کامل کردی.",
        items: WORKOUT_A, logs: true, withToday: true,
        dayNotes: [{ offset: -1, body: "زانو کمی درد داشت؛ اسکوات را سبک‌تر زدم." }],
        feedback: [{ body: "اسکوات این هفته عالی بود؛ هفته‌ی بعد ۶۲٫۵ کیلو.", read: false }],
      });
      await S.program(amirMohammad, {
        type: "WORKOUT", title: "حجم — دوره‌ی دوم", status: "ACCEPTED", startOffset: 36, endOffset: 80,
        note: "بعد از دوره‌ی اول خودکار شروع می‌شه.", items: WORKOUT_B,
      });
      await S.review(amirMohammad, 5, "برنامه‌ها با وقت آزادم جور بود و وزنه‌ها منطقی بالا رفت.");
      await S.messages(amirMohammad, [
        [false, "زانوم موقع اسکوات کمی درد می‌گیره."],
        [true, "عمق رو تا موازی کم کن و گرم‌کردن رو ده دقیقه کن. اگه ادامه داشت خبر بده."],
      ]);

      await S.mentorship(id("amir"), id("narges"), "PENDING", { initiatedBy: "MENTOR", categories: ["FITNESS"], message: "برنامه‌ی کاهش چربی‌ات رو دیدم؛ اگه بخوای برات برنامه‌ی تمرینی می‌نویسم.", createdDaysAgo: 2 });
      await S.mentorship(id("amir"), id("pouya"), "REJECTED", { categories: ["FITNESS"], message: "برای مسابقه آماده می‌شم.", createdDaysAgo: 10 });

      const amirAli = await S.mentorship(id("amir"), id("ali"), "ACTIVE", { categories: ["FITNESS", "NUTRITION"], startedDaysAgo: 15 });
      await S.program(amirAli, {
        type: "WORKOUT", title: "تمرین خانگی", status: "REJECTED", startOffset: -5, endOffset: 25,
        rejectReason: "دمبل ندارم؛ برنامه‌ی بدون وسیله می‌خوام.", items: WORKOUT_B,
      });
      await S.program(amirAli, { type: "WORKOUT", title: "تمام‌بدن سه‌روزه", status: "CANCELLED", startOffset: -12, endOffset: 20, note: "به‌خاطر امتحانات لغو شد.", items: WORKOUT_A.slice(0, 3) });

      // ── نگار (ROUTINE، در صفِ احراز) ──
      await S.mentorship(id("negar"), id("mohammad"), "PENDING", { categories: ["ROUTINE"], message: "کنکور تجربی ۱۴۰۶ دارم.", createdDaysAgo: 3 });

      // ── رضا (NUTRITION، معلق) ──
      const rezaNarges = await S.mentorship(id("reza"), id("narges"), "ACTIVE", { categories: ["NUTRITION"], startedDaysAgo: 25 });
      const rezaLines = await S.messages(rezaNarges, [
        [true, "برای برنامه‌ی ویژه‌ی کاهش وزن، پکیج مکمل رو از پیج من بخر."],
        [false, "من فقط برنامه‌ی غذایی می‌خواستم."],
      ]);
      await S.review(rezaNarges, 1, "به‌جای برنامه، مدام مکمل پیشنهاد می‌داد.");

      // ── مریم (ROUTINE + FITNESS، ظرفیت پر) ──
      await S.mentorship(id("maryam"), id("elham"), "BLOCKED", { categories: ["ROUTINE"], startedDaysAgo: 30, endedDaysAgo: 6, blockedById: id("elham") });
      const maryamZahra = await S.mentorship(id("maryam"), id("zahra"), "ENDED", { categories: ["ROUTINE", "FITNESS"], startedDaysAgo: 70, endedDaysAgo: 15 });
      await S.program(maryamZahra, { type: "ROUTINE", title: "روتین ترم بهار", status: "COMPLETED", startOffset: -65, endOffset: -18, items: STUDY_ITEMS, logs: true });
      await S.review(maryamZahra, 2, "شماره‌ی تلفنش رو بده تا بیرون از اپ هماهنگ کنیم.", "شامل اطلاعات تماس شخصی");

      // ── رتبه‌بندیِ شایستگی: شاگردهای بیشترِ امیر و نظرهای تأییدنشده‌ی کیان ──
      const amirSina = await S.mentorship(id("amir"), id("sina"), "ACTIVE", { categories: ["FITNESS"], startedDaysAgo: 60 });
      await S.program(amirSina, { type: "WORKOUT", title: "آمادگی پایه", status: "COMPLETED", startOffset: -55, endOffset: -25, items: WORKOUT_B, logs: true });
      await S.program(amirSina, { type: "WORKOUT", title: "قدرت — دوره‌ی اول", status: "ACTIVE", startOffset: -20, endOffset: 30, items: WORKOUT_A, logs: true });
      await S.review(amirSina, 4, "برنامه‌ی اول را کامل انجام دادم و دوره‌ی دوم را شروع کردم.");
      const amirMina = await S.mentorship(id("amir"), id("mina"), "ACTIVE", { categories: ["FITNESS"], startedDaysAgo: 35 });
      await S.program(amirMina, { type: "WORKOUT", title: "تمام‌بدن سه‌روزه", status: "ACTIVE", startOffset: -28, endOffset: 20, items: WORKOUT_B, logs: true });
      const saraKaveh = await S.mentorship(id("sara"), id("kaveh"), "ACTIVE", { categories: ["ROUTINE"], startedDaysAgo: 50 });
      await S.program(saraKaveh, { type: "ROUTINE", title: "برنامه‌ی جمع‌بندی شهریور", status: "COMPLETED", startOffset: -45, endOffset: -15, items: ROUTINE_ITEMS.slice(0, 3), logs: true });
      await S.review(saraKaveh, 5, "هر هفته برنامه را با نتیجه‌ی آزمون تنظیم می‌کرد.");
      for (const k of ["kaveh", "leila", "hossein", "elham"]) {
        const r = await S.mentorship(id("kian"), id(k), "ACTIVE", { categories: ["FITNESS"], startedDaysAgo: 5 });
        await S.review(r, 5, "عالی بود.");
      }

      // ── گزارش‌ها ──
      // گزارشِ پیام همان مدرکی را دارد که مسیرِ واقعی بعد از تأییدِ فرانکینگ ذخیره می‌کند
      const rezaLine = rezaLines.find((l) => l.senderId === id("reza"));
      const rezaMsg = rezaLine
        ? await tx.mentorMessage.findFirst({ where: { mentorshipId: rezaNarges.id, clientId: rezaLine.clientId }, select: { id: true, createdAt: true } })
        : null;
      await tx.mentorReport.createMany({
        data: [
          { reporterId: id("narges"), targetType: "USER", targetId: id("reza"), targetUserId: id("reza"), reason: "اسپم یا تبلیغ", details: "پیام تبلیغ مکمل می‌فرسته.", createdAt: S.ago(3) },
          ...(rezaMsg && rezaLine
            ? [{
                reporterId: id("narges"), targetType: "MESSAGE" as const, targetId: rezaMsg.id, targetUserId: id("reza"), reason: "درخواستِ پرداخت/ارتباط خارج از آریون", details: null, createdAt: S.ago(3, 10),
                reportedText: sealReportedText(rezaLine.text, rezaMsg.id, id("narges")), reportedMessageAt: rezaMsg.createdAt, reportVerified: true,
              }]
            : []),
          {
            reporterId: id("elham"), targetType: "USER", targetId: id("maryam"), targetUserId: id("maryam"), reason: "رفتارِ نامناسب یا توهین‌آمیز", details: "پیام‌های خارج از برنامه می‌فرستاد.",
            status: "RESOLVED", resolution: "پیام‌ها بررسی شد؛ به منتور تذکر داده شد.", resolvedById: ownerId, resolvedAt: S.ago(5), createdAt: S.ago(6),
          },
          {
            reporterId: id("pouya"), targetType: "USER", targetId: id("amir"), targetUserId: id("amir"), reason: "سایر", details: "درخواستم رد شد.",
            status: "DISMISSED", resolution: "رد درخواست حق منتوره؛ تخلفی نیست.", resolvedById: ownerId, resolvedAt: S.ago(8), createdAt: S.ago(9),
          },
        ],
      });
      S.counts.reports += rezaMsg ? 4 : 3;

      // ── Owner به‌عنوانِ شاگرد ──
      const saraOwner = await S.mentorship(id("sara"), ownerId, "ACTIVE", { categories: ["ROUTINE"], startedDaysAgo: 10 });
      const ownerActive = await S.program(saraOwner, {
        type: "ROUTINE", title: "برنامه‌ی مرور هفتگی", status: "ACTIVE", startOffset: -7, endOffset: 21,
        description: "برنامه‌ی آزمایشی برای تست بخش شاگرد.",
        note: "هر روز آیتم‌ها رو در روتینت تیک بزن تا گزارش هفتگی دقیق باشه.",
        items: ROUTINE_ITEMS, logs: true,
        feedback: [{ body: "دو روز اول رو کامل انجام دادی. ادامه بده.", read: true }, { body: "آزمون پنجشنبه تیک نخورده؛ اگه انجامش دادی در روتینت تیکش بزن.", read: false }],
      });
      const ownerPending = await S.program(saraOwner, {
        type: "ROUTINE", title: "برنامه‌ی آمادگی آزمون آبان", status: "PENDING", startOffset: 22, endOffset: 50,
        note: "بعد از تموم‌شدن برنامه‌ی فعلی شروع می‌شه. اگه روزی جور نیست، «درخواست تغییر» بزن.", items: STUDY_ITEMS,
      });
      await S.messages(saraOwner, [
        [true, "سلام، برنامه‌ی این هفته فعال شد."],
        [false, "ممنون. ساعت ۱۶ برای حل تمرین مناسبه."],
        [true, "عالی. برنامه‌ی آزمون آبان رو هم فرستادم؛ نگاهش کن."],
        [true, "اگه سؤالی بود همین‌جا بپرس."],
      ], 2);

      await S.mentorship(id("amir"), ownerId, "PENDING", { initiatedBy: "MENTOR", categories: ["FITNESS"], message: "یک برنامه‌ی تمرینی سه‌روزه برات دارم؛ اگه قبول کنی می‌فرستم.", createdDaysAgo: 1 });

      // ── Owner به‌عنوانِ منتور ──
      if (!owner.mentorProfile) {
        const p = await tx.mentorProfile.create({
          data: {
            userId: ownerId,
            headline: "پروفایل منتوری آزمایشی",
            bio: "این پروفایل را ابزار داده‌ی آزمایشی ساخته و با حذف داده‌ی آزمایشی پاک می‌شود.",
            categories: ["ROUTINE", "FITNESS"],
            routineRole: "مشاور برنامه‌ریزی",
            specialties: ["تست"],
            published: true,
            lastActiveAt: now,
          },
          select: { id: true },
        });
        await tx.mentorCredential.createMany({ data: [{ profileId: p.id, category: "ROUTINE" }, { profileId: p.id, category: "FITNESS" }] });
        ownerProfileId = p.id;
      }

      const pType: MentorProgramType | null = ownerRoutineOk ? "ROUTINE" : ownerWorkoutOk ? "WORKOUT" : null;
      const pItems = (t: MentorProgramType) => (t === "ROUTINE" ? STUDY_ITEMS : WORKOUT_A);

      await S.mentorship(ownerId, id("hossein"), "PENDING", { categories: ownerRelCats, message: "سلام، برای برنامه‌ی روزانه‌ی درس کمک می‌خوام.", createdDaysAgo: 0 });

      const ownerFatemeh = await S.mentorship(ownerId, id("fatemeh"), "ACTIVE", { categories: ownerRelCats, startedDaysAgo: 20 });
      if (pType) {
        await S.program(ownerFatemeh, {
          type: pType, title: pType === "ROUTINE" ? "روتین مطالعه‌ی روزانه" : "تمرین شش‌روزه", status: "ACTIVE", startOffset: -14, endOffset: 16,
          note: "برای روزهایی که انجام نشد، یادداشت روز بنویس.", items: pItems(pType), logs: true, withToday: true,
          feedback: [{ body: "هفته‌ی اول منظم بود.", read: true }],
        });
      }
      await S.messages(ownerFatemeh, [
        [false, "سلام، برنامه‌ی این هفته رو شروع کردم."],
        [true, "سلام. تیک روزانه یادت نره."],
        [false, "دیروز نتونستم تست شیمی رو کامل کنم؛ نصفش رو زدم."],
      ], 1);
      await S.review(ownerFatemeh, 5, "برنامه واضح بود و پیگیری منظم.");

      const ownerPouya = await S.mentorship(ownerId, id("pouya"), "ACTIVE", { categories: ownerRelCats, startedDaysAgo: 8 });
      if (pType) {
        await S.program(ownerPouya, {
          type: pType, title: "برنامه‌ی اصلاح‌شده", status: "DRAFT", version: 2, startOffset: 3, endOffset: 30,
          changeRequestNote: "صبح‌ها کار می‌کنم؛ همه‌ی آیتم‌ها رو بعد از ساعت ۱۷ بذار.", items: pItems(pType).slice(0, 2),
        });
        await S.program(ownerPouya, { type: pType, title: "برنامه‌ی هفته‌ی اول", status: "PENDING", startOffset: 1, endOffset: 7, note: "یک هفته‌ی آزمایشی.", items: pItems(pType).slice(0, 2) });
        await S.program(ownerPouya, { type: pType, title: "برنامه‌ی پیش‌نویس", status: "DRAFT", startOffset: 10, endOffset: 40, items: pItems(pType).slice(0, 1) });
      }

      // الهام «نمایش پیشرفت» را برای Owner بسته — نمای مخفیِ پیشرفت را نشان می‌دهد
      const ownerElham = await S.mentorship(ownerId, id("elham"), "ACTIVE", { categories: ownerRelCats, startedDaysAgo: 45, showProgress: false });
      if (pType) {
        await S.program(ownerElham, { type: pType, title: "برنامه‌ی ماه قبل", status: "COMPLETED", startOffset: -40, endOffset: -12, items: pItems(pType), logs: true });
        await S.program(ownerElham, { type: pType, title: "برنامه‌ی فشرده", status: "CANCELLED", startOffset: -10, endOffset: 10, note: "به درخواست شاگرد لغو شد.", items: pItems(pType).slice(0, 2) });
      }

      // اعلان‌های Owner — تا بخشِ اعلان هم چیزی برای نمایش داشته باشه
      const notes = await tx.inAppNotification.createManyAndReturn({
        data: [
          { userId: ownerId, type: "mentor.request", title: "درخواست شاگردی جدید", body: "حسین جعفری درخواست شاگردی فرستاده.", url: "/mentor", createdAt: S.ago(0, 20) },
          { userId: ownerId, type: "mentor.invite", title: "دعوت منتور", body: "امیر رضایی شما را به‌عنوان شاگرد دعوت کرده.", url: "/mentorship", createdAt: S.ago(1) },
          { userId: ownerId, type: "program.new", title: "برنامه‌ی جدید", body: "سارا احمدی «برنامه‌ی آمادگی آزمون آبان» را فرستاده.", url: `/mentor-programs/${ownerPending}`, createdAt: S.ago(0, 90) },
        ],
        select: { id: true },
      });
      notificationIds = notes.map((n) => n.id);

      tickPlan = S.ticks;
      tracked = S.tracked;
      skippedOwnerThreads = S.skippedOwnerThreads;
      // دسترس‌پذیری و مدیریتِ شاگرد (ظرفیت، عدم حضور، سؤال‌های پذیرش، برچسب، یادداشت، توقف، دلیلِ پایان)
      const manage = await seedManageDemo({ tx, id, ownerId, ownerProfileCreated: !!ownerProfileId, today, now });
      manageLabelIds = manage.ownerLabelIds;
      S.counts.mentorships += manage.addedMentorships;

      // ── ابزارهای منتور: هشدارِ پایبندی، گزارشِ هفتگی، شروعِ زمان‌بندی‌شده، قالب و پاسخِ آماده ──
      if (pType) {
        // علی: برنامه‌ی فعال که ۴ روزِ آخر هیچ تیکی ندارد → هشدارِ «۳ روز» با بازکردنِ پنل منتور
        const ownerAli = await S.mentorship(ownerId, id("ali"), "ACTIVE", { categories: ownerRelCats, startedDaysAgo: 16 });
        const aliItems = pItems(pType).slice(0, 2);
        const aliProgram = await S.program(ownerAli, {
          type: pType, title: "برنامه‌ی بازگشت به روال", status: "ACTIVE", startOffset: -12, endOffset: 16,
          note: "اگر روزی نرسیدی، همان روز خبر بده تا برنامه را سبک‌تر کنم.", items: aliItems,
        });
        if (!S.ticks.has(id("ali"))) S.ticks.set(id("ali"), new Map());
        const aliTicks = S.ticks.get(id("ali"))!;
        for (let off = -12; off <= -5; off++) {
          const iso = addDaysIso(today, off);
          const jsDay = dateFromIso(iso).getUTCDay();
          aliItems.forEach((it, order) => {
            if (!it.days.includes(jsDay)) return;
            if (!aliTicks.has(iso)) aliTicks.set(iso, {});
            aliTicks.get(iso)![mirrorOccurrenceId(aliProgram, order, jsDay)] = true;
          });
        }
        if (ownerFatemeh) {
          // دوره‌ی بعد، پذیرفته‌شده و زمان‌بندی‌شده برای روزِ بعد از پایانِ برنامه‌ی فعلی
          await S.program(ownerFatemeh, {
            type: pType, title: pType === "ROUTINE" ? "روتین مطالعه — دوره‌ی دوم" : "تمرین شش‌روزه — دوره‌ی دوم", status: "ACCEPTED", startOffset: 17, endOffset: 46,
            note: "بعد از پایان دوره‌ی اول خودکار شروع می‌شود.", items: pItems(pType),
          });
        }
        // پویا: پذیرفته‌شده با شروعِ امروز → با بازکردنِ پنل منتور خودکار فعال می‌شود (اعلانِ «شروع برنامه»)
        await S.program(ownerPouya, {
          type: pType, title: "برنامه‌ی دو هفته‌ای", status: "ACCEPTED", startOffset: 0, endOffset: 13,
          note: "از امروز شروع می‌شود.", items: pItems(pType).slice(0, 2),
        });
      }
      const ownerMentorProfileId = ownerProfileId ?? owner.mentorProfile?.id ?? null;
      if (ownerMentorProfileId) {
        toolsDemo = await seedToolsDemo({
          tx, ownerProfileId: ownerMentorProfileId, ownerProfileCreated: !!ownerProfileId, routineOk: ownerRoutineOk, workoutOk: ownerWorkoutOk, now,
        });
      }

      return S.counts;
    },
    { timeout: 60_000, maxWait: 10_000 }
  );

  // امتیازِ خلاصه از روی نظرهای VISIBLE
  const reviewedMentors = await prisma.mentorReview.findMany({
    where: { student: DEMO_USER_WHERE },
    select: { mentorId: true },
    distinct: ["mentorId"],
  });
  for (const r of reviewedMentors) await recomputeMentorRating(r.mentorId);

  // آینه‌ی برنامه‌های فعال در «روتین من»ِ شاگردها (Owner هم) — همون مسیری که فعال‌سازیِ واقعی می‌ره
  for (const m of tracked.filter((t) => t.mirror)) {
    try {
      const occ = await loadMirrorOccurrences(m.programId, m.activationIso);
      if (occ.length) await writeProgramMirror(m.studentId, m.programId, occ);
    } catch {
      warnings.push("برنامه‌ی فعال در «روتین من» نوشته نشد (سقف حجم روتین)");
    }
  }

  // تیک‌های روتین — ادغام با DailyEntryِ موجود (برای Owner تیک‌های خودش می‌مونه)
  for (const [userId, byDay] of Array.from(tickPlan)) {
    for (const [iso, items] of Array.from(byDay)) {
      const date = dateFromIso(iso);
      const cur = await prisma.dailyEntry.findUnique({ where: { userId_date: { userId, date } }, select: { completedItems: true } });
      const merged = { ...((cur?.completedItems ?? {}) as Record<string, unknown>), ...items } as Prisma.InputJsonValue;
      await prisma.dailyEntry.upsert({ where: { userId_date: { userId, date } }, create: { userId, date, completedItems: merged }, update: { completedItems: merged } });
    }
  }

  // پیشرفتِ خودکار از روی همین تیک‌ها (برنامه‌های تمام‌شده هم یک بار نهایی می‌شن)
  await syncProgramProgress(tracked.map((t) => t.programId), { force: true, finalize: true }).catch(() => {
    warnings.push("پیشرفت خودکار برنامه‌ها ساخته نشد");
  });

  // رتبه‌بندیِ شایستگی همین حالا از روی داده‌ی تازه (وگرنه تا TTL کهنه می‌موند)
  await recomputeMentorRankings().catch(() => {
    warnings.push("رتبه‌بندی منتورها بازمحاسبه نشد");
  });

  if (skippedOwnerThreads > 0) {
    warnings.push("گفت‌وگوهای حساب شما با کاربران آزمایشی خالی ساخته شد؛ پیام‌ها رمزگذاری سرتاسری دارند و حساب شما هنوز رمز گفت‌وگو ندارد. پس از فعال‌سازی در یک گفت‌وگو، داده‌ی آزمایشی را دوباره بساز");
  }

  const state: DemoState = { seededAt: now.toISOString(), ownerId, ownerProfileId, notificationIds, manageLabelIds, toolsDemo };
  await prisma.appSetting.upsert({
    where: { key: DEMO_DATA_SETTING_KEY },
    update: { value: state as unknown as Prisma.InputJsonValue },
    create: { key: DEMO_DATA_SETTING_KEY, value: state as unknown as Prisma.InputJsonValue },
  });

  return {
    counts: { mentors: MENTORS.length, students: STUDENTS.length, ...counts },
    warnings,
  };
}
