import { prisma } from "@/lib/prisma";

// فلگ‌های ادمینی توی JWT فقط موقع لاگین ست می‌شدن — یعنی دادن/گرفتن نقش
// تا لاگین بعدی اثر نمی‌کرد. callback  jwt هر درخواست از این کش ۶۰ثانیه‌ای
// می‌خونه (نه یک کوئری به‌ازای هر درخواست). گیت واقعی پنل همیشه مستقیم از
// دیتابیسه (lib/requireAdmin.ts)؛ این فقط برای منو و requireSuperAdmin.
const TTL_MS = 60_000;
const cache = new Map<string, { until: number; isSuperAdmin: boolean; isAdmin: boolean }>();

export async function getAdminFlags(userId: string): Promise<{ isSuperAdmin: boolean; isAdmin: boolean } | null> {
  const hit = cache.get(userId);
  if (hit && hit.until > Date.now()) return hit;
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { isSuperAdmin: true, adminPermissions: true } });
  if (!u) return null;
  const v = { until: Date.now() + TTL_MS, isSuperAdmin: u.isSuperAdmin, isAdmin: u.isSuperAdmin || u.adminPermissions.length > 0 };
  cache.set(userId, v);
  return v;
}

export function invalidateAdminFlagCache(userId: string) {
  cache.delete(userId);
}
