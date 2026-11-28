// دسته‌بندی اندازه‌ی نقشه/فیلتر شیشه‌ی مایع (منطق خالص): عنصرهای هم‌اندازه‌ی تقریبی یک فیلتر SVG و
// یک نقشه‌ی جابه‌جایی رو به‌اشتراک می‌ذارن، نه یکی برای هر نمونه.
export const GLASS_BUCKET = 32;
/** گرد به بالا به مضرب 32 */
export function bucketSize(n: number): number {
  return Math.max(GLASS_BUCKET, Math.ceil(n / GLASS_BUCKET) * GLASS_BUCKET);
}
/** سقف ضلع بلند نقشه‌ی بیت‌مپ: نقشه‌ی جابه‌جایی نرمه و با preserveAspectRatio=none کش میاد */
export const GLASS_MAP_MAX = 192;
export function mapDims(bw: number, bh: number): { w: number; h: number; f: number } {
  const f = Math.min(1, GLASS_MAP_MAX / Math.max(bw, bh));
  return { w: Math.max(8, Math.round(bw * f)), h: Math.max(8, Math.round(bh * f)), f };
}
export function glassFilterKey(w: number, h: number, radius: number, intensity: string): string {
  return `${bucketSize(w)}x${bucketSize(h)}r${Math.round(radius)}${intensity[0]}`;
}
