import { renderOgImage, OG_IMAGE_SIZE } from "@/lib/ogImage";
import { getPost } from "@/lib/blogPosts";

// nodejs (نه edge) چون renderOgImage با fs فایلِ فونت رو از دیسک می‌خونه.
export const runtime = "nodejs";
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug);
  return renderOgImage(post?.title || "مقاله‌های آریون");
}
