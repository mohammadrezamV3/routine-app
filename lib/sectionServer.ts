// بخش موثر درخواست جاری سمت سرور. فقط سرور.
// هدر x-arion-section رو middleware می‌ذاره: کوکی host-only `arion_section` (اگه معتبر) وگرنه بخش
// میزبان. هدر ورودی کاربر هیچ‌وقت مستقیم اعتماد نمی‌شه (middleware پاکش می‌کنه و دوباره می‌سازه).
// مهمان و خزنده بدون کوکی بخش میزبان رو می‌گیرن، پس سئو/canonical مثل قبل می‌مونه.
import { cookies, headers } from "next/headers";
import { PATH_HEADER, SECTION_COOKIE, SECTION_HEADER, DEFAULT_SECTION, isSectionKey, resolveEffectiveSection, sectionFromHost, type SectionKey } from "@/lib/sections";

function hostOf(h: Headers): string | null {
  return h.get("x-forwarded-host")?.split(",")[0]?.trim() || h.get("host");
}

/** بخش موثر (کوکی انتخاب کاربر، وگرنه میزبان، وگرنه DEFAULT_SECTION)؛ همیشه یکی از سه بخش */
export function getSection(): SectionKey {
  try {
    const h = headers();
    const v = h.get(SECTION_HEADER);
    if (isSectionKey(v)) return v;
    // بدون middleware (مثلا تست) — کوکی و بعد میزبان
    return resolveEffectiveSection(sectionFromHost(hostOf(h)), cookies().get(SECTION_COOKIE)?.value);
  } catch {
    // بیرون از درخواست (build، زمان‌بند): بخش پیش‌فرض
    return DEFAULT_SECTION;
  }
}

/**
 * بخش خود میزبان بدون کوکی. برای چیزهایی که هویتشون به میزبان بسته‌ست و نباید با انتخاب کاربر
 * عوض بشن: manifest/آیکون اپ نصب‌شده، robots، sitemap، canonical.
 */
export function getHostSection(): SectionKey | null {
  try {
    return sectionFromHost(hostOf(headers()));
  } catch {
    return null;
  }
}

/**
 * بخش آیکون/هویت اپ نصب‌شده: بخش میزبان، وگرنه (دامنه‌ی اصلی) بخش موثر (کوکی، وگرنه روتین).
 * آیکون عمومی بی‌بخش وجود نداره؛ همیشه یکی از سه آیکون رنگی. هم‌قاعده با آیکون‌ریرایت middleware.
 */
export function getIconSection(): SectionKey {
  return getHostSection() ?? getSection();
}

/** مسیر درخواست جاری (از هدر middleware)، یا null بیرون از درخواست / بدون middleware */
export function getRequestPath(): string | null {
  try {
    return headers().get(PATH_HEADER);
  } catch {
    return null;
  }
}
