// معادل میلادی jalali.ts — پورت از lib/gregorian.ts وب.
import { pad } from "./jalali";

export const G_MONTHS = [
  "ژانویه", "فوریه", "مارس", "آوریل", "مه", "ژوئن",
  "ژوئیه", "اوت", "سپتامبر", "اکتبر", "نوامبر", "دسامبر",
];

export function gregorianMonthLength(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function formatGregorian(y: number, m: number, d: number): string {
  return `${y}/${pad(m)}/${pad(d)}`;
}
