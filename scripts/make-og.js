// تصویرِ اشتراک‌گذاری (Open Graph) — `node scripts/make-og.js`.
// قبلاً `og:image` اصلاً وجود نداشت، یعنی هر لینکی که در تلگرام/واتساپ/
// توییتر به اشتراک گذاشته می‌شد یک کارتِ بی‌تصویر بود. لوگو نسبتِ ابعادِ
// بنر (۱۲۰۰×۶۳۰) رو نداره، پس این‌جا روی پس‌زمینه‌ی تمِ تاریک ترکیب می‌شه.
// اسم به هر دو زبان نوشته می‌شه — همون دلیلی که در layout.tsx توضیح داده شده.
const sharp = require("sharp");
const fs = require("fs");

const W = 1200, H = 630, BG = "#0E1011", ACCENT = "#00A86B";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <circle cx="${W - 120}" cy="110" r="260" fill="${ACCENT}" opacity="0.10"/>
  <circle cx="90" cy="${H - 70}" r="200" fill="${ACCENT}" opacity="0.07"/>
  <text x="${W / 2}" y="286" text-anchor="middle" font-family="sans-serif"
        font-size="104" font-weight="800" fill="#EDEFEE">Arion</text>
  <text x="${W / 2}" y="392" text-anchor="middle" font-family="sans-serif"
        font-size="76" font-weight="700" fill="${ACCENT}" direction="rtl">آریون</text>
  <text x="${W / 2}" y="470" text-anchor="middle" font-family="sans-serif"
        font-size="34" fill="#8A9099" direction="rtl">روتین، ورزش، تغذیه و ترید در یک اپ</text>
</svg>`;

(async () => {
  const logo = await sharp("public/images/logo-icon.png").resize({ height: 96 }).toBuffer();
  await sharp(Buffer.from(svg))
    .composite([{ input: logo, top: 92, left: Math.round(W / 2 - 48) }])
    .png({ compressionLevel: 9 })
    .toFile("public/og.png");
  const kb = Math.round(fs.statSync("public/og.png").size / 1024);
  console.log(`public/og.png ساخته شد — ${W}×${H}, ${kb}KB`);
})();
