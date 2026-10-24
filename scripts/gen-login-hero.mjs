// Usage: node scripts/gen-login-hero.mjs <source.png> [name] [x,y,w,h]
// Builds the optimized login hero set in public/images/auth (WebP, plus AVIF).
//   name   output prefix, `login-hero-<section>-<night|day>` (section = routine|trade|workout)
//   x,y,w,h  optional source crop in source pixels (used for the night mobile
//            banner, e.g. `login-hero-night-m`); sizes above the crop width are skipped
//            and the native crop width is always emitted.
//
// Exact commands (night: AVIF_Q=86 AVIF_444=1 against banding in dark glows; day: AVIF_Q=76 AVIF_444=1).
// Mobile crops: trade night 125,350,1004,580; routine/workout night 37,395,1180,682 (label row sits lower); day 0,310,1254,725. Sources are 1254x1254.
//   N="env AVIF_Q=86 AVIF_444=1 node scripts/gen-login-hero.mjs"; D="env AVIF_Q=76 AVIF_444=1 node scripts/gen-login-hero.mjs"
//   routine night: $N <src> login-hero-routine-night   ;  $N <src> login-hero-routine-night-m 37,395,1180,682
//   routine day:   $D <src> login-hero-routine-day     ;  $D <src> login-hero-routine-day-m 0,310,1254,725
//   trade night:   $N <src> login-hero-trade-night     ;  $N <src> login-hero-trade-night-m 125,350,1004,580
//   trade day:     $D <src> login-hero-trade-day       ;  $D <src> login-hero-trade-day-m 0,310,1254,725
//   workout night: $N <src> login-hero-workout-night   ;  $N <src> login-hero-workout-night-m 37,395,1180,682
//   workout day:   $D <src> login-hero-workout-day     ;  $D <src> login-hero-workout-day-m 0,310,1254,725
import sharp from "sharp";
import fs from "fs";
import path from "path";

const src = process.argv[2];
const name = process.argv[3] || "login-hero";
const crop = process.argv[4] ? process.argv[4].split(",").map(Number) : null;
if (!src || !fs.existsSync(src) || (crop && (crop.length !== 4 || crop.some((n) => !Number.isFinite(n))))) {
  console.error("usage: node scripts/gen-login-hero.mjs <source-image> [name] [x,y,w,h]");
  process.exit(1);
}
const out = path.join(process.cwd(), "public/images/auth");
fs.mkdirSync(out, { recursive: true });
const WEBP_Q = Number(process.env.WEBP_Q || 90);
const AVIF_Q = Number(process.env.AVIF_Q || 74);
const AVIF_444 = process.env.AVIF_444 === "1";
const WIDTHS = (process.env.WIDTHS || (crop ? `640,${crop[2]}` : "640,1000,1254")).split(",").map(Number);

const input = crop
  ? sharp(await sharp(src).extract({ left: crop[0], top: crop[1], width: crop[2], height: crop[3] }).toBuffer())
  : sharp(src);
for (const w of WIDTHS) {
  const base = input.clone().resize({ width: w, withoutEnlargement: true });
  const webp = path.join(out, `${name}-${w}.webp`);
  const avif = path.join(out, `${name}-${w}.avif`);
  await base.clone().webp({ quality: WEBP_Q, effort: 6, smartSubsample: true }).toFile(webp);
  await base.clone().avif({ quality: AVIF_Q, effort: 6, ...(AVIF_444 ? { chromaSubsampling: "4:4:4" } : {}) }).toFile(avif);
  console.log(name, w, "webp", (fs.statSync(webp).size / 1024).toFixed(0) + "KB", "avif", (fs.statSync(avif).size / 1024).toFixed(0) + "KB");
}
