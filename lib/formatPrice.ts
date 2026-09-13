// فرمت‌کننده‌ی مشترک نمایش قیمت از مبلغ خام (ریال) — هم سمت سرور
// (app/api/plans، برای پیش‌نمایش قیمت ارتقا) و هم سمت کلاینت (چک‌اوت)
// استفاده می‌شه تا فرمت همیشه دقیقا یکی باشه.
export function formatPriceAmount(amountRaw: number): string {
  return `${Math.round(amountRaw / 10).toLocaleString("en-US")} تومان`;
}
