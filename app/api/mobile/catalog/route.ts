import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { getMobileUserId } from "@/lib/mobileAuth";
import { checkModuleForUser } from "@/lib/moduleAccess";
import { catalogStaticPart, catalogVersion, etagMatches } from "@/lib/mobileCatalog";
import type { MobileCatalogResponse } from "@/lib/mobileApiContract";

// GET /api/mobile/catalog — دیتای مرجع برای آفلاین (غذاها، حرکات، فهرستِ عکس‌ها).
// ETag/If-None-Match: گوشی فقط وقتی دوباره دانلود می‌کنه که واقعا چیزی عوض شده.
export async function GET(req: NextRequest) {
  const userId = await getMobileUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await checkRateLimit(`mobile-catalog:${userId}`, 60, 10 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد درخواست‌ها زیاد بود — کمی بعد دوباره امتحان کن" }, { status: 429 });
  }

  const { foods, exercises, hash } = catalogStaticPart();
  // عکسِ حرکات روی وب هم پشتِ ماژولِ EXERCISE است (/api/exercise/media)
  const exercise = await checkModuleForUser(userId, ModuleKey.EXERCISE);
  const exerciseMedia = exercise.ok
    ? (await prisma.exerciseMedia.findMany({ select: { nameKey: true, updatedAt: true }, orderBy: { nameKey: "asc" } })).map((m) => ({
        key: m.nameKey,
        updatedAt: m.updatedAt.toISOString(),
      }))
    : null;

  const version = catalogVersion(hash, exerciseMedia);
  const etag = `"${version}"`;
  const headers = { ETag: etag, "Cache-Control": "private, no-cache" };
  if (etagMatches(req.headers.get("if-none-match"), etag)) {
    return new NextResponse(null, { status: 304, headers });
  }

  const body: MobileCatalogResponse = {
    version,
    foods: foods as MobileCatalogResponse["foods"],
    exercises: exercises as MobileCatalogResponse["exercises"],
    exerciseMedia,
  };
  return NextResponse.json(body, { headers });
}
