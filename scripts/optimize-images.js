// فشرده‌سازیِ asset های تصویریِ ریپو — با `node scripts/optimize-images.js`.
// اجراش idempotent ـه (دوباره اجرا کردنش روی خروجیِ خودش تقریباً چیزی عوض
// نمی‌کنه)، پس اگه بعداً لوگو/بنرِ جدیدی اضافه شد فقط کافیه به لیستِ jobs
// اضافه بشه و یک بار اجرا بشه.
//
// چرا لازم بود: PNGهای اصلی 8-bit RGBA و در ابعادِ خیلی بزرگ‌تر از جایی که
// نمایش داده می‌شن ذخیره شده بودن (مثلاً logo-icon.png حجمِ ۴۲۷KB برای
// عنصری که ۳۸px نمایش داده می‌شه). تبدیل به PNGِ palette + resize به سقفِ
// منطقی، مجموعِ ~۱.۳MB رو به ~۱۲۳KB رسوند، بدونِ افتِ دیدنیِ کیفیت
// (شفافیت/آلفا هم حفظ می‌شه).

const sharp = require('sharp');
const fs = require('fs');

// Logos are line-art on transparency: palette PNG (8-bit) is lossless-looking
// and an order of magnitude smaller than the 8-bit RGBA originals.
const jobs = [
  { in: 'public/images/logo-lockup-dark-theme.png',  out: 'public/images/logo-lockup-dark-theme.png',  width: 552, palette: true },
  { in: 'public/images/logo-lockup-light-theme.png', out: 'public/images/logo-lockup-light-theme.png', width: 552, palette: true },
  { in: 'public/images/logo-icon.png',               out: 'public/images/logo-icon.png',               width: 256, palette: true },
  { in: 'public/images/quote-banner.png',            out: 'public/images/quote-banner.png',            width: 461, palette: true },
  { in: 'app/icon.png',                              out: 'app/icon.png',                              width: 256, palette: true },
  { in: 'app/apple-icon.png',                        out: 'app/apple-icon.png',                        width: 180, palette: true },
];

(async () => {
  for (const j of jobs) {
    const before = fs.statSync(j.in).size;
    const meta = await sharp(j.in).metadata();
    const width = Math.min(j.width, meta.width);
    const buf = await sharp(j.in)
      .resize({ width, withoutEnlargement: true })
      .png({ palette: j.palette, quality: 90, effort: 10, compressionLevel: 9 })
      .toBuffer();
    fs.writeFileSync(j.out, buf);
    const after = fs.statSync(j.out).size;
    const m2 = await sharp(j.out).metadata();
    console.log(
      j.out.padEnd(42),
      `${meta.width}x${meta.height} ${(before/1024).toFixed(0)}KB`.padEnd(22),
      '->',
      `${m2.width}x${m2.height} ${(after/1024).toFixed(0)}KB`.padEnd(20),
      `(-${(100 - after/before*100).toFixed(0)}%)`
    );
  }
})();
