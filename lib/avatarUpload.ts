// فایل انتخاب‌شده رو قبل از ارسال به سرور با canvas به یه مربع کوچیک
// (حداکثر ۲۵۶×۲۵۶) فشرده می‌کنه — عکس موبایل معمولا چند مگابایته، ولی
// عکس پروفایل نیازی به این کیفیت نداره و مستقیم توی دیتابیس (نه یه
// استوریج ابری جدا) ذخیره می‌شه.
const MAX_SIZE = 256;

export function resizeImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = MAX_SIZE;
        canvas.height = MAX_SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("no canvas context")); return; }
        ctx.drawImage(img, sx, sy, side, side, 0, 0, MAX_SIZE, MAX_SIZE);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// بنرِ پروفایل — برخلافِ آواتار مربع نیست: از وسطِ عکس یک نوارِ ۳.۲:۱
// بریده می‌شه (همون نسبتی که کادرِ بنر توی صفحه داره) تا کاربر لازم نباشه
// خودش عکس رو crop کنه.
const BANNER_W = 1024;
const BANNER_H = 320;

export function resizeBannerToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const targetRatio = BANNER_W / BANNER_H;
        // بزرگ‌ترین مستطیلِ هم‌نسبت با کادر، از مرکزِ عکس
        let sw = img.width;
        let sh = Math.round(sw / targetRatio);
        if (sh > img.height) { sh = img.height; sw = Math.round(sh * targetRatio); }
        const sx = (img.width - sw) / 2;
        const sy = (img.height - sh) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = BANNER_W;
        canvas.height = BANNER_H;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("no canvas context")); return; }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, BANNER_W, BANNER_H);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
