import { createHash, randomBytes } from "crypto";
import { encode, decode } from "next-auth/jwt";
import { ModuleKey, type User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { MobileAuthSuccess, MobileModuleKey, MobileUser } from "@/lib/mobileApiContract";

// احرازِ هویتِ اپ موبایل با توکنِ Bearer (نه کوکی).
//
// • access token: JWT کوتاه‌عمر (۱۵ دقیقه)، با همون سازوکارِ next-auth/jwt
//   (JWE با A256GCM) ولی با `salt` جدا — یعنی کلیدِ مشتق‌شده از
//   NEXTAUTH_SECRET با کلیدِ کوکیِ وب فرق داره: توکنِ موبایل روی روت‌های وب
//   (getServerSession/getToken) باز نمی‌شه و کوکیِ وب هم روی /api/mobile/*
//   قبول نمی‌شه. علاوه بر اون `aud: "mobile"` و `typ: "access"` هم چک می‌شن.
//   payload فقط sub (userId) و sid (ردیفِ Session) داره — isSuperAdmin و
//   ماژول‌ها عمدا توی توکن نیستن؛ هر جا لازم باشه از دیتابیس خونده می‌شن.
//
// • refresh token: ۳۲ بایتِ تصادفیِ مات. فقط SHA-256ش ذخیره می‌شه، اونم توی
//   همون جدولِ `Session` که «دستگاه‌های فعال»ِ پنلِ امنیت ازش می‌خونه
//   (provider = "mobile"، sessionToken = هشِ توکن). پس کاربر گوشی رو کنار
//   بقیه‌ی دستگاه‌هاش می‌بینه و می‌تونه باطلش کنه؛ «خروج از همه‌ی دستگاه‌های
//   دیگر» هم گوشی رو بیرون می‌ندازه. با هر refresh توکن عوض می‌شه (rotation).
//
// • هر درخواستِ موبایل ردیفِ Session + وضعیتِ کاربر رو مستقیم از دیتابیس
//   چک می‌کنه (بدونِ کش) — ابطال/مسدودی از همون درخواستِ بعدی اثر می‌کنه،
//   نه بعد از انقضای access token.

export const MOBILE_PROVIDER = "mobile";
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_MS = 60 * 24 * 60 * 60 * 1000; // ۶۰ روز، با هر refresh تمدید
const ACCESS_TOKEN_SALT = "routine-mobile-access-token-v1";
const AUDIENCE = "mobile";
const LAST_SEEN_THROTTLE_MS = 60 * 1000;

function secret(): string {
  const s = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET is not set");
  return s;
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

/** شکلِ ظاهریِ refresh token — قبل از هش/کوئری، ورودیِ بدشکل همین‌جا رد می‌شه */
export function isWellFormedRefreshToken(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9_-]{43}$/.test(v);
}

export async function issueAccessToken(userId: string, sid: string): Promise<string> {
  return encode({
    token: { sub: userId, sid, aud: AUDIENCE, typ: "access" },
    secret: secret(),
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
    salt: ACCESS_TOKEN_SALT,
  });
}

/** امضا/رمز، انقضا، audience و نوع — هر خطایی → null */
export async function verifyAccessToken(token: string): Promise<{ userId: string; sid: string } | null> {
  if (!token || token.length > 4096) return null;
  try {
    const payload = await decode({ token, secret: secret(), salt: ACCESS_TOKEN_SALT });
    if (!payload || payload.aud !== AUDIENCE || payload.typ !== "access") return null;
    if (typeof payload.sub !== "string" || typeof payload.sid !== "string") return null;
    return { userId: payload.sub, sid: payload.sid };
  } catch {
    return null;
  }
}

export function readBearer(req: Request): string | null {
  const h = req.headers.get("authorization");
  if (!h) return null;
  const m = /^Bearer\s+(\S+)$/i.exec(h.trim());
  return m ? m[1] : null;
}

/** اسمِ دستگاه: فقط متنِ قابل‌نمایش، حداکثر ۶۰ کاراکتر */
export function cleanDeviceName(v: unknown): string | null {
  if (typeof v !== "string") return null;
  // eslint-disable-next-line no-control-regex
  const t = v.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 60);
  return t || null;
}

/**
 * احرازِ هویتِ یک درخواستِ /api/mobile/*. null یعنی ۴۰۱.
 * نشست باید زنده، از نوعِ موبایل و مالِ همین کاربر باشه، و کاربر مسدود/حذف‌شده نباشه.
 */
export async function getMobileAuth(req: Request): Promise<{ userId: string; sessionId: string } | null> {
  const bearer = readBearer(req);
  if (!bearer) return null;
  const claims = await verifyAccessToken(bearer);
  if (!claims) return null;

  const now = new Date();
  const session = await prisma.session.findFirst({
    where: { id: claims.sid, userId: claims.userId, provider: MOBILE_PROVIDER, revokedAt: null, expiresAt: { gt: now } },
    select: { id: true, lastSeenAt: true, user: { select: { isBlocked: true, deletedAt: true } } },
  });
  if (!session || session.user.isBlocked || session.user.deletedAt) return null;

  if (now.getTime() - session.lastSeenAt.getTime() > LAST_SEEN_THROTTLE_MS) {
    prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: now } }).catch(() => {});
  }
  return { userId: claims.userId, sessionId: session.id };
}

export async function getMobileUserId(req: Request): Promise<string | null> {
  return (await getMobileAuth(req))?.userId ?? null;
}

/** ماژول‌های فعال — همون منطقِ requireModule: سوپریوزر همه، وگرنه ردیفِ فعال و منقضی‌نشده */
export async function getActiveModules(user: Pick<User, "id" | "isSuperAdmin">): Promise<MobileModuleKey[]> {
  if (user.isSuperAdmin) return Object.values(ModuleKey) as MobileModuleKey[];
  const now = Date.now();
  const rows = await prisma.moduleAccess.findMany({
    where: { userId: user.id, active: true },
    select: { module: true, expiresAt: true },
  });
  return rows.filter((r) => !r.expiresAt || r.expiresAt.getTime() > now).map((r) => r.module as MobileModuleKey);
}

async function buildUser(user: User): Promise<MobileUser> {
  return { id: user.id, name: user.name, market: user.market, modules: await getActiveModules(user) };
}

async function tokensFor(user: User, sid: string, refreshToken: string, refreshExpiresAt: Date): Promise<MobileAuthSuccess> {
  return {
    accessToken: await issueAccessToken(user.id, sid),
    accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
    refreshToken,
    refreshTokenExpiresAt: refreshExpiresAt.toISOString(),
    user: await buildUser(user),
  };
}

/** بعد از ورودِ موفق: یک ردیفِ Session از نوعِ موبایل + جفتِ توکن */
export async function createMobileSession(
  user: User,
  meta: { deviceName: string | null; ip: string | null; userAgent: string | null }
): Promise<MobileAuthSuccess> {
  const refreshToken = newRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  const row = await prisma.session.create({
    data: {
      userId: user.id,
      sessionToken: hashRefreshToken(refreshToken),
      provider: MOBILE_PROVIDER,
      deviceName: meta.deviceName,
      ip: meta.ip,
      userAgent: meta.userAgent ? meta.userAgent.slice(0, 400) : null,
      expiresAt,
    },
    select: { id: true },
  });
  return tokensFor(user, row.id, refreshToken, expiresAt);
}

/**
 * rotation: توکنِ قبلی فقط یک‌بار قابلِ مصرفه. updateMany با شرطِ هشِ قبلی
 * اتمیکه — دو refreshِ هم‌زمان با یک توکن، فقط یکی‌شون برنده می‌شه.
 */
export async function rotateMobileSession(refreshToken: string, ip: string | null): Promise<MobileAuthSuccess | null> {
  if (!isWellFormedRefreshToken(refreshToken)) return null;
  const oldHash = hashRefreshToken(refreshToken);
  const now = new Date();
  const session = await prisma.session.findUnique({
    where: { sessionToken: oldHash },
    select: { id: true, provider: true, revokedAt: true, expiresAt: true, user: true },
  });
  if (!session || session.provider !== MOBILE_PROVIDER || session.revokedAt || session.expiresAt <= now) return null;
  if (session.user.isBlocked || session.user.deletedAt) return null;

  const next = newRefreshToken();
  const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);
  const { count } = await prisma.session.updateMany({
    where: { id: session.id, sessionToken: oldHash, revokedAt: null },
    data: { sessionToken: hashRefreshToken(next), expiresAt, lastSeenAt: now, ...(ip ? { ip } : {}) },
  });
  if (count === 0) return null;
  return tokensFor(session.user, session.id, next, expiresAt);
}

/** خروج: با refresh token و/یا نشستِ access token — فقط ردیف‌های موبایلِ همون کاربر */
export async function revokeMobileSession(opts: { refreshToken?: unknown; auth?: { userId: string; sessionId: string } | null }) {
  const now = new Date();
  if (opts.auth) {
    await prisma.session.updateMany({
      where: { id: opts.auth.sessionId, userId: opts.auth.userId, provider: MOBILE_PROVIDER, revokedAt: null },
      data: { revokedAt: now },
    });
  }
  if (isWellFormedRefreshToken(opts.refreshToken)) {
    await prisma.session.updateMany({
      where: { sessionToken: hashRefreshToken(opts.refreshToken), provider: MOBILE_PROVIDER, revokedAt: null },
      data: { revokedAt: now },
    });
  }
}
