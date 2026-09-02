// معادل میلادی lib/jalali.ts — برای حالتی که کاربر توی ترید تقویم شمسی رو با
// میلادی عوض می‌کنه. برخلاف jalali.ts (که عمدا ساده‌سازی‌شده)، اینجا از Date
// بومی جاوااسکریپت استفاده می‌شه چون کبیسه‌ی میلادی رو خودش درست حساب می‌کنه.

import { pad } from "./jalali";

export const G_MONTHS = [
  "ژانویه", "فوریه", "مارس", "آوریل", "مه", "ژوئن",
  "ژوئیه", "اوت", "سپتامبر", "اکتبر", "نوامبر", "دسامبر",
];

// month یک‌مبنایی (۱=ژانویه..۱۲=دسامبر)
export function gregorianMonthLength(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// هم‌فرمت با formatJalali — سال/ماه/روز نوشته می‌شود تا خواندن از راست
// (در چیدمان RTL) روز، ماه، سال باشد. توضیح کامل دلیل کنار formatJalali.
export function formatGregorian(y: number, m: number, d: number): string {
  return `${y}/${pad(m)}/${pad(d)}`;
}
