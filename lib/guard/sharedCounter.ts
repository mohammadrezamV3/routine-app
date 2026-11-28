// شمارنده‌ی مشترک Postgres برای سیاست‌های گران. پنجره‌ی ثابت (bucket)،
// افزایش اتمی با upsert. هر خطای دیتابیس یا کندی = fail-open (null) و تا
// ۳۰ ثانیه دوباره امتحان نمی‌کنه تا دیتابیس بیمار بیشتر فشار نبینه.
import { prisma } from "@/lib/prisma";

const DB_TIMEOUT_MS = 400;
const COOLDOWN_MS = 30_000;
const CLEANUP_EVERY_MS = 5 * 60_000;

let downUntil = 0;
let lastCleanup = 0;

export function bucketOf(now: number, windowMs: number): number {
  return Math.floor(now / windowMs) * windowMs;
}

/** شمارنده‌ی جدید این پنجره بعد از افزایش، یا null اگه دیتابیس در دسترس/سریع نبود. */
export async function bumpShared(key: string, policy: string, windowMs: number, now = Date.now()): Promise<number | null> {
  if (now < downUntil) return null;
  const bucket = bucketOf(now, windowMs);
  const expiresAt = new Date(bucket + windowMs * 2);
  try {
    const row = await Promise.race([
      prisma.rateCounter.upsert({
        where: { key_bucket: { key, bucket: BigInt(bucket) } },
        create: { key, bucket: BigInt(bucket), policy, count: 1, expiresAt },
        update: { count: { increment: 1 } },
        select: { count: true },
      }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("rate-counter timeout")), DB_TIMEOUT_MS).unref?.()),
    ]);
    maybeCleanup(now);
    return row.count;
  } catch {
    downUntil = now + COOLDOWN_MS;
    return null;
  }
}

function maybeCleanup(now: number) {
  if (now - lastCleanup < CLEANUP_EVERY_MS) return;
  lastCleanup = now;
  prisma.rateCounter.deleteMany({ where: { expiresAt: { lt: new Date(now) } } }).catch(() => {});
}

export function resetSharedCounterForTests() { downUntil = 0; lastCleanup = 0; }
