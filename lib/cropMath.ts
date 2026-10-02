// ریاضی خالص کراپ لمسی (ImageCropModal): عکس همیشه کل قاب رو می‌پوشونه
// (cover)، زوم حول نقطه‌ی بین دو انگشت (یا نشانگر موس) انجام می‌شه و
// جابه‌جایی طوری محدود می‌شه که هیچ‌وقت لبه‌ی خالی داخل قاب نیفته.

export type CropView = { zoom: number; x: number; y: number };
export type Size = { w: number; h: number };

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 5;

/** مقیاسی که عکس در zoom=1 دقیقا قاب رو پر کنه */
export function baseScale(img: Size, frame: Size) {
  return Math.max(frame.w / img.w, frame.h / img.h);
}

export function clampView(v: CropView, img: Size, frame: Size): CropView {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom));
  const s = baseScale(img, frame) * zoom;
  const w = img.w * s, h = img.h * s;
  return {
    zoom,
    x: Math.min(0, Math.max(frame.w - w, v.x)),
    y: Math.min(0, Math.max(frame.h - h, v.y)),
  };
}

export function centeredView(img: Size, frame: Size): CropView {
  const s = baseScale(img, frame);
  return { zoom: 1, x: (frame.w - img.w * s) / 2, y: (frame.h - img.h * s) / 2 };
}

/** زوم به `nextZoom` طوری که نقطه‌ی (px,py) قاب زیر انگشت ثابت بمونه */
export function zoomAt(v: CropView, nextZoom: number, px: number, py: number, img: Size, frame: Size): CropView {
  const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
  const ratio = z / v.zoom;
  return clampView({ zoom: z, x: px - (px - v.x) * ratio, y: py - (py - v.y) * ratio }, img, frame);
}

/** مستطیل منبع روی عکس اصلی برای drawImage */
export function sourceRect(v: CropView, img: Size, frame: Size) {
  const s = baseScale(img, frame) * v.zoom;
  return { sx: -v.x / s + 0, sy: -v.y / s + 0, sw: frame.w / s, sh: frame.h / s };
}
