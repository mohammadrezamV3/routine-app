import { prisma } from "@/lib/prisma";
import { getNomoFreeUses } from "@/lib/aiQuota";
import { ROUTINE_ASSISTANT_USES_KEY } from "@/lib/userSettingKeys";
import { toJalali, faNum, J_MONTHS } from "@/lib/jalali";
import { DAY_NAME_FA, nomoUnlimitedFor } from "@/lib/routineAssistant";
import { addDaysIso } from "@/lib/schedule";

// بخش‌های مشترک بین دو روت نومو (/api/routine/assistant برای برنامه‌ها و
// /api/nomo/agent برای گفت‌وگو و عملیات چندبخشی): سهمیه و تاریخ «امروز».

/**
 * کلید پلن‌های اشتراک فعال کاربر (ACTIVE/TRIAL و منقضی‌نشده). شرط
 * currentPeriodEnd لازم است چون ردیف منقضی ممکن است هنوز status قدیمی
 * داشته باشد.
 */
export async function activePlanKeys(userId: string): Promise<string[]> {
  const subs = await prisma.subscription.findMany({
    where: { userId, status: { in: ["ACTIVE", "TRIAL"] }, currentPeriodEnd: { gt: new Date() } },
    select: { plan: { select: { key: true } } },
  });
  return subs.map((s) => s.plan.key);
}

/**
 * «نومو» مثل خود روتین کامل رایگان نیست:
 *   • سوپریوزر یا پلن فعال «روتین من» (basic) یا مکس → نامحدود (nomoUnlimitedFor)
 *   • بقیه (از جمله مشترک فقط بدنسازی یا ترید) → سهمیه‌ی مادام‌العمر پیام‌های رایگان (getNomoFreeUses، پیش‌فرض
 *     FREE_ASSISTANT_USES = ۱۰، قابل تغییر از پنل ادمین)
 */
export async function assistantAccess(userId: string, isSuperAdmin: boolean): Promise<{ unlimited: boolean; freeLimit: number }> {
  if (isSuperAdmin || nomoUnlimitedFor(await activePlanKeys(userId))) return { unlimited: true, freeLimit: 0 };
  return { unlimited: false, freeLimit: await getNomoFreeUses() };
}

export async function readUses(userId: string): Promise<number> {
  const row = await prisma.userSetting.findUnique({
    where: { userId_key: { userId, key: ROUTINE_ASSISTANT_USES_KEY } },
    select: { value: true },
  });
  const n = Number(row?.value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export async function writeUses(userId: string, value: number): Promise<void> {
  await prisma.userSetting.upsert({
    where: { userId_key: { userId, key: ROUTINE_ASSISTANT_USES_KEY } },
    create: { userId, key: ROUTINE_ASSISTANT_USES_KEY, value },
    update: { value },
  });
}

/** امروز به وقت ایران — سرور (Docker) معمولا UTC است و بین ۰۰:۰۰ تا ۰۳:۳۰
 *  بامداد ایران، `new Date()` سرور هنوز «دیروز» را می‌دهد. */
export function tehranTodayIso(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  } catch {
    return new Date(Date.now() + 3.5 * 3600_000).toISOString().slice(0, 10);
  }
}

/**
 * «امروز» کاربر. ریشه‌ی باگ «روز اشتباه»: قبلا سرور با ساعت خودش
 * (UTC) امروز را حساب می‌کرد و «فردا»ی کاربر نیمه‌شب‌ها یک روز عقب ثبت
 * می‌شد. حالا تاریخ محلی دستگاه کاربر ملاک است — ولی چون از کلاینت
 * می‌آید، فقط اگر حداکثر یک روز با تاریخ ایران فاصله داشته باشد پذیرفته
 * می‌شود.
 */
export function resolveToday(raw: unknown): string {
  const tehran = tehranTodayIso();
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return tehran;
  const ok = [addDaysIso(tehran, -1), tehran, addDaysIso(tehran, 1)].includes(raw);
  return ok ? raw : tehran;
}

export function jalaliLabel(iso: string, withWeekday = true): string {
  const d = new Date(iso + "T00:00:00");
  const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const text = `${faNum(j[2])} ${J_MONTHS[j[1] - 1]} ${faNum(j[0])}`;
  return withWeekday ? `${DAY_NAME_FA[d.getDay()]} ${text}` : text;
}

