// کوچک‌کردنِ عکس قبل از آپلود: بزرگ‌ترین ضلع ≤ maxEdge، خروجیِ JPEG (base64 بدونِ
// پیشوندِ data:). همه‌چیز سمتِ گوشی — عکسِ خامِ دوربین (چند مگابایت) هیچ‌وقت ارسال نمی‌شه.
export const MAX_UPLOAD_EDGE = 1280;

export function fitWithin(w: number, h: number, maxEdge = MAX_UPLOAD_EDGE): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image_decode_failed"));
    };
    img.src = url;
  });
}

export async function resizeToJpegBase64(file: Blob, maxEdge = MAX_UPLOAD_EDGE, quality = 0.85): Promise<string> {
  const img = await loadImage(file);
  const { width, height } = fitWithin(img.naturalWidth || img.width, img.naturalHeight || img.height, maxEdge);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");
  ctx.drawImage(img, 0, 0, width, height);
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}
