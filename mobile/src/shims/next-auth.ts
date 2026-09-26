// shimِ `next-auth` (ریشه) — کلاینت فقط تایپ‌هاش رو لازم داره.
// getServerSession سرور-فقطه؛ اگه از گرافِ کلاینت برسه serverOnlyGuard خطا می‌ده.
export type DefaultSession = {
  user?: { name?: string | null; email?: string | null; image?: string | null };
  expires: string;
};

export type Session = DefaultSession & {
  user?: DefaultSession["user"] & { id?: string; isSuperAdmin?: boolean; isAdmin?: boolean; [key: string]: unknown };
};

export type User = { id: string; name?: string | null; email?: string | null; image?: string | null };

export type NextAuthOptions = Record<string, unknown>;

export function getServerSession(..._args: unknown[]): Promise<Session | null> {
  throw new Error("getServerSession is server-only");
}
