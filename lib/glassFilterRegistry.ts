"use client";
// رجیستری مشترک فیلترهای SVG شیشه‌ی مایع (فقط ردیف full، فقط کلاینت): یک <svg> پنهان در body و یک
// فیلتر برای هر «دسته‌ی اندازه» (مضرب 32px)؛ همه‌ی کارت‌های هم‌اندازه همون فیلتر و همون نقشه رو می‌گیرن.
// فیلتر با objectBoundingBox کار می‌کنه و نقشه کش میاد، پس اندازه‌ی دقیق عنصر لازم نیست.
// یک پاس جابه‌جایی برای سبز/آبی/آلفا + یک پاس جابه‌جایی کم‌هزینه فقط برای کانال قرمز (لبه‌ی رنگین).
import { buildGlassMap } from "@/lib/liquidGlassMap";
import { bucketSize, glassFilterKey, mapDims } from "@/lib/glassFilterBuckets";

export type GlassIntensity = "subtle" | "normal" | "strong";
export const DISPLACE: Record<GlassIntensity, number> = { subtle: 10, normal: 18, strong: 28 };
const SVGNS = "http://www.w3.org/2000/svg";
const made = new Map<string, string>();
let root: SVGSVGElement | null = null;

function ensureRoot(): SVGSVGElement {
  if (root && root.isConnected) return root;
  root = document.createElementNS(SVGNS, "svg") as SVGSVGElement;
  root.setAttribute("width", "0"); root.setAttribute("height", "0");
  root.setAttribute("aria-hidden", "true"); root.setAttribute("focusable", "false");
  root.setAttribute("class", "lg-defs lg-shared");
  document.body.appendChild(root);
  return root;
}

function mapUrl(w: number, h: number, radius: number, bezel: number): string {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(w, h);
  img.data.set(buildGlassMap({ w, h, radius, bezel }));
  ctx.putImageData(img, 0, 0);
  return c.toDataURL("image/png");
}

/** شناسه‌ی فیلتر مشترک برای این اندازه؛ اگه نقشه ساخته نشد null (ردیف به lite برمی‌گرده) */
export function acquireGlassFilter(w: number, h: number, radius: number, intensity: GlassIntensity): string | null {
  const key = glassFilterKey(w, h, radius, intensity);
  const hit = made.get(key);
  if (hit) return hit;
  if (made.size >= 40) return null; // سقف احتیاطی: اندازه‌های پراکنده فیلتر نمی‌سازن
  const bw = bucketSize(w), bh = bucketSize(h);
  const { w: mw, h: mh, f } = mapDims(bw, bh);
  const minDim = Math.min(bw, bh);
  const bezel = Math.max(6, Math.min(Math.round(minDim * 0.45), 14 + DISPLACE[intensity]));
  const url = mapUrl(mw, mh, Math.min(radius, minDim / 2) * f, bezel * f);
  if (!url) return null;
  const scale = Math.min(DISPLACE[intensity], minDim * 0.6);
  const id = "lgf" + made.size + "_" + key.replace(/[^a-zA-Z0-9]/g, "");
  const holder = document.createElement("div");
  holder.innerHTML = `<svg xmlns="${SVGNS}"><filter id="${id}" filterUnits="objectBoundingBox" x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">`
    + `<feImage href="${url}" preserveAspectRatio="none" result="map"/>`
    + `<feDisplacementMap in="SourceGraphic" in2="map" scale="${scale}" xChannelSelector="R" yChannelSelector="G" result="d"/>`
    + `<feDisplacementMap in="SourceGraphic" in2="map" scale="${scale * 1.15}" xChannelSelector="R" yChannelSelector="G" result="dr"/>`
    + `<feColorMatrix in="dr" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r"/>`
    + `<feColorMatrix in="d" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="gba"/>`
    + `<feComposite in="r" in2="gba" operator="arithmetic" k1="0" k2="1" k3="1" k4="0"/>`
    + `</filter></svg>`;
  const f0 = holder.firstElementChild?.firstElementChild;
  if (!f0) return null;
  ensureRoot().appendChild(f0);
  made.set(key, id);
  return id;
}
