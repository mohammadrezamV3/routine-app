import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ModuleKey, SubscriptionStatus } from "@prisma/client";
import { parseDateRange } from "@/lib/validate";
import { BOOTSTRAP_SETTING_KEYS } from "@/lib/userSettingKeys";

/**
 * GET /api/bootstrap?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * هرچیزی که *هر* صفحه‌ی داخل اپ موقع لود لازم داره، در یک درخواست.
 *
 * چرا لازم شد — با بنچمارک ۲۵۰۰ کاربر اندازه‌گیری شد:
 *   • یک لود صفحه ۱۲ درخواست API می‌زد.
 *   • دیتابیس اصلا گلوگاه نبود: زیر بار ۹ کانکشن idle بود و صفر کوئری
 *     منتظر. ولی `/api/health` — که نه به DB دست می‌زنه نه به سشن — از ۳ms
 *     به ۲۳۰ms می‌رفت. یعنی گلوگاه CPU/event loop نوده، نه Postgres.
 *   • ظرفیت اندازه‌گیری‌شده: بدون auth ~۱۲۶۴ req/s، با auth ~۷۶۰ req/s.
 *     یعنی هر درخواست حدود ۴۰٪ overhead اضافه فقط بابت
 *     getServerSession (رمزگشایی و تأیید JWT) می‌ده — و این هزینه ۱۲ بار
 *     در هر لود صفحه تکرار می‌شد.
 *
 * پس مسئله «کوئری کند» نبود، «تعداد درخواست» بود. این روت همون داده‌ها رو
 * با **یک** چک سشن و **دو** کوئری موازی برمی‌گردونه.
 *
 * اندپوینت‌های تکی قبلی همگی سر جاشون‌ن — هم برای نوشتن، هم برای هر
 * خواندنی که خارج از موج لود اولیه اتفاق می‌افته.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // بازه اختیاریه: صفحه‌هایی که تاریخچه‌ی روزانه نمی‌خوان (مثلا /about)
  // می‌تونن ندنش و هزینه‌ی اون کوئری رو ندن.
  const fromRaw = req.nextUrl.searchParams.get("from");
  const toRaw = req.nextUrl.searchParams.get("to");
  let range: { from: Date; to: Date } | null = null;
  if (fromRaw || toRaw) {
    const parsed = parseDateRange(fromRaw, toRaw);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    range = parsed;
  }

  // آواتار ستونی از خود User ئه، پس با همون کوئری حساب میاد — نه یک
  // درخواست جدا، که قبلا بود.
  const [settingRows, user, dailyRows] = await Promise.all([
    prisma.userSetting.findMany({
      where: { userId, key: { in: [...BOOTSTRAP_SETTING_KEYS] } },
      select: { key: true, value: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true, username: true, phone: true, name: true, market: true,
        createdAt: true, isSuperAdmin: true, avatarUrl: true,
        referralCode: { select: { code: true } },
        moduleAccess: { select: { module: true, active: true, expiresAt: true } },
        // فقط اشتراک واقعا فعال — عینا همون شرط /api/account. (قبلا
        // «آخرین ردیف ساخته‌شده» می‌اومد و یه اشتراک منقضی هم به‌عنوان
        // پلن فعلی نشون داده می‌شد.)
        subscriptions: {
          where: { status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] }, currentPeriodEnd: { gt: new Date() } },
          orderBy: { currentPeriodEnd: "desc" },
          take: 1,
          select: { status: true, currentPeriodEnd: true, plan: { select: { nameFa: true, key: true } } },
        },
      },
    }),
    range
      ? prisma.dailyEntry.findMany({
          where: { userId, date: { gte: range.from, lte: range.to } },
          select: { date: true, completedItems: true, wakeUpAt: true },
        })
      : Promise.resolve([]),
  ]);

  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

  const settings: Record<string, unknown> = {};
  for (const row of settingRows) settings[row.key] = row.value;

  const entries: Record<string, { tasks: unknown; wake: string | null }> = {};
  for (const r of dailyRows) {
    // همون قالب /api/tasks/daily/range تا کلاینت لازم نباشه دو شکل بشناسه
    entries[r.date.toISOString().slice(0, 10)] = {
      tasks: r.completedItems,
      wake: r.wakeUpAt ? r.wakeUpAt.toISOString() : null,
    };
  }

  // سوپریوزر همیشه همه‌ی ماژول‌ها رو داره — عینا همون منطق /api/account.
  // اگه این‌جا تکرار نشه، سوپریوزری که از مسیر bootstrap لود می‌شه دسترسیش
  // رو از دست می‌ده (چون ModuleGate از همین پاسخ تصمیم می‌گیره).
  const moduleAccess = user.isSuperAdmin
    ? Object.values(ModuleKey).map((m) => ({ module: m, active: true, expiresAt: null }))
    : user.moduleAccess;

  const { avatarUrl, ...userRest } = user;
  return NextResponse.json({
    settings,
    // شکل `user` عینا همونیه که /api/account می‌ده، تا lib/accountCache.ts
    // و ModuleGate بدون هیچ تغییری بتونن مصرفش کنن. سوپریوزر هم مثل اون‌جا
    // همه‌ی ماژول‌ها رو فعال می‌گیره — منطق دسترسی نباید بین دو مسیر فرق کنه.
    account: { user: { ...userRest, moduleAccess } },
    avatarUrl: avatarUrl ?? null,
    dailyRange: range ? { from: fromRaw, to: toRaw, entries } : null,
  });
}
