// تبدیل جدول به CSV — منطق خالص (بدون وابستگی سروری) و تست‌دار.
// قالب برای Excel ساخته شده: BOM یو‌تی‌اف8 تا متن فارسی درست باز بشه،
// جداکننده‌ی ویرگول و پایان خط CRLF (RFC 4180).

export type Cell = string | number | boolean | null | undefined | Cell[] | { [k: string]: Cell };

export const CSV_BOM = "﻿";

/** تبدیل هر مقدار به متن ساده: عدد با ارقام لاتین، آرایه با « | »، شیء به JSON */
export function cellToString(v: Cell): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (Array.isArray(v)) return v.map(cellToString).join(" | ");
  return JSON.stringify(v);
}

/**
 * جلوگیری از فرمول‌شدن سلول در Excel (CSV injection): متنی که با = + - @ یا
 * تب/CR شروع بشه یک نقل‌قول تک اولش می‌گیره. فقط روی *متن* اعمال می‌شه، نه
 * عددهای واقعی (سود منفی باید منفی بمونه).
 */
export function neutralizeFormula(s: string): string {
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

export function csvEscape(v: Cell): string {
  const raw = cellToString(v);
  const s = typeof v === "string" || Array.isArray(v) ? neutralizeFormula(raw) : raw;
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function toCsv(columns: string[], rows: Record<string, Cell>[], opts: { bom?: boolean } = {}): string {
  const lines = [columns.map(csvEscape).join(",")];
  for (const r of rows) lines.push(columns.map((c) => csvEscape(r[c])).join(","));
  return (opts.bom === false ? "" : CSV_BOM) + lines.join("\r\n") + "\r\n";
}
