import { headers } from "next/headers";
import { getServerSession, type Session } from "next-auth";
import { authOptions } from "@/lib/auth";

// خواندن سشن با حافظه‌ی خیلی کوتاه. getServerSession هر بار JWT رو رمزگشایی
// و callbackهای auth رو اجرا می‌کنه، و یک لود صفحه ده‌ها درخواست API هم‌زمان
// با *همون* کوکی می‌زنه (و هر روت خودش چند لایه گیت داره: فلگ، ماژول، روت).
// نتیجه‌ی سشن تابع خالص کوکیه، پس برای چند ثانیه با کلید خود هدر کوکی نگه
// داشته می‌شه. ابطال سشن از دستگاه دیگه و مسدودشدن کاربر هم‌چنان با کش‌های
// خود auth (۶۰ ثانیه) و چک مستقیم دیتابیس در requireModule اعمال می‌شن؛ این
// کش فقط چند ثانیه به اون‌ها اضافه می‌کنه. بیرون از scope درخواست (تست،
// کران) headers() خطا می‌ده و مستقیم به getServerSession برمی‌گردیم.
const TTL_MS = 3_000;
const MAX_ENTRIES = 500;
const memo = new Map<string, { at: number; p: Promise<Session | null> }>();

export async function getSessionFast(): Promise<Session | null> {
  let cookie = "";
  try {
    cookie = headers().get("cookie") ?? "";
  } catch {
    return getServerSession(authOptions);
  }
  if (!cookie) return getServerSession(authOptions);

  const now = Date.now();
  const hit = memo.get(cookie);
  if (hit && now - hit.at < TTL_MS) return hit.p;

  if (memo.size >= MAX_ENTRIES) {
    for (const [k, v] of memo) if (now - v.at >= TTL_MS) memo.delete(k);
    if (memo.size >= MAX_ENTRIES) memo.clear();
  }
  const p = getServerSession(authOptions);
  memo.set(cookie, { at: now, p });
  p.catch(() => { if (memo.get(cookie)?.p === p) memo.delete(cookie); });
  return p;
}
