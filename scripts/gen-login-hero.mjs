// Usage: node scripts/gen-login-hero.mjs <source.png>
// Builds the optimized login hero set in public/images/auth (WebP, plus AVIF).
import sharp from "sharp";
import fs from "fs";
import path from "path";

const src = process.argv[2];
if (!src || !fs.existsSync(src)) {
  console.error("usage: node scripts/gen-login-hero.mjs <source-image>");
  process.exit(1);
}
const out = path.join(process.cwd(), "public/images/auth");
fs.mkdirSync(out, { recursive: true });
const WIDTHS = [640, 1000, 1254];
const WEBP_Q = Number(process.env.WEBP_Q || 90);
const AVIF_Q = Number(process.env.AVIF_Q || 74);

for (const w of WIDTHS) {
  const base = sharp(src).resize({ width: w, withoutEnlargement: true });
  const webp = path.join(out, `login-hero-${w}.webp`);
  const avif = path.join(out, `login-hero-${w}.avif`);
  await base.clone().webp({ quality: WEBP_Q, effort: 6, smartSubsample: true }).toFile(webp);
  await base.clone().avif({ quality: AVIF_Q, effort: 6 }).toFile(avif);
  console.log(w, "webp", (fs.statSync(webp).size / 1024).toFixed(0) + "KB", "avif", (fs.statSync(avif).size / 1024).toFixed(0) + "KB");
}
