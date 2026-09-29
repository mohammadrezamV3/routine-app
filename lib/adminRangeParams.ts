import { NextResponse } from "next/server";
import { rangeFromSearchParams, type Range } from "@/lib/adminAnalytics";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_SPAN_MS = 5 * 366 * 86400000;

// بازه‌ی زمانیِ روت‌های تحلیلیِ پنل، با اعتبارسنجیِ «بازه‌ی دلخواه».
// rangeFromSearchParams به‌تنهایی: ۱) «to»ی YYYY-MM-DD رو نیمه‌شبِ *شروعِ*
// همون روز می‌گرفت، یعنی کلِ روزِ آخر از بازه بیرون می‌افتاد (و from=to یعنی
// بازه‌ی صفر)، ۲) تاریخِ نامعتبر → Invalid Date → خطای ۵۰۰ از Prisma،
// ۳) from > to رو بی‌صدا یه بازه‌ی خالی/منفی حساب می‌کرد.
export function parseAdminRange(sp: URLSearchParams): { ok: true; range: Range } | { ok: false; response: NextResponse } {
  const range = rangeFromSearchParams(sp);
  if (range.key !== "custom") return { ok: true, range };

  const fromRaw = sp.get("from") || "";
  const toRaw = sp.get("to") || "";
  const bad = (msg: string) => ({ ok: false as const, response: NextResponse.json({ error: msg }, { status: 400 }) });
  if (!DATE_RE.test(fromRaw) || !DATE_RE.test(toRaw)) return bad("بازه‌ی زمانی نامعتبر است");

  const from = new Date(`${fromRaw}T00:00:00.000Z`);
  const to = new Date(`${toRaw}T23:59:59.999Z`);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return bad("بازه‌ی زمانی نامعتبر است");
  if (from > to) return bad("تاریخِ شروع باید قبل از تاریخِ پایان باشد");
  if (to.getTime() - from.getTime() > MAX_SPAN_MS) return bad("بازه‌ی زمانی حداکثر 5 سال می‌تواند باشد");

  return { ok: true, range: { from, to, key: "custom" } };
}
