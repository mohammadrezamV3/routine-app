// ─────────────────────────────────────────────────────────────────────────
// سمت «انتشار» realtime — از داخل route handlerها صدا زده می‌شه.
//
// چرا Postgres NOTIFY و نه یه Map در-حافظه: پروداکشن با cluster.js چند
// worker داره و سوکت گیرنده ممکنه روی worker دیگه‌ای باشه (حتی دو دستگاه
// یک کاربر). هر worker یک کلاینت pg داره که روی کانال `arion_rt` LISTEN
// می‌کنه (lib/realtimeServer.ts) و پیام رو به سوکت‌های محلی همون userIdها
// می‌رسونه. انتشار هم از همون کانکشن‌پول Prisma رد می‌شه — صفر زیرساخت تازه
// (نه Redis، نه کانتینر جدید).
//
// قواعد:
//  • payload فقط متادیتاست (نوع + کلید/شناسه) — نگاه کن به lib/realtimeProtocol.ts.
//  • fire-and-forget: شکست انتشار هیچ‌وقت نباید پاسخ خود API رو خراب کنه.
//  • pg_notify با پارامتر صدا زده می‌شه (tagged template ⇒ $1/$2)، نه رشته‌ی
//    چسبونده — پس تزریق SQL ممکن نیست.
// ─────────────────────────────────────────────────────────────────────────

import { decode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import {
  REALTIME_CHANNEL,
  buildNotifyPayloads,
  parseCookieHeader,
  pickSessionTokens,
  type ServerEvent,
} from "@/lib/realtimeProtocol";

export type { ServerEvent } from "@/lib/realtimeProtocol";

function realtimeDisabled(): boolean {
  return process.env.REALTIME_DISABLED === "1";
}

async function notifyRaw(payload: string): Promise<void> {
  await prisma.$executeRaw`SELECT pg_notify(${REALTIME_CHANNEL}, ${payload})`; // sql-safety-ok: tagged template → پارامتری ($1,$2)؛ کانال ثابت و payload فقط JSON متادیتاست
}

/** رویداد رو به همه‌ی سوکت‌های (همه‌ی دستگاه‌ها/تب‌های) این کاربرها می‌رسونه */
export function publishToUsers(userIds: readonly (string | null | undefined)[], event: ServerEvent): Promise<void> {
  if (realtimeDisabled()) return Promise.resolve();
  const ids = userIds.filter((x): x is string => typeof x === "string" && x.length > 0);
  if (!ids.length) return Promise.resolve();
  let payloads: string[];
  try {
    payloads = buildNotifyPayloads(ids, event);
  } catch {
    return Promise.resolve();
  }
  return Promise.all(payloads.map((p) => notifyRaw(p)))
    .then(() => undefined)
    .catch((err) => {
      // عمدا فقط لاگ — realtime یه بهبود تجربه‌ست، نه بخشی از تراکنش اصلی
      console.warn(`[realtime] publish failed: ${err?.message || err}`);
    });
}

export function publishToUser(userId: string | null | undefined, event: ServerEvent): Promise<void> {
  return publishToUsers([userId], event);
}

/** «داده‌ی این دامنه‌ها عوض شد» برای بقیه‌ی دستگاه‌ها/تب‌های خود کاربر */
export function publishDataChanged(userId: string | null | undefined, keys: string[], src?: string | null): Promise<void> {
  return publishToUser(userId, { type: "data.changed", keys, ...(src ? { src } : {}) });
}

/** شناسه‌ی تب نویسنده (اختیاری) — کلاینت با هدر x-arion-client می‌فرسته */
export function clientTabId(req: Request | { headers?: Headers } | null | undefined): string | undefined {
  const v = (req as any)?.headers?.get?.("x-arion-client");
  return typeof v === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(v) ? v : undefined;
}

/**
 * userId از کوکی نشست — فقط دیکد JWT (بدون دیتابیس). فقط بعد از این‌که
 * خود روت با getServerSession احراز کرده و موفق برگشته استفاده می‌شه، پس
 * این‌جا فقط «این پاسخ مال کی بود» رو می‌پرسیم، نه مجوز.
 */
export async function userIdFromCookieHeader(cookieHeader: string | null | undefined): Promise<string | null> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  for (const token of pickSessionTokens(parseCookieHeader(cookieHeader))) {
    try {
      const jwt = await decode({ token, secret });
      const id = (jwt as any)?.userId;
      if (typeof id === "string" && id) return id;
    } catch {
      // کوکی بعدی (اگه هر دو اسم ست باشن)
    }
  }
  return null;
}

type KeysSpec<A extends unknown[]> = string[] | ((req: Request, ...rest: A) => string[] | null | undefined);

/**
 * بسته‌بندی یک route handler نوشتنی: اگه پاسخ ۲xx بود، `data.changed` با
 * همین کلیدها به بقیه‌ی دستگاه‌های همون کاربر می‌ره. همه‌ی مسیرهای return
 * (خطا/اعتبارسنجی/…) خودکار پوشش داده می‌شن و خود handler دست نمی‌خوره.
 *
 *   export const POST = withLiveSync(["trade"], async (req: Request) => { … });
 */
export function withLiveSync<A extends unknown[], R extends Request>(
  keys: KeysSpec<A>,
  handler: (req: R, ...rest: A) => Promise<Response> | Response,
): (req: R, ...rest: A) => Promise<Response> {
  return async (req: R, ...rest: A) => {
    const res = await handler(req, ...rest);
    if (res.status >= 200 && res.status < 300 && !realtimeDisabled()) {
      // بعد از ساختن پاسخ و بدون await — تاخیری به درخواست اضافه نمی‌شه
      void (async () => {
        try {
          const list = typeof keys === "function" ? keys(req, ...rest) : keys;
          if (!list || !list.length) return;
          const userId = await userIdFromCookieHeader(req.headers.get("cookie"));
          if (userId) await publishDataChanged(userId, list, clientTabId(req));
        } catch {
          // بی‌صدا
        }
      })();
    }
    return res;
  };
}
