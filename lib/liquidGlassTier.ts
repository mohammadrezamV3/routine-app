// انتخاب ردیف رندر شیشه‌ی مایع (components/LiquidGlass.tsx) — منطق خالص.
//   full   : شکست واقعی با فیلتر SVG داخل backdrop-filter (فقط کرومیوم دسکتاپ قوی)
//   lite   : blur + saturate و گرادیان‌های لبه (سافاری/فایرفاکس/دستگاه متوسط)
//   static : بدون هیچ بلور؛ فقط پر کردن گرادیانی و لبه‌ی روشن (هزینه‌ی صفر)
// ردیف پیش‌فرض سمت سرور همیشه static است تا هیدریشن ناجور نشه.
export type GlassTier = "full" | "lite" | "static";
export const GLASS_TIERS: GlassTier[] = ["full", "lite", "static"];
export const DEFAULT_GLASS_TIER: GlassTier = "static";

export type GlassCaps = {
  perfWeak: boolean; // html[data-perf-weak] — روی موبایل یعنی «ارزان‌ترین lite» (بلور کوچک‌تر)، نه static
  reducedTransparency: boolean;
  saveData: boolean;
  deviceMemory?: number; // GB؛ فقط کرومیوم گزارش می‌کنه
  cores?: number;
  hasBackdropFilter: boolean;
  /** کرومیوم: backdrop-filter با url() فیلتر SVG رو واقعا اجرا می‌کنه (سافاری/فایرفاکس نه) */
  svgBackdrop: boolean;
  hoverFine: boolean; // دسکتاپ با موس
  /** گوشی/تبلت: اشاره‌گر درشت (بدون هاور دقیق) یا نمایشگر کوچک */
  mobile?: boolean;
};

/**
 * سیاست (درخواست صریح صاحب محصول): همه‌ی موبایل‌ها lite، دسکتاپ کرومیومی full روی *همه‌ی* سطوح شیشه‌ای،
 * دسکتاپ سافاری/فایرفاکس lite. تنها استثناها: reduced-transparency و نبودن backdrop-filter => static.
 * دستگاه ضعیف/کم‌رم/Save-Data روی موبایل هم lite می‌مونه (CSS با data-perf-weak بلور رو کوچک می‌کنه)
 * و روی دسکتاپ از full به lite می‌ره.
 */
export function selectGlassTier(c: GlassCaps): GlassTier {
  if (c.reducedTransparency || !c.hasBackdropFilter) return "static";
  const mobile = c.mobile ?? !c.hoverFine;
  if (mobile) return "lite";
  if (c.perfWeak || c.saveData) return "lite";
  if (c.svgBackdrop && c.hoverFine) return "full";
  return "lite";
}

const TIER_RANK: Record<GlassTier, number> = { static: 0, lite: 1, full: 2 };
/** سقف ردیف برای یک عنصر: هیچ‌وقت از `max` بالاتر نمی‌ره و ردیف پایین‌تر دست‌نخورده می‌مونه
 *  (مثلا کارت‌های داشبورد حداکثر lite؛ فقط هیرو full). */
export function capGlassTier(tier: GlassTier, max: GlassTier | undefined): GlassTier {
  if (!max) return tier;
  return TIER_RANK[tier] <= TIER_RANK[max] ? tier : max;
}

/** خواندن قابلیت‌های دستگاه (فقط کلاینت) — بدون تشخیص با UA. */
export function readGlassCaps(): GlassCaps {
  const n = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean }; userAgentData?: unknown };
  const mm = (q: string) => !!window.matchMedia && window.matchMedia(q).matches;
  const sup = (p: string, v: string) => !!(window.CSS && CSS.supports && CSS.supports(p, v));
  const hasBackdropFilter = sup("backdrop-filter", "blur(1px)") || sup("-webkit-backdrop-filter", "blur(1px)");
  // CSS.supports برای url() در سافاری هم true می‌ده (فقط پارس می‌کنه)؛ navigator.userAgentData
  // فقط در کرومیوم هست و همون موتوریه که فیلتر SVG رو توی backdrop-filter اجرا می‌کنه.
  const svgBackdrop = sup("backdrop-filter", "url(#x)") && "userAgentData" in n;
  return {
    perfWeak: document.documentElement.hasAttribute("data-perf-weak"),
    reducedTransparency: mm("(prefers-reduced-transparency: reduce)"),
    saveData: !!n.connection?.saveData,
    deviceMemory: n.deviceMemory,
    cores: n.hardwareConcurrency,
    hasBackdropFilter,
    svgBackdrop,
    hoverFine: mm("(hover:hover) and (pointer:fine)"),
    mobile: mm("(pointer:coarse)") || !mm("(hover:hover) and (pointer:fine)") || window.innerWidth < 768,
  };
}
