import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { logError } from "@/lib/errorLog";
import { issueTwoFactorOtp, verifyAndConsumeTwoFactorOtp } from "@/lib/twoFactor";
import { sendOtpSms } from "@/lib/sms";

// منطق مشترکِ بررسیِ ورود — بین next-auth (lib/auth.ts، کوکیِ وب) و ورودِ
// اپ موبایل (/api/mobile/auth/*، توکنِ Bearer). قبلا این منطق فقط داخلِ
// authorize()ِ providerها بود؛ اگه موبایل نسخه‌ی خودش رو می‌نوشت، هر اصلاحِ
// امنیتیِ بعدی (rate limit، چکِ مسدودی، دومرحله‌ای) باید دو جا تکرار می‌شد و
// دیر یا زود یکی جا می‌موند. حالا هر دو مسیر دقیقا همین توابع رو صدا می‌زنن
// و حتی سطل‌های rate limit هم مشترکن (تلاش روی وب + موبایل با هم شمرده
// می‌شن، نه هرکدوم سقفِ جدا).
//
// هیچ‌کدوم از این توابع دلیلِ دقیقِ شکست رو به کاربر نشون نمی‌دن — `reason`
// فقط برای لاگ/تصمیمِ داخلیه؛ روت‌ها همیشه پیامِ عمومی برمی‌گردونن (ضد
// user-enumeration).

const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_LIMIT = 8;

/**
 * هشِ bcryptِ ثابت با همون cost ِ رمزهای واقعی (۱۲). وقتی کاربر نیست/رمز نداره/
 * حذف یا مسدود شده، باز هم یک compare روی این اجرا می‌شه تا زمانِ پاسخ با
 * «کاربر هست ولی رمز غلطه» یکی باشه — وگرنه اختلافِ ~۲۵۰ms وجودِ حساب رو لو می‌داد.
 */
const DUMMY_BCRYPT_HASH = "$2a$12$rooBowch5pNVeY4z5SDHYueYI5h60F9PY8/gD/HoGtm.wbqIIUO6.";

/** compare علیه هشِ واقعی، یا هشِ ساختگی وقتی هشی نیست (نتیجه‌ی ساختگی همیشه false) */
export async function timingSafePasswordCheck(password: string, passwordHash: string | null | undefined): Promise<boolean> {
  const ok = await bcrypt.compare(password, passwordHash || DUMMY_BCRYPT_HASH);
  return !!passwordHash && ok;
}

/**
 * سطلِ مشترکِ «حدسِ رمز» (۸ در ۱۰ دقیقه، به‌ازای IP و شناسه) — هر مسیری که رمز
 * رو می‌سنجه (ورودِ وب، ورودِ موبایل، /api/auth/2fa/start) همین رو مصرف می‌کنه،
 * تا هیچ مسیری سقفِ جدای خودش رو به مهاجم نده.
 */
export async function consumePasswordAttempt(identifier: string, ip: string): Promise<boolean> {
  const ipOk = await checkRateLimit(`login-ip:${ip}`, LOGIN_LIMIT, LOGIN_WINDOW_MS);
  const idOk = await checkRateLimit(`login-id:${identifierRateKey(identifier)}`, LOGIN_LIMIT, LOGIN_WINDOW_MS);
  return ipOk && idOk;
}

/**
 * کلیدِ سطلِ rate limitِ «به‌ازای شناسه». جستجوی کاربر (findUserByIdentifier)
 * ایمیل/یوزرنیم رو بدونِ حساسیت به حروف پیدا می‌کنه، پس کلید هم باید همین‌طور
 * باشه — وگرنه «Alice»، «aLice»، «ALICE» … هرکدوم سطلِ جدای خودشون رو داشتن و
 * سقفِ ۸ تلاش روی یک حساب با عوض‌کردنِ بزرگی/کوچکیِ حروف عملا بی‌اثر می‌شد.
 */
export function identifierRateKey(identifier: string): string {
  return identifier.trim().toLowerCase();
}

/** ایمیل/یوزرنیم بدونِ حساسیت به حروف، شماره دقیق — همون قاعده‌ی قبلیِ authorize() */
export function findUserByIdentifier(identifier: string) {
  return prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: identifier, mode: "insensitive" } },
        { phone: identifier },
        { username: { equals: identifier, mode: "insensitive" } },
      ],
    },
  });
}

export type PasswordLoginResult =
  | { ok: true; user: User }
  // رمز درسته ولی دومرحله‌ای روشنه — نشست نباید صادر بشه تا کدِ پیامکی تأیید بشه
  | { ok: false; reason: "requires_2fa"; user: User }
  | { ok: false; reason: "rate_limited" | "invalid" | "blocked" | "db_error" };

/**
 * مرحله‌ی رمز. سقف: ۸ تلاش در ۱۰ دقیقه هم به‌ازای IP هم به‌ازای شناسه.
 * کاربرِ حذف‌شده (soft-delete) هم مثل «وجود نداره» رفتار می‌شه.
 */
export async function verifyPasswordLogin(input: {
  identifier: string;
  password: string;
  ip: string;
}): Promise<PasswordLoginResult> {
  const id = input.identifier.trim();
  if (!id || !input.password) return { ok: false, reason: "invalid" };

  if (!(await consumePasswordAttempt(id, input.ip))) {
    console.warn(`[auth] rate-limited login attempt for "${id}"`);
    return { ok: false, reason: "rate_limited" };
  }

  let user: User | null;
  try {
    user = await findUserByIdentifier(id);
  } catch (err: any) {
    // دیتابیس در دسترس نیست (DATABASE_URL غلط، Postgres خاموش، migration
    // اجرا نشده) — خطای واقعی لاگ می‌شه به‌جای یک ۴۰۱ مبهم.
    console.error(`[auth] DATABASE ERROR during login — is Postgres running and DATABASE_URL correct? ${err?.message || err}`);
    logError("database", `اتصال به دیتابیس حین ورود شکست خورد: ${err?.message || err}`, { severity: "CRITICAL" as any });
    return { ok: false, reason: "db_error" };
  }
  // compare همیشه اجرا می‌شه (با هشِ ساختگی اگه لازم بود) — زمانِ پاسخ نباید
  // بگه حساب وجود داره، حذف شده یا مسدوده
  const usable = !!user && !!user.passwordHash && !user.deletedAt;
  const isValid = await timingSafePasswordCheck(input.password, usable ? user!.passwordHash : null);
  if (!user || !usable) {
    console.warn(`[auth] no user found for identifier "${id}"`);
    return { ok: false, reason: "invalid" };
  }
  if (user.isBlocked) {
    console.warn(`[auth] blocked user tried to log in: "${id}"`);
    return { ok: false, reason: "blocked" };
  }
  if (!isValid) {
    console.warn(`[auth] wrong password for identifier "${id}"`);
    return { ok: false, reason: "invalid" };
  }

  if (user.twoFactorEnabled) {
    console.warn(`[auth] credentials login blocked — 2FA required for "${id}"`);
    return { ok: false, reason: "requires_2fa", user };
  }

  return { ok: true, user };
}

export type SmsTwoFactorResult =
  | { ok: true; user: User }
  | { ok: false; reason: "rate_limited" | "invalid" | "db_error" };

/**
 * مرحله‌ی دومِ ورودِ دومرحله‌ای — کد از صفر اعتبارسنجی و *مصرف* می‌شه.
 * کد فقط بعد از رمزِ درست صادر شده (2fa/start یا /api/mobile/auth/login)،
 * پس این‌جا رمز دوباره خواسته نمی‌شه — دقیقا مثل provider «sms-2fa».
 */
export async function verifySmsTwoFactorLogin(input: {
  identifier: string;
  code: string;
  ip: string;
}): Promise<SmsTwoFactorResult> {
  const id = input.identifier.trim();
  const code = input.code.trim();
  if (!id || !code) return { ok: false, reason: "invalid" };

  if (
    !(await checkRateLimit(`sms-2fa-ip:${input.ip}`, 20, LOGIN_WINDOW_MS)) ||
    !(await checkRateLimit(`sms-2fa-id:${identifierRateKey(id)}`, 10, LOGIN_WINDOW_MS))
  ) {
    console.warn(`[auth] rate-limited sms-2fa attempt for "${id}"`);
    return { ok: false, reason: "rate_limited" };
  }

  let user: User | null;
  try {
    user = await findUserByIdentifier(id);
  } catch (err: any) {
    console.error(`[auth] DATABASE ERROR during sms-2fa login: ${err?.message || err}`);
    logError("database", `اتصال به دیتابیس حین ورود دومرحله‌ای شکست خورد: ${err?.message || err}`, { severity: "CRITICAL" as any });
    return { ok: false, reason: "db_error" };
  }
  if (!user || user.isBlocked || user.deletedAt || !user.twoFactorEnabled) return { ok: false, reason: "invalid" };

  const consumed = await verifyAndConsumeTwoFactorOtp(user.id, code);
  if (!consumed.ok) {
    console.warn(`[auth] sms-2fa rejected for "${id}": ${consumed.reason}`);
    return { ok: false, reason: "invalid" };
  }
  return { ok: true, user };
}

/** لاگِ append-only «ورودهای اخیر» — شکستش هیچ‌وقت نباید جلوی ورود رو بگیره */
export function recordLoginEvent(userId: string, provider: string, ip: string, userAgent: string | null) {
  prisma.loginEvent.create({ data: { userId, provider, ip, userAgent } }).catch(() => {});
}

/**
 * بعد از رمزِ درست برای حسابِ دومرحله‌ای: کدِ تازه صادر و پیامک می‌شه.
 * مشترک بین /api/auth/2fa/start (وب) و /api/mobile/auth/login.
 * فقط چهار رقمِ آخرِ شماره برمی‌گرده، نه کلِ شماره.
 */
export async function startSmsTwoFactor(user: Pick<User, "id" | "phone">): Promise<
  { ok: true; phoneHint: string; simulated: boolean } | { ok: false; reason: "no_phone" | "sms_failed" }
> {
  if (!user.phone) return { ok: false, reason: "no_phone" };
  const code = await issueTwoFactorOtp(user.id);
  const sent = await sendOtpSms(user.phone, code);
  if (!sent.ok) return { ok: false, reason: "sms_failed" };
  return { ok: true, phoneHint: user.phone.slice(-4), simulated: sent.simulated };
}
