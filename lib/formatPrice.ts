// فرمت‌کننده‌ی مشترک نمایش قیمت از مبلغ خام (ریال برای ایران، سنت برای
// بین‌المللی) — هم سمت سرور (app/api/plans، برای پیش‌نمایش قیمت ارتقا) و
// هم سمت کلاینت (چک‌اوت) استفاده می‌شه تا فرمت همیشه دقیقا یکی باشه.
export function formatPriceAmount(amountRaw: number, isIntl: boolean): string {
  if (isIntl) return `$${(amountRaw / 100).toFixed(2)}`;
  return `${Math.round(amountRaw / 10).toLocaleString("en-US")} تومان`;
}
