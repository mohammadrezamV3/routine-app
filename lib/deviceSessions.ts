import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * نشستِ هر دستگاه.
 *
 * استراتژیِ next-auth توی این پروژه JWTه (بدونِ ردیفِ سرور به‌ازای هر توکن)،
 * پس تا حالا هیچ راهی نبود که کاربر ببینه با چه دستگاه‌هایی وارده یا یکیشون
 * رو بیرون بندازه. حالا هر توکنِ صادرشده یک `sid` یکتا داخلش داره که به یک
 * ردیفِ `Session` اشاره می‌کنه؛ پرشدنِ `revokedAt` یعنی همون توکن از اولین
 * درخواستِ بعدی نامعتبره.
 *
 * چرا کشِ در-حافظه: بدونِ اون، *هر* درخواستی که سشن رو می‌خونه یک کوئریِ
 * اضافه به دیتابیس می‌زد. با یک پنجره‌ی کوتاه (۶۰ ثانیه) هزینه‌ی حالتِ عادی
 * تقریباً صفر می‌شه، و چون خودِ ابطال همین کش رو فوراً پاک می‌کنه، ابطال از
 * داخلِ همین اینستنس بلافاصله اثر می‌کنه. (مثلِ `lib/rateLimit.ts` این هم
 * تک-اینستنسه؛ اگه چند سرور شدیم باید با Redis عوض بشه.)
 */
const CHECK_TTL_MS = 60 * 1000;
const validCache = new Map<string, number>();

export function newSessionId(): string {
  return randomBytes(24).toString("hex");
}

export async function createDeviceSession(input: {
  userId: string;
  sid: string;
  provider: string;
  ip?: string | null;
  userAgent?: string | null;
  expiresAt: Date;
}): Promise<void> {
  await prisma.session.create({
    data: {
      userId: input.userId,
      sessionToken: input.sid,
      provider: input.provider,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      expiresAt: input.expiresAt,
    },
  });
  validCache.set(input.sid, Date.now() + CHECK_TTL_MS);
}

/** آیا این توکن هنوز معتبره؟ نشستِ ابطال‌شده/پاک‌شده → false. */
export async function isSessionLive(sid: string): Promise<boolean> {
  const until = validCache.get(sid);
  if (until && until > Date.now()) return true;

  const row = await prisma.session.findUnique({
    where: { sessionToken: sid },
    select: { revokedAt: true, expiresAt: true },
  });
  const live = !!row && !row.revokedAt && row.expiresAt.getTime() > Date.now();
  if (live) {
    validCache.set(sid, Date.now() + CHECK_TTL_MS);
    // «آخرین بازدید» فقط هم‌زمان با همین بررسیِ هر-۶۰-ثانیه به‌روز می‌شه، نه
    // هر درخواست — وگرنه یک write به‌ازای هر request می‌شد.
    prisma.session.update({ where: { sessionToken: sid }, data: { lastSeenAt: new Date() } }).catch(() => {});
  } else {
    validCache.delete(sid);
  }
  return live;
}

/** ابطالِ یک نشستِ مشخص (فقط اگه مالِ همین کاربر باشه — جلوگیری از IDOR). */
export async function revokeDeviceSession(userId: string, sessionId: string): Promise<boolean> {
  const row = await prisma.session.findFirst({ where: { id: sessionId, userId }, select: { sessionToken: true } });
  if (!row) return false;
  await prisma.session.updateMany({ where: { id: sessionId, userId }, data: { revokedAt: new Date() } });
  validCache.delete(row.sessionToken);
  return true;
}

/** ابطالِ همه‌ی نشست‌ها به‌جز نشستِ فعلی. */
export async function revokeOtherDeviceSessions(userId: string, currentSid: string): Promise<number> {
  const others = await prisma.session.findMany({
    where: { userId, revokedAt: null, sessionToken: { not: currentSid } },
    select: { sessionToken: true },
  });
  if (!others.length) return 0;
  await prisma.session.updateMany({
    where: { userId, revokedAt: null, sessionToken: { not: currentSid } },
    data: { revokedAt: new Date() },
  });
  for (const o of others) validCache.delete(o.sessionToken);
  return others.length;
}

export async function listDeviceSessions(userId: string) {
  return prisma.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true, sessionToken: true, provider: true, ip: true, userAgent: true, createdAt: true, lastSeenAt: true },
  });
}
