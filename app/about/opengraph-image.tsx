import { renderOgImage, OG_IMAGE_SIZE } from "@/lib/ogImage";
import { getSectionAbout } from "@/lib/sectionAbout";
import { getSection } from "@/lib/sectionServer";

// nodejs (نه edge) چون renderOgImage با fs فایل فونت رو از دیسک می‌خونه.
export const runtime = "nodejs";
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const section = getSection();
  return renderOgImage(section ? getSectionAbout(section).seo.ogHeadline : "درباره آریون");
}
