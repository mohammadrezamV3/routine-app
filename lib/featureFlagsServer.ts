import { NextResponse } from "next/server";
import { getSessionFast } from "@/lib/serverSession";
import { prisma } from "@/lib/prisma";
import { getAppSetting, setAppSetting } from "@/lib/appSettings";
import { getAdminFlags } from "@/lib/adminFlag";
import { FeatureFlags, FeatureKey, featureKeyAllowed, normalizeFlags, resolveFeatureMap } from "@/lib/featureFlags";

const KEY = "feature_flags";

// نسخه‌ی قرارداد ذخیره. PUT پنل ادمین همیشه *همه‌ی* کلیدها رو می‌نویسه، پس
// هر ردیفی که قبل از «داشبورد = صفحه‌ی اصلی همه» ذخیره شده `dashboard: "admins"`
// (پیش‌فرض قدیمی) رو صریح نگه داشته و عوض‌شدن پیش‌فرض بهش نمی‌رسید. ردیف بی‌نسخه
// با همون مقدار قدیمی یک بار «on» خونده می‌شه؛ «off» (انتخاب عمدی) دست نمی‌خوره
// و هر ذخیره‌ی بعدی نسخه رو می‌نویسه، پس «admins»ی که از این به بعد انتخاب بشه می‌مونه.
const FLAGS_REV = 2;

export async function getFeatureFlags(): Promise<FeatureFlags> {
  const raw = await getAppSetting<unknown>(KEY, null);
  const flags = normalizeFlags(raw);
  const rev = raw && typeof raw === "object" ? (raw as { _rev?: unknown })._rev : undefined;
  if (rev !== FLAGS_REV && flags.dashboard === "admins") flags.dashboard = "on";
  return flags;
}

export async function setFeatureFlags(flags: FeatureFlags) {
  await setAppSetting(KEY, { ...flags, _rev: FLAGS_REV });
}

// نقش کاربر برای تصمیم فلگ — از کش ۶۰ثانیه‌ای adminFlag (نه JWT)
async function whoIs(userId: string | undefined) {
  if (!userId) return { isSuperAdmin: false, isAdmin: false };
  const f = await getAdminFlags(userId).catch(() => null);
  return { isSuperAdmin: !!f?.isSuperAdmin, isAdmin: !!f?.isAdmin };
}

/** وضعیت همه‌ی قابلیت‌ها برای این کاربر (true/false) — برای /api/features */
export async function resolveFeaturesFor(userId: string | undefined): Promise<Record<FeatureKey, boolean>> {
  const [flags, who] = await Promise.all([getFeatureFlags(), whoIs(userId)]);
  return resolveFeatureMap(flags, who);
}

export async function isFeatureEnabled(key: FeatureKey, userId: string | undefined): Promise<boolean> {
  const [flags, who] = await Promise.all([getFeatureFlags(), whoIs(userId)]);
  // زیربخش (مثلا تقویم اقتصادی) فقط وقتی مجازه که مادرش (ترید) هم مجاز باشه
  return featureKeyAllowed(flags, key, who);
}

/**
 * صفحه‌ی اصلی کاربر واردشده سمت سرور: داشبورد → روتین → پنل کاربری. ادمین
 * می‌تونه هر دو بخش اول رو خاموش کنه؛ پنل کاربری هیچ‌وقت فلگ نداره، پس
 * کاربر هیچ‌وقت پشت قفل نمی‌مونه.
 */
export async function serverHomePath(userId: string | undefined): Promise<string> {
  if (!userId) return "/";
  const m = await resolveFeaturesFor(userId);
  if (m.dashboard) return "/dashboard";
  if (m.routine) return "/weekly";
  return "/account";
}

/** پاسخ ۴۰۳ اگه قابلیت برای این کاربر خاموشه، وگرنه null */
export async function featureBlocked(key: FeatureKey, userId: string | undefined): Promise<NextResponse | null> {
  if (await isFeatureEnabled(key, userId)) return null;
  return NextResponse.json({ error: "این بخش موقتا غیرفعال است" }, { status: 403 });
}

// جایگزین requireSuperAdmin برای بخش‌هایی که قبلا با قفل سطح کد بسته بودن
// (رودمپ) — همون شکل خروجی، ولی حالا تصمیم با فلگ پنل ادمینه.
export type FeatureGuardResult = { ok: true; userId: string; isSuperAdmin: boolean } | { ok: false; response: NextResponse };

export async function requireFeature(key: FeatureKey): Promise<FeatureGuardResult> {
  const session = await getSessionFast();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return { ok: false, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  // چک مسدودبودن و فلگ مستقل‌اند → هم‌زمان
  const [u, blocked] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { isBlocked: true } }),
    featureBlocked(key, userId),
  ]);
  if (u?.isBlocked) return { ok: false, response: NextResponse.json({ error: "حساب کاربری مسدود شده است" }, { status: 403 }) };
  if (blocked) return { ok: false, response: blocked };
  return { ok: true, userId, isSuperAdmin: !!(session!.user as any).isSuperAdmin };
}

/**
 * گیت فلگ برای روت‌هایی که خودشون سشن رو جدا می‌خونن (یا با requireModule):
 * اول هر هندلر صدا زده می‌شه و اگه بخش برای این کاربر خاموش باشه همون پاسخ
 * ۴۰۳ «موقتا غیرفعال» رو می‌ده. کاربر واردنشده هم با نقش مهمان سنجیده می‌شه
 * (حالت «فقط ادمین‌ها»/«خاموش» یعنی بسته)؛ احراز هویت خود روت بعدش میاد.
 */
export async function sessionFeatureBlocked(key: FeatureKey): Promise<NextResponse | null> {
  const session = await getSessionFast();
  return featureBlocked(key, (session?.user as any)?.id as string | undefined);
}
