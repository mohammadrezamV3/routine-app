import { renderOgImage, OG_IMAGE_SIZE } from "@/lib/ogImage";

export const runtime = "nodejs";
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return renderOgImage("کتابخانه حرکات بدنسازی و آموزش روش اجرا");
}
