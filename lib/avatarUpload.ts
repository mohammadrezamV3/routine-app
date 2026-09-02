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
