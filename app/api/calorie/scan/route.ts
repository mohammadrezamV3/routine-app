import { NextRequest, NextResponse } from "next/server";
import { requireModule } from "@/lib/moduleAccess";
import { ModuleKey } from "@prisma/client";
import { analyzeFoodPhoto } from "@/lib/aiClient";
import { checkRateLimit } from "@/lib/rateLimit";

const ALLOWED_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
// عکسِ base64 حدوداً ۱.۳۳ برابرِ حجمِ باینریه؛ سقفِ ۸ مگابایتِ رشته یعنی
// تقریباً ۶ مگابایتِ عکسِ واقعی — برای عکسِ یک وعده غذا کاملاً کافیه و
// جلوی سوءاستفاده/هزینه‌ی غیرمنتظره با پی‌لودهای غول‌پیکر رو می‌گیره.
const MAX_BASE64_LEN = 8 * 1024 * 1024;

// POST /api/calorie/scan  { imageBase64, mediaType }
// فقط تحلیل می‌کنه و تخمین رو برمی‌گردونه — ثبتِ واقعی توی لاگِ روزانه بعد
// از تأیید/ویرایشِ کاربر، جداگانه با /api/calorie/log انجام می‌شه (همون
// الگوی «قبل از ذخیره‌ی نهایی، امکانِ بازبینی» که بقیه‌ی فیچرهای AIِ اپ دارن).
export async function POST(req: NextRequest) {
  const guard = await requireModule(ModuleKey.CALORIE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await req.json().catch(() => null);
  const imageBase64 = body?.imageBase64;
  const mediaType = body?.mediaType;

  if (typeof imageBase64 !== "string" || !imageBase64) {
    return NextResponse.json({ error: "عکس الزامی است" }, { status: 400 });
  }
  if (imageBase64.length > MAX_BASE64_LEN) {
    return NextResponse.json({ error: "حجم عکس خیلی زیاده" }, { status: 400 });
  }
  if (typeof mediaType !== "string" || !ALLOWED_MEDIA_TYPES.has(mediaType)) {
    return NextResponse.json({ error: "فرمت عکس پشتیبانی نمی‌شه" }, { status: 400 });
  }

  // هر درخواست یک فراخوانیِ واقعی و پولیِ چندوجهی به گیت‌وی AI ـه — سقفِ
  // محافظه‌کارانه‌تر از تولیدِ رودمپِ متنی، چون هزینه‌ش بالاتره.
  // سوپریوزر از این سقف مستثناست (هم‌راستا با دسترسیِ نامحدودش به ماژول‌ها).
  if (!guard.isSuperAdmin && !checkRateLimit(`calorie-scan:${userId}`, 15, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "سقف اسکن غذا در این ساعت پر شده — بعداً امتحان کن" }, { status: 429 });
  }

  try {
    const result = await analyzeFoodPhoto(imageBase64, mediaType as "image/jpeg" | "image/png" | "image/webp", userId);
    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "خطا در تحلیل عکس" }, { status: 500 });
  }
}
