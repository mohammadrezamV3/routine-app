// ریسایزِ سمتِ کلاینتِ یک فایلِ عکس به اندازه‌ی هدف، با کراپِ خودکارِ وسط
// (همون رفتارِ object-fit:cover) — بدونِ پاپ‌آپِ انتخابِ محلِ کراپ، طبقِ
// درخواستِ صریح: «همون عکس همونطوری آپلود شه».
export function centerCropToDataUrl(
  file: File,
  outputW: number,
  outputH: number,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = outputW;
      canvas.height = outputH;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas 2d context not available")); return; }
      const scale = Math.max(outputW / img.width, outputH / img.height);
      const sw = outputW / scale;
      const sh = outputH / scale;
      const sx = (img.width - sw) / 2;
      const sy = (img.height - sh) / 2;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outputW, outputH);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("تصویر بارگذاری نشد")); };
    img.src = url;
  });
}
