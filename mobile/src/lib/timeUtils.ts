// پورت از lib/timeUtils.ts (وب).
import { toEnDigits, toFaDigits } from "./schedule";

export function normalizeTimeToFa(str: string): string {
  const en = toEnDigits(str).trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(en);
  if (m) {
    const hh = m[1].length === 1 ? "0" + m[1] : m[1];
    return toFaDigits(hh + ":" + m[2]);
  }
  const hOnly = /^(\d{1,2})$/.exec(en);
  if (hOnly) {
    const hh2 = hOnly[1].length === 1 ? "0" + hOnly[1] : hOnly[1];
    return toFaDigits(hh2 + ":00");
  }
  return toFaDigits(en);
}

export function formatTimeDigits(rawDigits: string): string {
  let digits = toEnDigits(rawDigits).replace(/\D/g, "").slice(0, 4);
  if (digits.length === 0) return "";
  if (digits.length === 1) return digits;
  let d0 = digits[0], d1 = digits[1];
  if (+d0 > 2) d0 = "2";
  if (d0 === "2" && +d1 > 3) d1 = "3";
  digits = d0 + d1 + digits.slice(2);
  if (digits.length >= 3) {
    let d2 = digits[2];
    if (+d2 > 5) d2 = "5";
    digits = digits.slice(0, 2) + d2 + digits.slice(3);
  }
  digits = digits.slice(0, 4);
  const hh = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  return mm.length ? hh + ":" + mm : hh;
}
