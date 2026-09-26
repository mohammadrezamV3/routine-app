import { analyzeFoodPhoto } from "@/lib/aiClient";
import { checkRateLimit } from "@/lib/rateLimit";

// هسته‌ی اسکنِ عکسِ غذا — مشترک بینِ /api/calorie/scan (وب، کوکی) و
// /api/mobile/ai/food-scan (اپ، Bearer). گیتِ ماژولِ CALORIE کارِ route است؛
// این‌جا اعتبارسنجیِ ورودی، سقفِ نرخ (همون سطلِ `calorie-scan:<userId>` برای
// هر دو مسیر، یعنی وب + گوشی با هم ۱۵ در ساعت) و فراخوانیِ AI. ثبتِ مصرف
// (AiUsageRecord) داخلِ خودِ analyzeFoodPhoto انجام می‌شه.

const ALLOWED_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
// عکس base64 حدودا ۱.۳۳ برابر حجم باینریه؛ سقف ۸ مگابایت رشته یعنی
// تقریبا ۶ مگابایت عکس واقعی — برای عکس یک وعده غذا کاملا کافیه و
// جلوی سوءاستفاده/هزینه‌ی غیرمنتظره با پی‌لودهای غول‌پیکر رو می‌گیره.
export const MAX_FOOD_SCAN_BASE64_LEN = 8 * 1024 * 1024;

export async function runFoodScan(
  userId: string,
  isSuperAdmin: boolean,
  body: any
): Promise<{ status: number; json: Record<string, unknown> }> {
  const imageBase64 = body?.imageBase64;
  const mediaType = body?.mediaType;

  if (typeof imageBase64 !== "string" || !imageBase64) {
    return { status: 400, json: { error: "عکس الزامی است" } };
  }
  if (imageBase64.length > MAX_FOOD_SCAN_BASE64_LEN) {
    return { status: 400, json: { error: "حجم عکس خیلی زیاده" } };
  }
  if (typeof mediaType !== "string" || !ALLOWED_MEDIA_TYPES.has(mediaType)) {
    return { status: 400, json: { error: "فرمت عکس پشتیبانی نمی‌شه" } };
  }

  // هر درخواست یک فراخوانی واقعی و پولی چندوجهی به گیت‌وی AI ـه — سقف
  // محافظه‌کارانه‌تر از تولید رودمپ متنی، چون هزینه‌ش بالاتره.
  // سوپریوزر از این سقف مستثناست (هم‌راستا با دسترسی نامحدودش به ماژول‌ها).
  if (!isSuperAdmin && !(await checkRateLimit(`calorie-scan:${userId}`, 15, 60 * 60 * 1000))) {
    return { status: 429, json: { error: "سقف اسکن غذا در این ساعت پر شده — بعدا امتحان کن" } };
  }

  try {
    const result = await analyzeFoodPhoto(imageBase64, mediaType as "image/jpeg" | "image/png" | "image/webp", userId);
    return { status: 200, json: { ok: true, result } };
  } catch (err: any) {
    return { status: 500, json: { error: err?.message || "خطا در تحلیل عکس" } };
  }
}
