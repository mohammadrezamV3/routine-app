import { prisma } from "@/lib/prisma";
import { getAppSetting, setAppSetting, invalidateAppSettingsCache } from "@/lib/appSettings";
import { EVENT_THEMES, eventThemeById } from "@/lib/eventThemes";
import {
  EVENT_DISCOUNT_KEY,
  DEFAULT_EVENT_DISCOUNT_STATE,
  eventDiscountSchedule,
  pendingEventDiscounts,
  sanitizeEventDiscountState,
  type EventDiscountState,
} from "@/lib/eventDiscount";

// تخفیف خودکار مناسبت‌ها — بخش دیتابیسی. منطق خالص در lib/eventDiscount.ts.
// ساخت کدها تنبل و با throttle اتفاق می‌افته (چک‌اوت، پنل ادمین، تبریک)، نه روی
// لود صفحه‌های عادی.

export async function getEventDiscountState(): Promise<EventDiscountState> {
  const raw = await getAppSetting<unknown>(EVENT_DISCOUNT_KEY, DEFAULT_EVENT_DISCOUNT_STATE);
  return sanitizeEventDiscountState(raw);
}

export async function setEventDiscountState(state: EventDiscountState) {
  await setAppSetting(EVENT_DISCOUNT_KEY, sanitizeEventDiscountState(state));
}

const THROTTLE_MS = 5 * 60_000;
let lastRun = 0;

/** هیچ‌وقت throw نمی‌کنه چون روی مسیر چک‌اوت صدا زده می‌شه */
export async function ensureEventDiscounts({ force = false }: { force?: boolean } = {}): Promise<void> {
  try {
    const nowMs = Date.now();
    if (!force && nowMs - lastRun < THROTTLE_MS) return;
    lastRun = nowMs;

    const state = await getEventDiscountState();
    const plans = pendingEventDiscounts(state, EVENT_THEMES, new Date(nowMs));
    if (plans.length === 0) return;

    const generated = { ...state.generated };
    for (const p of plans) {
      try {
        await prisma.discountCode.create({
          data: { code: p.code, percentOff: p.percent, planKey: null, expiresAt: p.expiresAt, active: true, maxUsesPerUser: 1 },
        });
      } catch (e: any) {
        // کدی با همین اسم از قبل هست (مثلا دستی ساخته شده): دست نمی‌خوره و ساخته‌شده حساب می‌شه
        if (e?.code !== "P2002") throw e;
      }
      generated[p.key] = p.code;
    }
    await setEventDiscountState({ ...state, generated });
    invalidateAppSettingsCache();
  } catch (e) {
    console.error("ensureEventDiscounts failed", e);
  }
}

/** کد زنده‌ی وقوع جاری یک مناسبت (برای تبریک)؛ فقط اگه ردیف دیتابیس فعال و منقضی‌نشده باشه */
export async function getLiveEventDiscount(
  themeId: string,
): Promise<{ code: string; percent: number; expiresAt: string | null } | null> {
  const theme = eventThemeById(themeId);
  if (!theme) return null;
  const state = await getEventDiscountState();
  const now = new Date();
  const cur = eventDiscountSchedule(state, [theme], now, 1).find((s) => s.live);
  const code = cur?.generatedCode;
  if (!code) return null;
  const row = await prisma.discountCode.findUnique({ where: { code } });
  if (!row || !row.active || (row.expiresAt && row.expiresAt <= now)) return null;
  return { code: row.code, percent: row.percentOff, expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null };
}
