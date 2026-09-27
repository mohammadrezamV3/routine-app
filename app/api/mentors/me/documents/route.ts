import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, badRequest, forbidden, conflict } from "@/lib/mentorGuard";
import { validateDocument, MAX_DOCUMENT_BYTES } from "@/lib/mentorUpload";
import { checkRateLimit } from "@/lib/rateLimit";

// سقفِ تعدادِ مدارکِ یک پروفایل — فایل‌ها داخلِ دیتابیسن (Bytes)، پس بدونِ
// سقف یک حساب می‌تونست با آپلودِ پشت‌سرهم دیتابیس رو پر کنه.
const MAX_DOCUMENTS_PER_PROFILE = 20;

// POST /api/mentors/me/documents (multipart: file, kind, category?)
// ارسالِ مدرک → وضعیتِ مربوط PENDING + ردیفِ تاریخچه. حتی اگه قبلا VERIFIED
// بوده، مدرکِ تازه دوباره باید بررسی بشه (وگرنه می‌شد بعد از تأیید، فایل رو عوض کرد).
export async function POST(req: Request) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const userId = g.userId;

  if (!(await checkRateLimit(`mentor-doc:${userId}`, 10, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد ارسال مدرک زیاد بوده؛ کمی بعد دوباره تلاش کن" }, { status: 429 });
  }

  // سقفِ حجم *حین* خوندن: Content-Length قابل‌جعله و درخواستِ chunked اصلا نداره،
  // پس بدنه با شمارنده‌ی بایت استریم می‌شه و به‌محضِ عبور از سقف قطع می‌شه —
  // req.formData() مستقیم کلِ بدنه رو بی‌حد توی حافظه می‌کشید.
  const MAX_BODY = MAX_DOCUMENT_BYTES + 64 * 1024;
  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > MAX_BODY) return NextResponse.json({ error: "حجم فایل حداکثر ۵ مگابایته" }, { status: 413 });
  const body = await readBodyCapped(req, MAX_BODY);
  if (body === "too_large") return NextResponse.json({ error: "حجم فایل حداکثر ۵ مگابایته" }, { status: 413 });

  const profile = await prisma.mentorProfile.findUnique({ where: { userId }, select: { id: true, categories: true, identityStatus: true } });
  if (!profile) return forbidden("اول پروفایل منتوری بساز");

  let form: FormData;
  try {
    form = await new Response(body, { headers: { "content-type": req.headers.get("content-type") || "" } }).formData();
  } catch {
    return badRequest("فرم ارسالی نامعتبره");
  }

  const kind = form.get("kind");
  if (kind !== "IDENTITY" && kind !== "CERTIFICATE") return badRequest("نوع مدرک نامعتبره");
  let category: string | null = null;
  if (kind === "CERTIFICATE") {
    const c = form.get("category");
    if (typeof c !== "string" || !profile.categories.includes(c)) return badRequest("دسته‌ی مدرک باید یکی از دسته‌های پروفایلت باشه");
    category = c;
  }

  const file = form.get("file");
  if (!file || typeof file === "string") return badRequest("فایلی ارسال نشده");
  if (file.size > MAX_DOCUMENT_BYTES) return NextResponse.json({ error: "حجم فایل حداکثر ۵ مگابایته" }, { status: 413 });
  const v = validateDocument(await file.arrayBuffer(), (file as File).name);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: v.status });

  const count = await prisma.mentorDocument.count({ where: { profileId: profile.id } });
  if (count >= MAX_DOCUMENTS_PER_PROFILE) return conflict("تعداد مدارک به سقف رسیده؛ اول چندتا از قبلی‌ها رو حذف کن");

  const document = await prisma.$transaction(async (tx) => {
    const doc = await tx.mentorDocument.create({
      data: {
        profileId: profile.id,
        kind,
        category,
        fileName: v.doc.fileName,
        mimeType: v.doc.mimeType,
        sizeBytes: v.doc.sizeBytes,
        sha256: v.doc.sha256,
        data: v.doc.data,
      },
      select: { id: true, kind: true, category: true, fileName: true, mimeType: true, sizeBytes: true, createdAt: true },
    });

    if (kind === "IDENTITY") {
      await tx.mentorProfile.update({
        where: { id: profile.id },
        data: { identityStatus: "PENDING", identityRejectReason: null, identityReviewedAt: null },
      });
      await tx.mentorVerificationEvent.create({
        data: { profileId: profile.id, kind, category: null, fromStatus: profile.identityStatus, toStatus: "PENDING", actorUserId: userId },
      });
    } else {
      const cred = await tx.mentorCredential.findUnique({ where: { profileId_category: { profileId: profile.id, category: category! } }, select: { status: true } });
      await tx.mentorCredential.upsert({
        where: { profileId_category: { profileId: profile.id, category: category! } },
        create: { profileId: profile.id, category: category!, status: "PENDING" },
        update: { status: "PENDING", rejectReason: null, reviewedAt: null },
      });
      await tx.mentorVerificationEvent.create({
        data: { profileId: profile.id, kind, category, fromStatus: cred?.status ?? "NOT_PROVIDED", toStatus: "PENDING", actorUserId: userId },
      });
    }
    return doc;
  });

  return NextResponse.json({ document });
}

async function readBodyCapped(req: Request, max: number): Promise<Uint8Array<ArrayBuffer> | "too_large"> {
  if (!req.body) return new Uint8Array(new ArrayBuffer(0));
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel().catch(() => {});
      return "too_large";
    }
    chunks.push(value);
  }
  const out = new Uint8Array(new ArrayBuffer(total));
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out;
}
