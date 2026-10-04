// متن‌های آماده‌ی نمایش آنالیز/هفته‌نامه وسط متن راست‌به‌چپ نشون داده می‌شن و
// الگوریتم bidi مرورگر چند جا خرابشون می‌کرد: «+43.42 USD» می‌شد «USD 43.42+»،
// «400 kcal» می‌شد «kcal 400» و «±53 دقیقه» می‌شد «53± دقیقه». این‌جا فقط همون
// تکه‌های عددی علامت‌دار یا عدد+واحد لاتین بین LRI/PDI (U+2066/U+2069) جدا
// می‌شن؛ این دو کاراکتر نامرئی‌ان و بقیه‌ی متن دست نمی‌خوره. خالص و تست‌دار.

const LRI = "⁦";
const PDI = "⁩";

// عدد علامت‌دار اول کلمه، با واحد لاتین اختیاری بعدش: «+12»، «-3.5»، «±53»، «+43.42 USD»
const SIGNED = /(^|[\s(«])([+±−-]\d[\d.,:/%]*(?:\s?[A-Za-z$€£]{1,6}\b)?)/g;
// عدد بدون علامت که پشتش واحد لاتین اومده: «400 kcal»، «2200kcal»، «43 USD»
const UNIT = /(^|[\s(«])(\d[\d.,:/%]*\s?(?:kcal|[A-Z]{3})\b)/g;

export function isolateNumbers(s: string): string {
  if (!s || s.includes(LRI)) return s; // دوبار اعمال نشه
  return s
    .replace(SIGNED, (_, pre: string, tok: string) => `${pre}${LRI}${tok}${PDI}`)
    .replace(UNIT, (_, pre: string, tok: string) => `${pre}${LRI}${tok}${PDI}`);
}

/** همون، برای فهرستی از رشته‌ها */
export function isolateAll(xs: string[]): string[] {
  return xs.map(isolateNumbers);
}
