import { prisma } from "@/lib/prisma";

// تنظیمات سراسری اپ که Owner باید بتونه بدون دیپلوی عوض کنه. فقط سمت
// سرور خونده می‌شه، با یک کش کوتاه‌مدت در-حافظه (تک-instance، هم‌راستا با
// lib/rateLimit.ts) چون این مقادیر توی هر محاسبه‌ی هزینه‌ی AI لازمن.

const TTL_MS = 60_000;
const cache = new Map<string, { at: number; value: any }>();

async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as T;
  try {
    const row = await prisma.appSetting.findUnique({ where: { key } });
    const value = row ? (row.value as T) : fallback;
    cache.set(key, { at: Date.now(), value });
    return value;
  } catch {
    return fallback;
  }
}

export function invalidateAppSettingsCache() {
  cache.clear();
}

// نرخ هزینه‌ی تخمینی AI — به میکرو-دلار به‌ازای هر ۱۰۰۰ توکن. پیش‌فرض‌ها
// نرخ عمومی منتشرشده‌ی gpt-4o-mini هستن (ورودی $0.15 / خروجی $0.60 به‌ازای
// هر ۱M توکن)؛ چون این اپ از طریق گیت‌وی آروان‌کلود صدا زده می‌شه، نرخ
// واقعی قرارداد ممکنه فرق کنه — برای همین این مقدار از AppSetting قابل‌تنظیمه
// (پنل Owner › تنظیمات) و همه‌جا صراحتا «تخمینی» لیبل می‌خوره، نه قطعی.
export const DEFAULT_AI_COST_RATE = {
  inputPer1kUsdMicros: 150,   // $0.15 / 1M tokens
  outputPer1kUsdMicros: 600,  // $0.60 / 1M tokens
};

export type AiCostRate = typeof DEFAULT_AI_COST_RATE;

export async function getAiCostRate(): Promise<AiCostRate> {
  return getSetting("ai_cost_rate", DEFAULT_AI_COST_RATE);
}

export async function setAiCostRate(rate: AiCostRate) {
  await prisma.appSetting.upsert({
    where: { key: "ai_cost_rate" },
    update: { value: rate as any },
    create: { key: "ai_cost_rate", value: rate as any },
  });
  invalidateAppSettingsCache();
}

export function estimateAiCostUsdMicros(inputTokens: number, outputTokens: number, rate: AiCostRate): number {
  return Math.round((inputTokens / 1000) * rate.inputPer1kUsdMicros + (outputTokens / 1000) * rate.outputPer1kUsdMicros);
}
