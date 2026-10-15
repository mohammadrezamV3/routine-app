import { renderOgImage, OG_IMAGE_SIZE } from "@/lib/ogImage";
import { getSectionSeo } from "@/lib/sectionLanding";
import { getSection } from "@/lib/sectionServer";

// nodejs (نه edge) چون renderOgImage با fs فایل فونت رو از دیسک می‌خونه.
export const runtime = "nodejs";
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

export default async function Image() {
  // روی زیردامنه‌ی یک بخش، جمله‌ی همان بخش؛ دامنه‌ی اصلی دقیقا مثل قبل
  const section = getSection();
  return renderOgImage(section ? getSectionSeo(section).ogHeadline : "روتین روزانه، بدنسازی، کالری‌شماری و ژورنال ترید");
}
