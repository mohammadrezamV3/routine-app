// هسته‌ی مشترکِ گزارش هفتگی — روت‌های وب (app/api/reports/weekly/*) و
// موبایل (app/api/mobile/social/weekly-report/*). گیتِ ماژولِ AI_INSIGHT در
// خودِ روت‌هاست؛ این‌جا سقفِ نرخ (با همون کلیدهای وب، پس بودجه بینِ وب و
// موبایل مشترکه)، اعتبارِ offset و ترجمه‌ی خطای AI به JSON.
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { getOrGenerateWeeklyReport } from "@/lib/weeklyReport/snapshot";
import type { CoreResult } from "@/lib/mobileSocialFriends";

const err = (status: number, error: string): CoreResult<{ error: string }> => ({ status, body: { error } });

export function parseWeekOffset(raw: unknown): number {
  const n = Number(raw ?? 0);
  return Number.isInteger(n) ? n : 0;
}

async function userTimezone(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
  return user?.timezone || "Asia/Tehran";
}

/**
 * خطای تولیدِ گزارش (گیت‌وی AI) → JSON. بدونِ این، نکست یک صفحه‌ی HTMLِ ۵۰۰
 * برمی‌گردوند و کلاینت خیال می‌کرد اینترنتش قطعه.
 */
export function weeklyErrorResult(e: any): CoreResult<{ error: string }> {
  if (e?.message?.includes("ARVAN_AI")) return err(503, "سرویس هوش مصنوعی روی این سرور تنظیم نشده");
  if (e?.name === "TimeoutError" || e?.name === "AbortError") {
    return err(504, "ساخت گزارش بیش از حد طول کشید — چند دقیقه دیگر دوباره امتحان کن");
  }
  return err(502, "ساخت گزارش هفتگی ناموفق بود — اگر تکرار شد به پشتیبانی اطلاع بده");
}

/** GET: offset=0 هفته‌ی جاری، -1 هفته‌ی قبل، …؛ هفته‌ی آینده مجاز نیست. سقف ۴۰ در ساعت. */
export async function getWeeklyReportForUser(userId: string, isSuperAdmin: boolean, rawOffset: unknown): Promise<CoreResult> {
  // این مسیر برای هفته‌های گذشته‌ی بدونِ snapshot واقعا AI صدا می‌زنه — هم
  // هزینه‌ی پول، هم اشغالِ طولانیِ اتصال. بدونِ سقف، اسکریپت هر دو را بالا می‌برد.
  if (!isSuperAdmin && !(await checkRateLimit(`weekly-report-get:${userId}`, 40, 60 * 60 * 1000))) {
    return err(429, "درخواست‌های گزارش بیش از حد مجاز بود — چند دقیقه دیگر دوباره امتحان کن");
  }
  const offset = parseWeekOffset(rawOffset);
  if (offset > 0) return err(400, "هفته‌ی آینده قابل‌انتخاب نیست");

  try {
    const report = await getOrGenerateWeeklyReport(userId, await userTimezone(userId), isSuperAdmin, offset);
    return { status: 200, body: { offset, report } };
  } catch (e) {
    return weeklyErrorResult(e);
  }
}

/**
 * POST refresh — تولیدِ دوباره (واقعا AI صدا می‌زنه)، سقف ۵ در روز.
 * `catchErrors: false` رفتارِ قدیمیِ روتِ وب را نگه می‌دارد (خطا بالا می‌رود).
 */
export async function refreshWeeklyReportForUser(
  userId: string,
  isSuperAdmin: boolean,
  rawOffset: unknown,
  catchErrors = true
): Promise<CoreResult> {
  if (!isSuperAdmin && !(await checkRateLimit(`weekly-report-refresh:${userId}`, 5, 24 * 60 * 60 * 1000))) {
    return err(429, "تعداد تلاش‌های تولید دوباره‌ی گزارش امروز تمام شده — فردا دوباره امتحان کن");
  }
  const offset = parseWeekOffset(rawOffset);
  if (offset > 0) return err(400, "هفته‌ی آینده قابل‌انتخاب نیست");

  try {
    const report = await getOrGenerateWeeklyReport(userId, await userTimezone(userId), isSuperAdmin, offset, true);
    return { status: 200, body: { offset, report } };
  } catch (e) {
    if (!catchErrors) throw e;
    return weeklyErrorResult(e);
  }
}
