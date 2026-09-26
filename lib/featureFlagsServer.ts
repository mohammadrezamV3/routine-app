import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAppSetting, setAppSetting } from "@/lib/appSettings";
import { getAdminFlags } from "@/lib/adminFlag";
import { FeatureFlags, FeatureKey, featureAllowed, normalizeFlags } from "@/lib/featureFlags";

const KEY = "feature_flags";

export async function getFeatureFlags(): Promise<FeatureFlags> {
  return normalizeFlags(await getAppSetting<unknown>(KEY, null));
}

export async function setFeatureFlags(flags: FeatureFlags) {
  await setAppSetting(KEY, flags);
}

// نقشِ کاربر برای تصمیمِ فلگ — از کشِ ۶۰ثانیه‌ایِ adminFlag (نه JWT)
async function whoIs(userId: string | undefined) {
  if (!userId) return { isSuperAdmin: false, isAdmin: false };
  const f = await getAdminFlags(userId).catch(() => null);
  return { isSuperAdmin: !!f?.isSuperAdmin, isAdmin: !!f?.isAdmin };
}

/** وضعیتِ همه‌ی قابلیت‌ها برای این کاربر (true/false) — برای /api/features */
export async function resolveFeaturesFor(userId: string | undefined): Promise<Record<FeatureKey, boolean>> {
  const [flags, who] = await Promise.all([getFeatureFlags(), whoIs(userId)]);
  return Object.fromEntries(Object.entries(flags).map(([k, m]) => [k, featureAllowed(m, who)])) as Record<FeatureKey, boolean>;
}

export async function isFeatureEnabled(key: FeatureKey, userId: string | undefined): Promise<boolean> {
  const [flags, who] = await Promise.all([getFeatureFlags(), whoIs(userId)]);
  return featureAllowed(flags[key], who);
}

/** پاسخِ ۴۰۳ اگه قابلیت برای این کاربر خاموشه، وگرنه null */
export async function featureBlocked(key: FeatureKey, userId: string | undefined): Promise<NextResponse | null> {
  if (await isFeatureEnabled(key, userId)) return null;
  return NextResponse.json({ error: "این بخش موقتا غیرفعال است" }, { status: 403 });
}

// جایگزینِ requireSuperAdmin برای بخش‌هایی که قبلا با قفلِ سطح کد بسته بودن
// (رودمپ) — همون شکلِ خروجی، ولی حالا تصمیم با فلگِ پنل ادمینه.
export type FeatureGuardResult = { ok: true; userId: string; isSuperAdmin: boolean } | { ok: false; response: NextResponse };

export async function requireFeature(key: FeatureKey): Promise<FeatureGuardResult> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return { ok: false, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { isBlocked: true } });
  if (u?.isBlocked) return { ok: false, response: NextResponse.json({ error: "حساب کاربری مسدود شده است" }, { status: 403 }) };
  const blocked = await featureBlocked(key, userId);
  if (blocked) return { ok: false, response: blocked };
  return { ok: true, userId, isSuperAdmin: !!(session!.user as any).isSuperAdmin };
}
