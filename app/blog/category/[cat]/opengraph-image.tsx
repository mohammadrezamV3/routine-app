import { renderOgImage, OG_IMAGE_SIZE } from "@/lib/ogImage";
import { BLOG_CATEGORIES, isBlogCategory } from "@/lib/blog/categories";

// nodejs (نه edge) چون renderOgImage با fs فایل فونت رو از دیسک می‌خونه.
export const runtime = "nodejs";
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: { cat: string } }) {
  return renderOgImage(isBlogCategory(params.cat) ? BLOG_CATEGORIES[params.cat].title : "مقاله‌های آریون");
}
