// ترجمه‌ی فارسیِ عنوانِ رویدادهای تقویم اقتصادی.
//
// چرا دیکشنری و نه ترجمه‌ی ماشینی: عنوان‌های تقویم اصطلاحاتِ ثابت و
// محدودند («Non-Farm Employment Change» همیشه همان است) و ترجمه‌ی ماشینی
// هم پول و تأخیر دارد هم روی اصطلاحِ تخصصی خطا می‌کند. ضمناً باید آفلاین و
// قطعی باشد چون داخلِ کرانِ همگام‌سازی اجرا می‌شود.
//
// استراتژی سه‌مرحله‌ای است: (۱) تطبیقِ کاملِ عنوان، (۲) جایگزینیِ عبارت‌های
// شناخته‌شده از بلندترین به کوتاه‌ترین، (۳) اگر هیچ‌کدام نگرفت، همان عنوانِ
// انگلیسی می‌ماند. مرحله‌ی سه عمدی است: یک عنوانِ انگلیسیِ درست خیلی بهتر
// از یک ترجمه‌ی نصفه‌ی گمراه‌کننده است.

/** پسوندهای دوره‌ای که در انتهای عنوان می‌آیند */
const PERIOD_SUFFIXES: [RegExp, string][] = [
  [/\s+m\/m$/i, " (ماهانه)"],
  [/\s+q\/q$/i, " (فصلی)"],
  [/\s+y\/y$/i, " (سالانه)"],
  [/\s+w\/w$/i, " (هفتگی)"],
];

/** عنوان‌های پرتکرار — تطبیقِ کامل، دقیق‌ترین حالت */
const EXACT: Record<string, string> = {
  "non-farm employment change": "تغییر اشتغال غیرکشاورزی (NFP)",
  "unemployment rate": "نرخ بیکاری",
  "average hourly earnings": "میانگین درآمد ساعتی",
  "adp non-farm employment change": "تغییر اشتغال غیرکشاورزی ADP",
  "unemployment claims": "مدعیان بیکاری",
  "core cpi": "شاخص قیمت مصرف‌کننده هسته",
  "cpi": "شاخص قیمت مصرف‌کننده (تورم)",
  "core cpi m/m": "شاخص قیمت مصرف‌کننده هسته (ماهانه)",
  "cpi m/m": "شاخص قیمت مصرف‌کننده (ماهانه)",
  "cpi y/y": "شاخص قیمت مصرف‌کننده (سالانه)",
  "core ppi": "شاخص قیمت تولیدکننده هسته",
  "ppi": "شاخص قیمت تولیدکننده",
  "core pce price index": "شاخص قیمت هسته مخارج مصرف شخصی (PCE)",
  "retail sales": "خرده‌فروشی",
  "core retail sales": "خرده‌فروشی هسته",
  "gdp": "تولید ناخالص داخلی",
  "advance gdp": "تولید ناخالص داخلی (برآورد اولیه)",
  "final gdp": "تولید ناخالص داخلی (نهایی)",
  "prelim gdp": "تولید ناخالص داخلی (مقدماتی)",
  "ism manufacturing pmi": "شاخص مدیران خرید تولیدی ISM",
  "ism services pmi": "شاخص مدیران خرید خدمات ISM",
  "flash manufacturing pmi": "شاخص مدیران خرید تولیدی (فلش)",
  "flash services pmi": "شاخص مدیران خرید خدمات (فلش)",
  "manufacturing pmi": "شاخص مدیران خرید تولیدی",
  "services pmi": "شاخص مدیران خرید خدمات",
  "final manufacturing pmi": "شاخص مدیران خرید تولیدی (نهایی)",
  "final services pmi": "شاخص مدیران خرید خدمات (نهایی)",
  "federal funds rate": "نرخ بهره فدرال رزرو",
  "fomc statement": "بیانیه FOMC",
  "fomc press conference": "نشست خبری FOMC",
  "fomc meeting minutes": "صورت‌جلسه FOMC",
  "fomc economic projections": "پیش‌بینی‌های اقتصادی FOMC",
  "main refinancing rate": "نرخ بهره اصلی بانک مرکزی اروپا",
  "monetary policy statement": "بیانیه سیاست پولی",
  "press conference": "نشست خبری",
  "official bank rate": "نرخ بهره بانک مرکزی انگلستان",
  "official cash rate": "نرخ بهره رسمی",
  "cash rate": "نرخ بهره",
  "overnight rate": "نرخ بهره شبانه",
  "policy rate": "نرخ بهره سیاستی",
  "rate statement": "بیانیه نرخ بهره",
  "boj policy rate": "نرخ بهره بانک مرکزی ژاپن",
  "crude oil inventories": "ذخایر نفت خام",
  "natural gas storage": "ذخایر گاز طبیعی",
  "consumer confidence": "اعتماد مصرف‌کننده",
  "consumer sentiment": "احساسات مصرف‌کننده",
  "prelim uom consumer sentiment": "احساسات مصرف‌کننده میشیگان (مقدماتی)",
  "revised uom consumer sentiment": "احساسات مصرف‌کننده میشیگان (بازنگری‌شده)",
  "building permits": "مجوزهای ساخت‌وساز",
  "housing starts": "شروع ساخت مسکن",
  "existing home sales": "فروش خانه‌های موجود",
  "new home sales": "فروش خانه‌های نو",
  "durable goods orders": "سفارش کالاهای بادوام",
  "core durable goods orders": "سفارش کالاهای بادوام هسته",
  "factory orders": "سفارش‌های کارخانه‌ای",
  "industrial production": "تولیدات صنعتی",
  "trade balance": "تراز تجاری",
  "current account": "حساب جاری",
  "employment change": "تغییر اشتغال",
  "claimant count change": "تغییر تعداد مدعیان بیمه بیکاری",
  "jolts job openings": "فرصت‌های شغلی JOLTS",
  "bank holiday": "تعطیلی بانکی",
  "german ifo business climate": "شاخص فضای کسب‌وکار ifo آلمان",
  "zew economic sentiment": "احساسات اقتصادی ZEW",
  "tankan manufacturing index": "شاخص تانکان تولیدی",
};

/**
 * عبارت‌های سازنده — برای عنوان‌هایی که تطبیقِ کامل ندارند.
 * ترتیب مهم است: بلندترین عبارت اول جایگزین می‌شود تا «core retail sales»
 * پیش از «retail sales» و آن هم پیش از «sales» گرفته شود.
 */
const PHRASES: [string, string][] = [
  ["non-farm employment change", "تغییر اشتغال غیرکشاورزی"],
  ["average hourly earnings", "میانگین درآمد ساعتی"],
  ["consumer price index", "شاخص قیمت مصرف‌کننده"],
  ["producer price index", "شاخص قیمت تولیدکننده"],
  ["gross domestic product", "تولید ناخالص داخلی"],
  ["monetary policy statement", "بیانیه سیاست پولی"],
  ["monetary policy report", "گزارش سیاست پولی"],
  ["meeting minutes", "صورت‌جلسه"],
  ["press conference", "نشست خبری"],
  ["economic projections", "پیش‌بینی‌های اقتصادی"],
  ["crude oil inventories", "ذخایر نفت خام"],
  ["natural gas storage", "ذخایر گاز طبیعی"],
  ["consumer confidence", "اعتماد مصرف‌کننده"],
  ["consumer sentiment", "احساسات مصرف‌کننده"],
  ["business confidence", "اعتماد کسب‌وکار"],
  ["economic sentiment", "احساسات اقتصادی"],
  ["building permits", "مجوزهای ساخت‌وساز"],
  ["housing starts", "شروع ساخت مسکن"],
  ["home sales", "فروش مسکن"],
  ["durable goods orders", "سفارش کالاهای بادوام"],
  ["factory orders", "سفارش‌های کارخانه‌ای"],
  ["industrial production", "تولیدات صنعتی"],
  ["manufacturing production", "تولیدات کارخانه‌ای"],
  ["retail sales", "خرده‌فروشی"],
  ["trade balance", "تراز تجاری"],
  ["current account", "حساب جاری"],
  ["unemployment claims", "مدعیان بیکاری"],
  ["unemployment rate", "نرخ بیکاری"],
  ["employment change", "تغییر اشتغال"],
  ["job openings", "فرصت‌های شغلی"],
  ["jobless claims", "مدعیان بیکاری"],
  ["interest rate decision", "تصمیم نرخ بهره"],
  ["rate statement", "بیانیه نرخ بهره"],
  ["federal funds rate", "نرخ بهره فدرال رزرو"],
  ["bank holiday", "تعطیلی بانکی"],
  ["money supply", "عرضه پول"],
  ["public sector net borrowing", "استقراض خالص بخش عمومی"],
  ["capacity utilization rate", "نرخ بهره‌برداری از ظرفیت"],
  ["manufacturing pmi", "شاخص مدیران خرید تولیدی"],
  ["services pmi", "شاخص مدیران خرید خدمات"],
  ["composite pmi", "شاخص مدیران خرید ترکیبی"],
  ["construction pmi", "شاخص مدیران خرید ساخت‌وساز"],
  ["pmi", "شاخص مدیران خرید"],
  ["cpi", "شاخص قیمت مصرف‌کننده"],
  ["ppi", "شاخص قیمت تولیدکننده"],
  ["gdp", "تولید ناخالص داخلی"],
  ["speaks", "سخنرانی"],
  ["prelim", "مقدماتی"],
  ["flash", "فلش"],
  ["advance", "برآورد اولیه"],
  ["revised", "بازنگری‌شده"],
  ["final", "نهایی"],
  ["core", "هسته"],
  ["german", "آلمان"],
  ["french", "فرانسه"],
  ["italian", "ایتالیا"],
  ["spanish", "اسپانیا"],
];

/**
 * عنوانِ انگلیسیِ رویداد را به فارسی برمی‌گرداند.
 * اگر هیچ اصطلاحی شناخته نشود، همان ورودی برگردانده می‌شود.
 */
export function translateEventTitle(raw: string): string {
  const original = (raw || "").trim();
  if (!original) return original;

  // پسوندِ دوره‌ای را جدا کن تا در تطبیق دخالت نکند
  let base = original;
  let suffix = "";
  for (const [re, fa] of PERIOD_SUFFIXES) {
    if (re.test(base)) {
      base = base.replace(re, "");
      suffix = fa;
      break;
    }
  }

  const key = base.toLowerCase().trim();

  // ۱) تطبیقِ کامل
  const exact = EXACT[key] ?? EXACT[original.toLowerCase().trim()];
  if (exact) return suffix && !exact.includes("(") ? exact + suffix : exact;

  // ۲) جایگزینیِ عبارت‌ها (بلندترین اول)
  let out = key;
  let hit = false;
  for (const [en, fa] of PHRASES) {
    // مرزِ کلمه لازم است وگرنه "core" داخلِ "scorecard" هم می‌گیرد
    const re = new RegExp(`(^|[^a-z])${en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z])`, "g");
    if (re.test(out)) {
      hit = true;
      out = out.replace(re, (_m, a: string, b: string) => `${a}${fa}${b}`);
    }
  }

  // ۳) هیچ اصطلاحی شناخته نشد — عنوانِ اصلی بهتر از ترجمه‌ی نصفه است
  if (!hit) return original;

  return out.replace(/\s{2,}/g, " ").trim() + suffix;
}
