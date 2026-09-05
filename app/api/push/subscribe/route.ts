import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

// POST /api/push/subscribe { endpoint, keys: { p256dh, auth } } — ثبت/به‌روزرسانی
// سابسکریپشن Web Push این دستگاه برای کاربر واردشده. endpoint یکتاست (هر
// دستگاه/مرورگر یه endpoint متفاوت از سرور Push خودش می‌گیره)، پس upsert
// روی همون می‌زنیم — اگه قبلا برای یه کاربر دیگه ثبت شده بود (مثلا همون
// مرورگر قبلا با اکانت دیگه‌ای لاگین بوده) مالکیتش به کاربر فعلی منتقل می‌شه.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(session!.user as any).isSuperAdmin && !(await checkRateLimit(`push-subscribe:${userId}`, 20, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "درخواست‌های زیاد — کمی بعد دوباره امتحان کن" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;
  if (typeof endpoint !== "string" || typeof p256dh !== "string" || typeof auth !== "string") {
    return NextResponse.json({ error: "اطلاعات سابسکریپشن ناقص است" }, { status: 400 });
  }

  // این روت در production ۵۰۰ می‌داد و چون خطا هندل نمی‌شد، هیچ سرنخی هم
  // از خودش به جا نمی‌ذاشت. دو تا کار جدا این‌جا انجام می‌شه:
  //
  //  ۱) upsert Prisma اتمیک نیست: بین SELECT و INSERTش یه پنجره هست. اگه
  //     دو تب/دستگاه هم‌زمان همون endpoint رو بفرستن (subscribeToPush از دو
  //     جای NavDrawer صدا زده می‌شه)، یکی INSERT می‌کنه و اون یکی به یونیک
  //     می‌خوره → P2002. اون حالت اصلا خطا نیست: یعنی رکورد همین الان
  //     ساخته شد، پس فقط آپدیتش می‌کنیم.
  //  ۲) هر خطای دیگه‌ای با علت واقعی لاگ می‌شه و به‌جای ۵۰۰ مبهم، ۵۰۳ با
  //     پیام روشن برمی‌گرده — تا دفعه‌ی بعد قابل تشخیص باشه.
  try {
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId, endpoint, p256dh, auth },
      update: { userId, p256dh, auth },
    });
  } catch (err: any) {
    if (err?.code === "P2002") {
      try {
        await prisma.pushSubscription.update({ where: { endpoint }, data: { userId, p256dh, auth } });
        return NextResponse.json({ ok: true });
      } catch (retryErr: any) {
        console.error(`[push/subscribe] retry after P2002 failed: ${retryErr?.code || ""} ${retryErr?.message || retryErr}`);
        return NextResponse.json({ error: "ثبت نوتیفیکیشن ناموفق بود" }, { status: 503 });
      }
    }
    console.error(`[push/subscribe] ${err?.code || ""} ${err?.message || err}`);
    return NextResponse.json({ error: "ثبت نوتیفیکیشن ناموفق بود" }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/push/subscribe { endpoint } — غیرفعال‌کردن نوتیف روی این دستگاه.
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const endpoint = body?.endpoint;
  if (typeof endpoint !== "string") {
    return NextResponse.json({ error: "endpoint الزامی است" }, { status: 400 });
  }

  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId } });
  return NextResponse.json({ ok: true });
}
