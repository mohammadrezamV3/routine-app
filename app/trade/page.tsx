import { TradeHub } from "@/components/TradeHub";

// هاب بخش ترید — تنها ورودی ماژول؛ منو دیگر زیرمجموعه ندارد و با زدن «ترید»
// مستقیم همین صفحه بالا می‌آید. طرح، داده و گیت‌ها در components/TradeHub.tsx
// (یک درخواست GET /api/trade/hub، فلگ هر کارت از پنل ادمین).
export default function TradePage() {
  return <TradeHub />;
}
