// فرمت‌دهی اعداد/پول/تاریخ در پنل Owner — عمدا اعداد لاتین (نه فارسی)،
// هم‌راستا با تصمیم قبلی پروژه برای بخش‌های فنی/عددی (نگاه کن به تسک
// «Use English digits in exercise section» در تاریخچه‌ی این ریپو).

const CURRENCY_LABEL_FA: Record<string, string> = { IRR: "تومان", USD: "دلار" };

export function formatCurrencyAmount(amountSmallestUnit: number, currency: string): string {
  // IRR توی این پروژه به ریال ذخیره می‌شه؛ برای نمایش به تومان تقسیم بر ۱۰ می‌کنیم
  // (همون قراردادی که بقیه‌ی صفحات پرداخت/اشتراک استفاده می‌کنن)
  const value = currency === "IRR" ? Math.round(amountSmallestUnit / 10) : amountSmallestUnit / 100;
  return `${value.toLocaleString("en-US")} ${CURRENCY_LABEL_FA[currency] || currency}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export function formatUsdMicros(micros: number): string {
  const usd = micros / 1_000_000;
  return `$${usd.toLocaleString("en-US", { minimumFractionDigits: usd < 1 ? 4 : 2, maximumFractionDigits: 4 })}`;
}

export function formatPercent(n: number | null): string {
  if (n === null) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n}%`;
}

export function formatDateShort(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-CA"); // YYYY-MM-DD، بدون ابهام ماه/روز
}

export function formatDateTime(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-CA", { hour12: false });
}
