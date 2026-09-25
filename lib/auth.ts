import type { NextAuthOptions } from "next-auth";
import { encode as encodeJwt } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { Market } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BASIC_MODULES } from "@/lib/modules";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { logError } from "@/lib/errorLog";
import { isValidEmail } from "@/lib/validate";
import { verifyAndConsumeEmailOtp } from "@/lib/emailOtp";
import { verifyPasswordLogin, verifySmsTwoFactorLogin, recordLoginEvent } from "@/lib/credentials";
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
  // امنیتِ کوکیِ نشست نباید بی‌صدا به پروتکلِ NEXTAUTH_URL وابسته باشد.
  //
  // پیش‌فرضِ next-auth این است: `useSecureCookies = NEXTAUTH_URL شروع‌شونده با
  // https`. مشکلش اینجاست که این اپ پشتِ Cloudflare/nginx اجرا می‌شود و
  // مرورگرِ کاربر همیشه https می‌بیند، ولی خودِ Node ممکن است http سرو کند
  // و اپراتور NEXTAUTH_URL را http بگذارد (lib/siteUrl.ts دقیقاً همین حالتِ
  // Cloudflare Flexible را توضیح می‌دهد). آن‌وقت کوکیِ نشست **بدونِ فلگِ
  // Secure و بدونِ پیشوندِ `__Secure-`** ست می‌شد — یعنی روی یک درخواستِ
  // اتفاقیِ http در معرضِ شنود قرار می‌گرفت.
  //
  // پس در production همیشه Secure می‌کنیم (پشتِ https کاملاً درست کار می‌کند)،
  // با یک درِ فرار برای دیپلویِ واقعاً plain-http:  AUTH_COOKIE_SECURE=0.
  useSecureCookies:
    process.env.AUTH_COOKIE_SECURE != null
      ? process.env.AUTH_COOKIE_SECURE === "1"
      : process.env.NODE_ENV === "production",
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
    // ورود با گوگل طبق درخواست صریح کامل حذف شد — تنها راه ورود، شماره‌ی
    // موبایل (و یوزرنیم/ایمیلِ همان حساب) با رمز است.
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

        const ip = getClientIp((req?.headers as any) || {});
        const userAgent = (req?.headers as any)?.["user-agent"] || null;

        // کل بررسی (rate limit ۸/۱۰دقیقه روی IP و شناسه، جستجوی کاربر،
        // مسدودی، bcrypt، و ردِ ورود وقتی دومرحله‌ای روشنه) حالا توی
        // lib/credentials.ts مشترکه تا ورودِ اپ موبایل عینا همین قواعد رو
        // بگیره. دومرحله‌ای روشن → این مسیر به‌تنهایی نشست صادر نمی‌کنه؛
        // فرانت اول /api/auth/2fa/start و بعد provider «sms-2fa» رو می‌زنه.
        const result = await verifyPasswordLogin({ identifier: credentials.identifier, password: credentials.password, ip });
        if (!result.ok) return null;
        const user = result.user;

        // پنل کاربری › امنیت › «ورودهای اخیر» — فقط یک لاگ append-only،
        // نه چیزی که خود فلوی ورود بهش وابسته باشه.
        recordLoginEvent(user.id, "credentials", ip, userAgent);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          market: user.market,
          isSuperAdmin: user.isSuperAdmin,
          remember: credentials.remember !== "0",
          // به callback  jwt می‌رسن تا ردیف «دستگاه فعال» با مشخصات درست ساخته بشه
          loginIp: ip,
          loginUserAgent: userAgent,
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
        if (!(await checkRateLimit(`email-otp-authorize-ip:${ip}`, 20, 10 * 60 * 1000)) || !(await checkRateLimit(`email-otp-authorize-email:${email}`, 10, 10 * 60 * 1000))) {
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
        const ip = getClientIp((req?.headers as any) || {});
        const userAgent = (req?.headers as any)?.["user-agent"] || null;

        // اعتبارسنجی + مصرفِ کد (با rate limit) توی lib/credentials.ts مشترکه
        // — همون تابعی که /api/mobile/auth/verify-2fa صدا می‌زنه.
        const result = await verifySmsTwoFactorLogin({ identifier: credentials.identifier, code: credentials.code, ip });
        if (!result.ok) return null;
        const user = result.user;

        recordLoginEvent(user.id, "sms-2fa", ip, userAgent);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          market: user.market,
          isSuperAdmin: user.isSuperAdmin,
          remember: credentials.remember !== "0",
          loginIp: ip,
          loginUserAgent: userAgent,
          loginProvider: "sms-2fa",
        } as any;
      },
    }),
  ],
  callbacks: {
    // «منو به‌یاد داشته باش» تیک نخورده → توکن رو کوتاه‌مدت می‌کنیم (۱ روز)
    // به‌جای پیش‌فرض ۳۰ روزه‌ی next-auth؛ چون کوکی خودش همیشه با maxAge
    // استاتیک ست می‌شه (نه به‌ازای هر لاگین)، این‌جوری واقعا session رو کوتاه
    // می‌کنیم: بعد از یک روز، exp توکن رد می‌شه و useSession/getServerSession
    // خودشون session رو نامعتبر می‌دونن، حتی اگه کوکی خامش هنوز تو مرورگره.
    async jwt({ token, user, account }) {

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
