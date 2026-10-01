// تصویر کارنامه‌ی ترید (canvas) — هم‌سبک کارت اشتراک داشبورد (lib/shareCard.ts).
// قرارداد داده: lib/tradeShareTypes.ts. این فایل فعلا فقط امضای تابعه؛ پیاده‌سازی
// کامل در شاخه‌ی تصویر میاد.
import type { TradeShareData } from "./tradeShareTypes";

export type TradeShareRenderOpts = { dpr?: number; inviteCode?: string | null; siteHost?: string };

export async function renderTradeShareCard(data: TradeShareData, opts: TradeShareRenderOpts = {}): Promise<HTMLCanvasElement> {
  void data; void opts;
  throw new Error("renderTradeShareCard هنوز پیاده نشده");
}
