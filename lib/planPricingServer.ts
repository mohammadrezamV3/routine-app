import { prisma } from "@/lib/prisma";
import { getAppSetting, invalidateAppSettingsCache, setAppSetting } from "@/lib/appSettings";
import { PLAN_PRICING_SETTING_KEY, PricingConfig, normalizePricingConfig } from "@/lib/planPricing";

// خواندن/نوشتن قیمت پلن‌ها (AppSetting با کلید plan_pricing). دو مسیر خواندن:
// - نمایش (صفحه‌ها، /api/pricing، /api/plans): کش 60 ثانیه‌ای lib/appSettings
//   که با ذخیره از پنل همون لحظه پاک می‌شه.
// - پرداخت (checkout): `fresh` — مستقیم از دیتابیس، تا قیمت تازه‌ی ذخیره‌شده
//   حتی روی worker دیگه‌ای که کشش هنوز پاک نشده فورا روی خرید جدید اعمال بشه.

export async function getPricingConfig(opts?: { fresh?: boolean }): Promise<PricingConfig> {
  if (opts?.fresh) {
    try {
      const row = await prisma.appSetting.findUnique({ where: { key: PLAN_PRICING_SETTING_KEY } });
      return normalizePricingConfig(row?.value ?? null);
    } catch {
      return normalizePricingConfig(null);
    }
  }
  return normalizePricingConfig(await getAppSetting<unknown>(PLAN_PRICING_SETTING_KEY, null));
}

/** آیا Owner قیمتی ذخیره کرده (در برابر پیش‌فرض کد)؟ — فقط برای پنل */
export async function hasSavedPricing(): Promise<boolean> {
  const row = await prisma.appSetting.findUnique({ where: { key: PLAN_PRICING_SETTING_KEY }, select: { key: true } });
  return !!row;
}

export async function setPricingConfig(cfg: PricingConfig) {
  await setAppSetting(PLAN_PRICING_SETTING_KEY, cfg);
}

/** برگشت به پیش‌فرض کد: ردیف ذخیره‌شده پاک می‌شه */
export async function resetPricingConfig() {
  await prisma.appSetting.deleteMany({ where: { key: PLAN_PRICING_SETTING_KEY } });
  invalidateAppSettingsCache();
}
