import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        // «identifier» می‌تونه ایمیل، شماره موبایل، یا یوزرنیم باشه —
        // یک فیلد ورودی، سه راه ورود.
        identifier: { label: "Email / Phone / Username", type: "text" },
        password: { label: "Password", type: "password" },
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
          // این‌جا اگه دیتابیس اصلاً در دسترس نباشه (DATABASE_URL غلط،
          // Postgres خاموش، migration اجرا نشده) گیر می‌افتیم — به‌جای اینکه
          // بذاریم NextAuth یه 401 مبهم بده، خطای واقعی رو لاگ می‌کنیم.
          console.error(`[auth] DATABASE ERROR during login — is Postgres running and DATABASE_URL correct? ${err?.message || err}`);
          return null;
        }
        if (!user || !user.passwordHash) {
          console.warn(`[auth] no user found for identifier "${id}"`);
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          console.warn(`[auth] wrong password for identifier "${id}"`);
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          market: user.market,
          isSuperAdmin: user.isSuperAdmin,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = (user as any).id;
        token.market = (user as any).market;
        token.isSuperAdmin = (user as any).isSuperAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.userId;
        (session.user as any).market = token.market;
        (session.user as any).isSuperAdmin = token.isSuperAdmin;
      }
      return session;
    },
  },
};
