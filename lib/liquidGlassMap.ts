// نقشه‌ی جابه‌جایی برای شکست لبه‌ی شیشه — منطق خالص (قابل تست).
// خروجی هر پیکسل R/G به‌صورت 128 + بردار*127 (کانال R = x، G = y)، 128 = بدون جابه‌جایی.
// بردار به سمت داخل شیشه است (نمونه‌برداری از پشتِ ناحیه‌ی داخلی → حس عدسی محدب)
// و فقط داخل «لبه»ی باریک (bezel) مقدار داره؛ وسط شیشه صاف می‌مونه.

export type GlassMapParams = { w: number; h: number; radius: number; bezel: number };

/** فاصله‌ی علامت‌دار تا مستطیل گرد (منفی = داخل) و بردار نرمال خروجی. */
function sdRoundRect(px: number, py: number, hw: number, hh: number, r: number) {
  const qx = Math.abs(px) - (hw - r);
  const qy = Math.abs(py) - (hh - r);
  const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
  const len = Math.hypot(ox, oy);
  const d = len + Math.min(Math.max(qx, qy), 0) - r;
  let nx: number, ny: number;
  if (len > 0) { nx = (ox / len) * Math.sign(px || 1); ny = (oy / len) * Math.sign(py || 1); }
  else if (qx > qy) { nx = Math.sign(px || 1); ny = 0; }
  else { nx = 0; ny = Math.sign(py || 1); }
  return { d, nx, ny };
}

export function glassMapPixel(x: number, y: number, p: GlassMapParams): [number, number] {
  const hw = p.w / 2, hh = p.h / 2;
  const r = Math.max(0, Math.min(p.radius, hw, hh));
  const { d, nx, ny } = sdRoundRect(x + 0.5 - hw, y + 0.5 - hh, hw, hh, r);
  const depth = -d; // فاصله تا لبه به سمت داخل
  if (depth >= p.bezel || p.bezel <= 0) return [128, 128];
  const t = Math.max(0, depth) / p.bezel; // 0 لبه، 1 مرز داخلی
  const s = Math.pow(1 - t, 2.2); // انحنای تند نزدیک لبه
  return [Math.round(128 - nx * s * 127), Math.round(128 - ny * s * 127)];
}

/** RGBA کامل نقشه (برای کنواس). */
export function buildGlassMap(p: GlassMapParams): Uint8ClampedArray {
  const out = new Uint8ClampedArray(p.w * p.h * 4);
  let i = 0;
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    const [r, g] = glassMapPixel(x, y, p);
    out[i++] = r; out[i++] = g; out[i++] = 128; out[i++] = 255;
  }
  return out;
}
