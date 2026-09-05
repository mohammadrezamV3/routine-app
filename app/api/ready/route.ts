import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// «آماده به کار» (readiness) — برخلافِ /api/health که عمداً به دیتابیس دست
// نمی‌زنه، این روت *واقعاً* به Postgres می‌زنه. تفکیکشون عمدیه:
//
//   /api/health  → «پروسه‌ی Node زنده‌ست؟» (healthcheckِ داکر از این استفاده
//                  می‌کنه؛ نباید با کندیِ دیتابیس کانتینرِ سالم رو ری‌استارت کنه)
//   /api/ready   → «اپ واقعاً می‌تونه به کاربر سرویس بده؟» (برای وقتی که سایت
//                  بالا نمیاد و باید بفهمیم مشکل از Node است یا از پولِ دیتابیس)
//
// یک پولِ کانکشنِ پُر یا Postgresِ خاموش این‌جا دیده می‌شه، ولی توی
// /api/health نه — چون اون‌جا اصلاً کوئری‌ای زده نمی‌شه.
export const dynamic = "force-dynamic";

const TIMEOUT_MS = 4000;

export async function GET() {
  const startedAt = Date.now();
  try {
    await Promise.race([
      // کوئریِ ثابتِ بدون هیچ ورودیِ کاربر — سبک‌ترین راه برای اینکه واقعاً یک
      // کانکشن از پول گرفته بشه و رفت‌وبرگشتِ کاملِ Postgres تست بشه.
      prisma.$queryRaw`SELECT 1`, // sql-safety-ok: ثابت و بدون پارامتر، هیچ ورودیِ کاربری داخلش نیست
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS)
      ),
    ]);
    return NextResponse.json({
      ok: true,
      db: "up",
      ms: Date.now() - startedAt,
      uptime: Math.round(process.uptime()),
    });
  } catch (err: any) {
    const timedOut = err?.message === "timeout";
    // پیامِ خامِ خطا می‌تونه هاست/نامِ دیتابیس رو لو بده، پس فقط لاگِ سرور
    // می‌شه و به کلاینت یه دلیلِ کلی برمی‌گرده.
    console.error(`[ready] database probe failed: ${err?.message || err}`);
    return NextResponse.json(
      {
        ok: false,
        db: "down",
        // «timeout» تقریباً همیشه یعنی پولِ کانکشن پُره یا Postgres قفل کرده؛
        // «error» یعنی اصلاً نتونستیم وصل شیم.
        reason: timedOut ? "timeout" : "error",
        ms: Date.now() - startedAt,
        uptime: Math.round(process.uptime()),
      },
      { status: 503 }
    );
  }
}
