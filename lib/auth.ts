import type { NextAuthOptions } from "next-auth";
import { encode as encodeJwt } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { Market } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSiteMarket } from "@/lib/market";
import { BASIC_MODULES } from "@/lib/modules";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { logError } from "@/lib/errorLog";
import { isValidEmail } from "@/lib/validate";
import { verifyAndConsumeEmailOtp } from "@/lib/emailOtp";
import { verifyAndConsumeTwoFactorOtp } from "@/lib/twoFactor";
import { createDeviceSession, isSessionLive, newSessionId } from "@/lib/deviceSessions";

// موقع ورود با گوگل، اگه کاربر جدید بود، دقیقا همون تدارک ثبت‌نام معمولی
// (دوره آزمایشی ماژول‌های پایه + کد رفرال) رو براش انجام می‌دیم — تا تجربه‌ی
// کاربر جدید مستقل از روش ورودش یکسان باشه.
async function provisionNewUser(userId: string) {
  await prisma.moduleAccess.createMany({
    data: BASIC_MODULES.map((module) => ({
      userId,
      module,
      active: true,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // ۱۴ روز
    })),
  });
  await prisma.referralCode.create({
    data: {
      userId,
      code: (userId.slice(0, 6) + Math.random().toString(36).slice(2, 6)).toUpperCase(),
    },
  });
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  jwt: {
    // encode پیش‌فرض next-auth فقط از پارامتر maxAge استفاده می‌کنه و اصلا
    // token.exp رو نمی‌خونه؛ برای اینکه «به‌یاد داشته باش» تیک‌نخورده واقعا
    // اثر داشته باشه (نه فقط یه فیلد بی‌اثر تو payload)، maxAge رو خودمون
    // متناسب با exp سفارشی ست‌شده تو callback jwt محاسبه می‌کنیم.
    async encode(params) {
      const customExp = (params.token as any)?.exp;
      if (typeof customExp === "number") {
        const maxAge = customExp - Math.floor(Date.now() / 1000);
        return encodeJwt({ ...params, maxAge });
      }
      return encodeJwt(params);
    },
  },
  pages: {
    signIn: "/auth/login",
  },
  providers: [
    // برای فعال‌شدن واقعی این روش، باید GOOGLE_CLIENT_ID و GOOGLE_CLIENT_SECRET
    // (از Google Cloud Console) به env این دیپلوی اضافه بشه — بدون اون‌ها،
    // دکمه‌ی «ورود با گوگل» نمایش داده می‌شه ولی گوگل درخواست رو رد می‌کنه.
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        // «identifier» می‌تونه ایمیل، شماره موبایل، یا یوزرنیم باشه —
        // یک فیلد ورودی، سه راه ورود.
        identifier: { label: "Email / Phone / Username", type: "text" },
        password: { label: "Password", type: "password" },
        remember: { label: "Remember me", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.identifier || !credentials.password) return null;

        const id = credentials.identifier.trim();

        // حداکثر ۸ تلاش ناموفق در ۱۰ دقیقه، هم به‌ازای IP هم به‌ازای همون
        // شناسه ورود — جلوگیری از brute-force روی رمز عبور.
        const ip = getClientIp((req?.headers as any) || {});
        const ipOk = checkRateLimit(`login-ip:${ip}`, 8, 10 * 60 * 1000);
        const idOk = checkRateLimit(`login-id:${id}`, 8, 10 * 60 * 1000);
        if (!ipOk || !idOk) {
          console.warn(`[auth] rate-limited login attempt for "${id}"`);
          return null;
        }

        // یوزرنیم/ایمیل بدون حساسیت به بزرگ/کوچک حروف مقایسه می‌شن (کسی که
        // "Mohammadreza" یا "mohammadreza" می‌زنه باید یکی حساب بشه)؛
        // شماره موبایل دقیق مقایسه می‌شه چون فقط رقمه.
        let user;
        try {
          user = await prisma.user.findFirst({
            where: {
              OR: [
                { email: { equals: id, mode: "insensitive" } },
                { phone: id },
                { username: { equals: id, mode: "insensitive" } },
              ],
            },
          });
        } catch (err: any) {
          // این‌جا اگه دیتابیس اصلا در دسترس نباشه (DATABASE_URL غلط،
          // Postgres خاموش، migration اجرا نشده) گیر می‌افتیم — به‌جای اینکه
          // بذاریم NextAuth یه 401 مبهم بده، خطای واقعی رو لاگ می‌کنیم.
          console.error(`[auth] DATABASE ERROR during login — is Postgres running and DATABASE_URL correct? ${err?.message || err}`);
          logError("database", `اتصال به دیتابیس حین ورود شکست خورد: ${err?.message || err}`, { severity: "CRITICAL" as any });
          return null;
        }
        if (!user || !user.passwordHash) {
          console.warn(`[auth] no user found for identifier "${id}"`);
          return null;
        }
        if (user.isBlocked) {
          console.warn(`[auth] blocked user tried to log in: "${id}"`);
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          console.warn(`[auth] wrong password for identifier "${id}"`);
          return null;
        }

        // ورود دومرحله‌ای روشنه → این مسیر به‌تنهایی نباید نشست صادر کنه.
        // فرانت اول /api/auth/2fa/start رو می‌زنه و بعد با provider «sms-2fa»
        // (با کد پیامکی) وارد می‌شه. این‌جا صریحا رد می‌کنیم تا حتی اگه
        // کسی مستقیم این provider رو صدا بزنه، دومرحله‌ای دور زده نشه.
        if (user.twoFactorEnabled) {
          console.warn(`[auth] credentials login blocked — 2FA required for "${id}"`);
          return null;
        }

        // پنل کاربری › امنیت › «ورودهای اخیر» — فقط یک لاگ append-only،
        // نه چیزی که خود فلوی ورود بهش وابسته باشه؛ اگه شکست بخوره نباید
        // جلوی ورود واقعی رو بگیره.
        prisma.loginEvent
          .create({ data: { userId: user.id, provider: "credentials", ip, userAgent: (req?.headers as any)?.["user-agent"] || null } })
          .catch(() => {});

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          market: user.market,
          isSuperAdmin: user.isSuperAdmin,
          remember: credentials.remember !== "0",
          // به callback  jwt می‌رسن تا ردیف «دستگاه فعال» با مشخصات درست ساخته بشه
          loginIp: ip,
          loginUserAgent: (req?.headers as any)?.["user-agent"] || null,
          loginProvider: "credentials",
        } as any;
      },
    }),
    // ورود بدون رمز با کد ایمیل — پیش‌بررسی درستی کد قبلا توی
    // /api/auth/email-otp/verify انجام شده (برای پیام‌های خطای دقیق، چون
    // authorize() اینجا هر شکستی رو یکسان/عمومی به فرانت برمی‌گردونه، دقیقا
    // مثل provider «credentials» بالا)؛ این‌جا authorize() از صفر دوباره
    // خودش هم اعتبارسنجی می‌کنه (idempotent، هیچ‌وقت به‌تنهایی به یک
    // پیش‌بررسی فرانتی که می‌شه دور زد متکی نیست) و تنها جایی‌ست که واقعا
    // OTP رو مصرف (usedAt) و نشست رو صادر می‌کنه.
    CredentialsProvider({
      id: "email-otp",
      name: "email-otp",
      credentials: {
        email: { label: "Email", type: "text" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials.code) return null;
        const email = credentials.email.trim().toLowerCase();
        const code = credentials.code.trim();
        if (!isValidEmail(email)) return null;

        const ip = getClientIp((req?.headers as any) || {});
        if (!checkRateLimit(`email-otp-authorize-ip:${ip}`, 20, 10 * 60 * 1000) || !checkRateLimit(`email-otp-authorize-email:${email}`, 10, 10 * 60 * 1000)) {
          console.warn(`[auth] rate-limited email-otp attempt for "${email}"`);
          return null;
        }

        let consumeResult;
        try {
          // مصرف نهایی کد (usedAt) — از این لحظه دیگه هیچ authorize()
          // دیگه‌ای نمی‌تونه دوباره ازش استفاده کنه
          consumeResult = await verifyAndConsumeEmailOtp(email, code);
        } catch (err: any) {
          console.error(`[auth] DATABASE ERROR during email-otp login: ${err?.message || err}`);
          logError("database", `اتصال به دیتابیس حین ورود با کد ایمیل شکست خورد: ${err?.message || err}`, { severity: "CRITICAL" as any });
          return null;
        }
        if (!consumeResult.ok) {
          console.warn(`[auth] email-otp rejected for "${email}": ${consumeResult.reason}`);
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          console.warn(`[auth] email-otp verified but no account for "${email}"`);
          return null;
        }
        if (user.isBlocked) {
          console.warn(`[auth] blocked user tried email-otp login: "${email}"`);
          return null;
        }

        prisma.loginEvent
          .create({ data: { userId: user.id, provider: "email-otp", ip, userAgent: (req?.headers as any)?.["user-agent"] || null } })
          .catch(() => {});

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          market: user.market,
          isSuperAdmin: user.isSuperAdmin,
          remember: true,
          loginIp: ip,
          loginUserAgent: (req?.headers as any)?.["user-agent"] || null,
          loginProvider: "email-otp",
        } as any;
      },
    }),
    // ورود دومرحله‌ای با پیامک — مرحله‌ی دوم ورود معمولی. رمز قبلا توی
    // /api/auth/2fa/start بررسی شده و کد فرستاده شده؛ این‌جا فقط کد دوباره
    // از صفر اعتبارسنجی و مصرف می‌شه (idempotent، هیچ‌وقت به پیش‌بررسی
    // فرانت متکی نیست) و تنها جاییه که نشست صادر می‌شه.
    CredentialsProvider({
      id: "sms-2fa",
      name: "sms-2fa",
      credentials: {
        identifier: { label: "Email / Phone / Username", type: "text" },
        code: { label: "Code", type: "text" },
        remember: { label: "Remember me", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.identifier || !credentials.code) return null;
        const id = credentials.identifier.trim();
        const code = credentials.code.trim();

        const ip = getClientIp((req?.headers as any) || {});
        if (!checkRateLimit(`sms-2fa-ip:${ip}`, 20, 10 * 60 * 1000) || !checkRateLimit(`sms-2fa-id:${id}`, 10, 10 * 60 * 1000)) {
          console.warn(`[auth] rate-limited sms-2fa attempt for "${id}"`);
          return null;
        }

        let user;
        try {
          user = await prisma.user.findFirst({
            where: {
              OR: [
                { email: { equals: id, mode: "insensitive" } },
                { phone: id },
                { username: { equals: id, mode: "insensitive" } },
              ],
            },
          });
        } catch (err: any) {
          console.error(`[auth] DATABASE ERROR during sms-2fa login: ${err?.message || err}`);
          logError("database", `اتصال به دیتابیس حین ورود دومرحله‌ای شکست خورد: ${err?.message || err}`, { severity: "CRITICAL" as any });
          return null;
        }
        if (!user || user.isBlocked || !user.twoFactorEnabled) return null;

        const consumed = await verifyAndConsumeTwoFactorOtp(user.id, code);
        if (!consumed.ok) {
          console.warn(`[auth] sms-2fa rejected for "${id}": ${consumed.reason}`);
          return null;
        }

        prisma.loginEvent
          .create({ data: { userId: user.id, provider: "sms-2fa", ip, userAgent: (req?.headers as any)?.["user-agent"] || null } })
          .catch(() => {});

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          market: user.market,
          isSuperAdmin: user.isSuperAdmin,
          remember: credentials.remember !== "0",
          loginIp: ip,
          loginUserAgent: (req?.headers as any)?.["user-agent"] || null,
          loginProvider: "sms-2fa",
        } as any;
      },
    }),
  ],
  callbacks: {
    // برای ورود گوگل هم باید مسدودبودن چک بشه — authorize() فقط مسیر
    // credentials رو می‌بینه. false برگردوندن یعنی NextAuth ورود رو رد می‌کنه.
    async signIn({ account }) {
      if (account?.provider === "google") {
        const link = await prisma.oAuthAccount.findUnique({
          where: { provider_providerAccountId: { provider: "google", providerAccountId: account.providerAccountId } },
          include: { user: true },
        });
        if (link?.user?.isBlocked) return false;
      }
      return true;
    },
    // «منو به‌یاد داشته باش» تیک نخورده → توکن رو کوتاه‌مدت می‌کنیم (۱ روز)
    // به‌جای پیش‌فرض ۳۰ روزه‌ی next-auth؛ چون کوکی خودش همیشه با maxAge
    // استاتیک ست می‌شه (نه به‌ازای هر لاگین)، این‌جوری واقعا session رو کوتاه
    // می‌کنیم: بعد از یک روز، exp توکن رد می‌شه و useSession/getServerSession
    // خودشون session رو نامعتبر می‌دونن، حتی اگه کوکی خامش هنوز تو مرورگره.
    async jwt({ token, user, account }) {
      // ورود با گوگل: user.id این‌جا شناسه‌ی داخلی ما نیست، profile.sub گوگله
      // (چون provider سفارشی تعریف نکردیم) — پس شناسه‌ی واقعی رو از خود
      // account.providerAccountId می‌گیریم و اتصال/ساخت کاربر رو دستی مدیریت می‌کنیم.
      if (user && account?.provider === "google") {
        const providerAccountId = account.providerAccountId;
        const link = await prisma.oAuthAccount.findUnique({
          where: { provider_providerAccountId: { provider: "google", providerAccountId } },
          include: { user: true },
        });

        let dbUser = link?.user;
        if (!dbUser) {
          // به‌عمد هیچ‌وقت صرفا بر اساس تطابق ایمیل به حساب موجودی وصل
          // نمی‌شیم — ثبت‌نام معمولی این سایت اصلا ایمیل نمی‌گیره/تأیید
          // نمی‌کنه، پس اتکا به ایمیل این‌جا می‌تونست مسیر سوءاستفاده باز کنه.
          // اولین ورود با هر Google account، همیشه یک کاربر کاملا تازه می‌سازه.
          const siteMarket = getSiteMarket();
          dbUser = await prisma.user.create({
            data: {
              email: (user as any).email || undefined,
              name: (user as any).name || undefined,
              market: siteMarket === "INTERNATIONAL" ? Market.INTERNATIONAL : Market.IRAN,
              locale: siteMarket === "INTERNATIONAL" ? "en" : "fa",
              emailVerifiedAt: (user as any).email ? new Date() : undefined,
            },
          });
          await prisma.oAuthAccount.create({
            data: { userId: dbUser.id, provider: "google", providerAccountId },
          });
          await provisionNewUser(dbUser.id);
        }

        prisma.loginEvent.create({ data: { userId: dbUser.id, provider: "google" } }).catch(() => {});

        token.userId = dbUser.id;
        token.name = dbUser.name;
        token.market = dbUser.market;
        token.isSuperAdmin = dbUser.isSuperAdmin;
        // گوگل چک‌باکس «به‌یاد داشته باش» نداره — پیش‌فرض همون ۳۰ روز حالت تیک‌خورده
        token.exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
        token.sid = newSessionId();
        // ورود گوگل از داخل این callback هدر درخواست رو نداره، پس
        // دستگاه «نامشخص» ثبت می‌شه؛ خود ابطال نشست کامل کار می‌کنه.
        await createDeviceSession({
          userId: dbUser.id, sid: token.sid as string, provider: "google",
          expiresAt: new Date((token.exp as number) * 1000),
        }).catch(() => {});
        return token;
      }

      if (user) {
        token.userId = (user as any).id;
        token.name = (user as any).name;
        token.market = (user as any).market;
        token.isSuperAdmin = (user as any).isSuperAdmin;
        const remember = (user as any).remember !== false;
        const maxAgeSeconds = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24;
        token.exp = Math.floor(Date.now() / 1000) + maxAgeSeconds;
        token.sid = newSessionId();
        await createDeviceSession({
          userId: (user as any).id,
          sid: token.sid as string,
          provider: (user as any).loginProvider || "credentials",
          ip: (user as any).loginIp,
          userAgent: (user as any).loginUserAgent,
          expiresAt: new Date((token.exp as number) * 1000),
        }).catch(() => {});
        return token;
      }

      // هر درخواست بعدی: اگه این نشست از یه دستگاه دیگه ابطال شده باشه،
      // توکن باید همین‌جا بمیره. (بررسی با کش ۶۰ثانیه‌ای، نه یک کوئری به‌ازای
      // هر درخواست — نگاه کن به lib/deviceSessions.ts.)
      if (token.sid) {
        const live = await isSessionLive(token.sid as string).catch(() => true);
        if (!live) return {} as any;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.userId;
        (session.user as any).name = token.name;
        (session.user as any).market = token.market;
        (session.user as any).isSuperAdmin = token.isSuperAdmin;
      }
      return session;
    },
  },
};
