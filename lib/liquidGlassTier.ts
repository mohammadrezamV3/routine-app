// انتخاب ردیف رندر شیشه‌ی مایع (components/LiquidGlass.tsx) — منطق خالص.
//   full   : شکست واقعی با فیلتر SVG داخل backdrop-filter (فقط کرومیوم دسکتاپ قوی)
//   lite   : blur + saturate و گرادیان‌های لبه (سافاری/فایرفاکس/دستگاه متوسط)
//   static : بدون هیچ بلور؛ فقط پر کردن گرادیانی و لبه‌ی روشن (هزینه‌ی صفر)
// ردیف پیش‌فرض سمت سرور همیشه static است تا هیدریشن ناجور نشه.
export type GlassTier = "full" | "lite" | "static";
export const GLASS_TIERS: GlassTier[] = ["full", "lite", "static"];
export const DEFAULT_GLASS_TIER: GlassTier = "static";

export type GlassCaps = {
  perfWeak: boolean; // html[data-perf-weak]
  reducedTransparency: boolean;
  saveData: boolean;
  deviceMemory?: number; // GB؛ فقط کرومیوم گزارش می‌کنه
  cores?: number;
  hasBackdropFilter: boolean;
  /** کرومیوم: backdrop-filter با url() فیلتر SVG رو واقعا اجرا می‌کنه (سافاری/فایرفاکس نه) */
  svgBackdrop: boolean;
  hoverFine: boolean; // دسکتاپ با موس
};

export function selectGlassTier(c: GlassCaps): GlassTier {
  if (c.perfWeak || c.reducedTransparency || c.saveData || !c.hasBackdropFilter) return "static";
  if (c.deviceMemory !== undefined && c.deviceMemory <= 4) return "static";
  if (c.svgBackdrop && c.hoverFine) {
    const mem = c.deviceMemory ?? 0;
    const cores = c.cores ?? 0;
    if (mem >= 8 && cores >= 6) return "full";
  }
  return "lite";
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
  };
}
