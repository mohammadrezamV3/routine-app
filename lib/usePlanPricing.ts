"use client";

import { useEffect, useState } from "react";
import { DEFAULT_PRICING_CONFIG, PricingConfig, normalizePricingConfig } from "@/lib/planPricing";

// قیمت پلن‌ها سمت کلاینت — یک fetch مشترک (/api/pricing) برای همه‌ی
// کامپوننت‌ها با کش ماژولی کوتاه. تا جواب نیومده `ready=false`ه تا قیمت
// پیش‌فرض کد (که ممکنه Owner عوضش کرده باشه) چشمک نزنه؛ اگه درخواست شکست
// خورد، پیش‌فرض کد با ready=true برمی‌گرده. این فقط نمایشه — مبلغ واقعی
// پرداخت همیشه سمت سرور حساب می‌شه.
let cached: { at: number; value: PricingConfig } | null = null;
let inflight: Promise<PricingConfig> | null = null;
const TTL = 60_000;
const listeners = new Set<(p: PricingConfig) => void>();

function load(): Promise<PricingConfig> {
  if (cached && Date.now() - cached.at < TTL) return Promise.resolve(cached.value);
  if (!inflight) {
    inflight = fetch("/api/pricing", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const value = normalizePricingConfig(d?.pricing ?? null);
        if (d?.pricing) cached = { at: Date.now(), value };
        return value;
      })
      .catch(() => DEFAULT_PRICING_CONFIG)
      .finally(() => { inflight = null; });
  }
  return inflight;
}

/** بعد از ذخیره در پنل ادمین: کش دور ریخته و هوک‌های باز تازه می‌شن */
export function invalidatePlanPricing() {
  cached = null;
  inflight = null;
  load().then((p) => listeners.forEach((fn) => fn(p)));
}

export function usePlanPricing(): { pricing: PricingConfig; ready: boolean } {
  const [v, setV] = useState<PricingConfig | null>(cached?.value ?? null);
  useEffect(() => {
    let alive = true;
    load().then((p) => { if (alive) setV(p); });
    const on = (p: PricingConfig) => { if (alive) setV(p); };
    listeners.add(on);
    return () => { alive = false; listeners.delete(on); };
  }, []);
  return { pricing: v ?? DEFAULT_PRICING_CONFIG, ready: v !== null };
}
