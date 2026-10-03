import { prisma } from "@/lib/prisma";
import { SETTING_KEYS } from "@/lib/userSettingKeys";

// ترجیح دریافت «هفته‌نامه» — UserSetting با کلید weeklyLetterPrefs. فقط
// ایمیل قابل خاموش‌کردنه (اعلان درون‌برنامه‌ای همیشه میاد). پیش‌فرض: روشن.
export type LetterPrefs = { email: boolean };

export function normalizePrefs(v: unknown): LetterPrefs {
  const email = v && typeof v === "object" ? (v as { email?: unknown }).email : undefined;
  return { email: email !== false };
}

export async function getLetterPrefs(userId: string): Promise<LetterPrefs> {
  const row = await prisma.userSetting.findUnique({ where: { userId_key: { userId, key: SETTING_KEYS.weeklyLetterPrefs } }, select: { value: true } });
  return normalizePrefs(row?.value);
}

export async function setLetterPrefs(userId: string, prefs: LetterPrefs): Promise<LetterPrefs> {
  const value = { email: !!prefs.email };
  await prisma.userSetting.upsert({
    where: { userId_key: { userId, key: SETTING_KEYS.weeklyLetterPrefs } },
    create: { userId, key: SETTING_KEYS.weeklyLetterPrefs, value },
    update: { value },
  });
  return value;
}
