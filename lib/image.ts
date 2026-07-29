// فشرده‌سازی سمت کلاینت عکس معامله قبل از ارسال — چون عکسی که مستقیم از
// گالری موبایل میاد می‌تونه چند مگابایت باشه و ما استوریج فایل جدا نداریم
// (روی همون رکورد TradeEntry به‌صورت data URL ذخیره می‌شه). خروجی JPEG با
// حداکثر بعد ۱۶۰۰px، که برای دیدن اسکرین‌شات چارت کاملاً کافیه.

const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

export function compressImageToDataUrl(file: File, maxDim = 1600, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("فایل انتخاب‌شده عکس نیست"));
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      reject(new Error("حجم عکس بیش از حد مجاز است"));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("خواندن فایل ناموفق بود"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("فایل عکس معتبر نیست"));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas در دسترس نیست"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
