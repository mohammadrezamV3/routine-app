// یکسان‌سازی و اعتبارسنجی رشته‌ی جستجو — خالص و بدون وابستگی.
// حذف کاراکترهای کنترلی/نامرئی، فشرده‌کردن فاصله‌ها، سقف طول، حداقل طول و
// رد الگوهای بیمارگونه (فقط علامت، تکرار طولانی یک کاراکتر).

export type QueryRules = { min?: number; max?: number };
export type QueryResult = { ok: true; q: string } | { ok: false; reason: "too_short" | "pathological" };

// کنترلی ASCII/C1، صفر-عرض، جهت‌نمای دوطرفه (bidi override)، BOM
const STRIP = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁤⁦-⁩﻿]/g;

export function normalizeQuery(raw: unknown, rules: QueryRules = {}): QueryResult {
  const min = rules.min ?? 2;
  const max = rules.max ?? 60;
  if (typeof raw !== "string") return min <= 0 ? { ok: true, q: "" } : { ok: false, reason: "too_short" };
  // قبل از هر کار سنگینی، رشته‌ی خیلی بلند بریده می‌شه
  let q = raw.slice(0, max * 4).replace(STRIP, " ").replace(/\s+/g, " ").trim().slice(0, max).trim();
  if (q.length === 0 && min <= 0) return { ok: true, q: "" };
  if (q.length < Math.max(1, min)) return { ok: false, reason: "too_short" };
  if (!/[\p{L}\p{N}]/u.test(q)) return { ok: false, reason: "pathological" };
  if (/([\s\S])\1{19,}/u.test(q)) return { ok: false, reason: "pathological" };
  if (q.length >= 8) {
    const alnum = (q.match(/[\p{L}\p{N}]/gu) || []).length;
    if (alnum / q.length < 0.3) return { ok: false, reason: "pathological" };
  }
  return { ok: true, q };
}
