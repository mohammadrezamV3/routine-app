import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, badRequest, conflict, touchMentorActivity } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { sanitizeCategories } from "@/lib/mentorCategories";
import { loadMentorSelf, isUniqueViolation } from "@/lib/mentorServer";
import { validateRoutineRole } from "@/lib/mentorValidate";
import { decideMentorTerms, MENTOR_TERMS_ERROR_CODE } from "@/lib/mentorTerms";

const HEADLINE_MAX = 120;
const BIO_MAX = 2000;
const SPECIALTY_MAX = 40;
const MAX_SPECIALTIES = 10;

// GET /api/mentors/me → پروفایلِ منتوریِ خودم (یا null اگه هنوز منتور نشدم)
export async function GET() {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  return NextResponse.json({ profile: await loadMentorSelf(g.userId) });
}

// PUT /api/mentors/me → ساخت (بارِ اول) یا ویرایشِ پروفایل.
// وضعیتِ احراز/تعلیق/امتیاز عمداً از بدنه خونده نمی‌شه — فقط ادمین یا
// سیستم (بازمحاسبه‌ی نظرات) اون‌ها رو می‌نویسه.
export async function PUT(req: Request) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const userId = g.userId;

  const parsed = await readJsonBody(req, 32 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const b = parsed.body || {};

  const data: {
    headline?: string | null;
    bio?: string | null;
    specialties?: string[];
    categories?: string[];
    routineRole?: string | null;
    published?: boolean;
    acceptingStudents?: boolean;
    acceptedMentorTermsAt?: Date;
    mentorTermsVersion?: string;
  } = {};

  if (b.headline !== undefined) {
    if (b.headline !== null && typeof b.headline !== "string") return badRequest("عنوان نامعتبره");
    data.headline = typeof b.headline === "string" ? b.headline.trim().slice(0, HEADLINE_MAX) || null : null;
  }
  if (b.bio !== undefined) {
    if (b.bio !== null && typeof b.bio !== "string") return badRequest("بیوگرافی نامعتبره");
    data.bio = typeof b.bio === "string" ? b.bio.trim().slice(0, BIO_MAX) || null : null;
  }
  if (b.specialties !== undefined) {
    if (!Array.isArray(b.specialties)) return badRequest("تخصص‌ها باید فهرست باشد");
    const set = new Set<string>();
    for (const s of b.specialties) {
      if (typeof s !== "string") continue;
      const t = s.trim().slice(0, SPECIALTY_MAX);
      if (t) set.add(t);
      if (set.size >= MAX_SPECIALTIES) break;
    }
    data.specialties = Array.from(set);
  }
  if (b.categories !== undefined) {
    if (!Array.isArray(b.categories)) return badRequest("دسته‌ها باید فهرست باشد");
    data.categories = sanitizeCategories(b.categories);
  }
  if (b.routineRole !== undefined) {
    const r = validateRoutineRole(b.routineRole);
    if (!r.ok) return badRequest(r.error);
    data.routineRole = r.data;
  }
  if (b.published !== undefined) {
    if (typeof b.published !== "boolean") return badRequest("وضعیت انتشار نامعتبره");
    data.published = b.published;
  }
  if (b.acceptingStudents !== undefined) {
    if (typeof b.acceptingStudents !== "boolean") return badRequest("وضعیت پذیرش شاگرد نامعتبره");
    data.acceptingStudents = b.acceptingStudents;
  }

  const existing = await prisma.mentorProfile.findUnique({
    where: { userId },
    select: { id: true, categories: true, bio: true, published: true, mentorTermsVersion: true },
  });

  // پذیرشِ شرایطِ منتوری (lib/mentorTerms.ts): ساختِ پروفایل و هر ذخیره‌ی بعدی فقط با
  // نسخه‌ی جاری. استثنا: کنار کشیدن (فقط عدمِ انتشار/توقفِ پذیرشِ شاگرد) همیشه آزاد است
  // تا منتوری که نسخه‌ی تازه را نمی‌پذیرد بتواند بی‌دردسر فعالیتش را متوقف کند.
  const onlyWithdrawing =
    !!existing &&
    Object.keys(b).length > 0 &&
    Object.keys(b).every((k) => (k === "published" || k === "acceptingStudents") && b[k] === false);
  if (!onlyWithdrawing) {
    const terms = decideMentorTerms("mentor", existing?.mentorTermsVersion, b.acceptMentorTerms);
    if (!terms.ok) return NextResponse.json({ error: terms.message, code: MENTOR_TERMS_ERROR_CODE }, { status: 400 });
    if (terms.record) {
      data.acceptedMentorTermsAt = new Date();
      data.mentorTermsVersion = b.acceptMentorTerms as string;
    }
  }

  // انتشار فقط با حداقل یک دسته و بیوگرافی — روی وضعیتِ *نهایی* (بعد از همین تغییر) سنجیده می‌شه
  const finalCategories = data.categories ?? existing?.categories ?? [];
  const finalBio = data.bio !== undefined ? data.bio : existing?.bio ?? null;
  const finalPublished = data.published ?? existing?.published ?? false;
  // نقشِ روتین فقط کنارِ دسته‌ی ROUTINE معنا داره — بدونِ اون پاک می‌شه تا
  // متنِ قدیمی بعدا بی‌صدا دوباره روی کارت ظاهر نشه
  if (!finalCategories.includes("ROUTINE")) data.routineRole = null;
  if (finalPublished && (finalCategories.length === 0 || !finalBio)) {
    return badRequest("برای انتشار پروفایل، حداقل یک دسته و بیوگرافی لازمه");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const profile = existing
        ? await tx.mentorProfile.update({ where: { userId }, data, select: { id: true } })
        : await tx.mentorProfile.create({ data: { userId, ...data }, select: { id: true } });
      // برای هر دسته‌ی انتخابی یک ردیفِ مدرک (NOT_PROVIDED)؛ ردیف‌های قبلی (و
      // وضعیتِ احرازشون) دست نمی‌خورن، حتی اگه دسته موقتا برداشته شده باشه.
      if (finalCategories.length > 0) {
        await tx.mentorCredential.createMany({
          data: finalCategories.map((category) => ({ profileId: profile.id, category })),
          skipDuplicates: true,
        });
      }
    });
  } catch (e) {
    // دو درخواستِ هم‌زمانِ «ساختِ اولین پروفایل» — دومی به‌جای ۵۰۰، ۴۰۹ می‌گیره
    if (isUniqueViolation(e)) return conflict("پروفایل هم‌زمان در حال ساخته‌شدنه؛ دوباره تلاش کن");
    throw e;
  }

  touchMentorActivity(userId);
  return NextResponse.json({ profile: await loadMentorSelf(userId) });
}
