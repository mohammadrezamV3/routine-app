// رنگِ آواتارِ دایره‌ای برای کاربرهای واقعی — چون هیچ رنگ/آواتاری توی
// دیتابیس ذخیره نمی‌شه، از روی اسم/یوزرنیم یک رنگِ ثابت (همیشه یکسان برای
// همون کاربر) از یک پالتِ از‌پیش‌تعریف‌شده انتخاب می‌شه.
const PALETTE = ["#3B82F6", "#EC4899", "#A855F7", "#F59E0B", "#22C55E", "#06B6D4", "#F97316", "#14B8A6"];

export function avatarColorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}
