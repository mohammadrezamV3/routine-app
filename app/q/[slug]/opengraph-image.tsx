import { renderOgImage, OG_IMAGE_SIZE } from "@/lib/ogImage";
import { getQA } from "@/lib/qa";

export const runtime = "nodejs";
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: { slug: string } }) {
  return renderOgImage(getQA(params.slug)?.question || "پرسش و پاسخ آریون");
}
