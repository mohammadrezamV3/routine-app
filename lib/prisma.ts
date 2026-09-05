import { PrismaClient } from "@prisma/client";
import { tuneDatabaseUrl } from "@/lib/dbUrl";

// جلوگیری از ساخت چندباره PrismaClient در حالت dev به‌خاطر hot-reload نکست
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const tunedUrl = tuneDatabaseUrl(process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(tunedUrl ? { datasources: { db: { url: tunedUrl } } } : undefined);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * گرم‌کردنِ کانکشن‌پول موقعِ بالا آمدنِ سرور (از instrumentation.ts صدا زده
 * می‌شه). بدونِ این، *اولین* درخواستِ واقعیِ کاربر باید هزینه‌ی کاملِ ساختِ
 * کانکشن به Postgres رو بده — روی یه سرورِ تازه‌ری‌استارت‌شده همین باعث
 * می‌شه اولین بازدیدکننده تایم‌اوت بخوره و نفرِ بعدی سایت رو سالم ببینه.
 *
 * هیچ‌وقت throw نمی‌کنه و هیچ‌وقت بالا آمدنِ سرور رو بلاک نمی‌کنه: اگه
 * دیتابیس هنوز آماده نباشه، در پس‌زمینه با backoff دوباره تلاش می‌کنه.
 */
export function warmUpDatabase(attempt = 1): void {
  const MAX_ATTEMPTS = 8;
  prisma
    .$connect()
    .then(() => {
      console.log(`[prisma] connection pool ready (attempt ${attempt})`);
    })
    .catch((err: any) => {
      console.error(`[prisma] warm-up attempt ${attempt} failed: ${err?.message || err}`);
      if (attempt >= MAX_ATTEMPTS) {
        console.error("[prisma] giving up on warm-up — درخواست‌ها خودشان تلاش به اتصال می‌کنند");
        return;
      }
      const delayMs = Math.min(30_000, 2 ** attempt * 500);
      const timer = setTimeout(() => warmUpDatabase(attempt + 1), delayMs);
      // نباید event loop رو زنده نگه داره و مانعِ خاموش‌شدنِ تمیزِ پروسه بشه
      if (typeof timer.unref === "function") timer.unref();
    });
}
