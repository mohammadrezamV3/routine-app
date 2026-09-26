import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { getMobileUserId } from "@/lib/mobileAuth";
import { checkModuleForUser } from "@/lib/moduleAccess";
import { etagMatches, sha } from "@/lib/mobileCatalog";
import { SYNC_ERROR_MODULE_LOCKED, type MobileCatalogMediaResponse } from "@/lib/mobileApiContract";

// GET /api/mobile/catalog/media?key=<nameKey> — یک عکسِ حرکت (نسخه‌ی Bearerِ
// /api/exercise/media?name=). فقط وقتی دانلود می‌شه که کاربر کارتِ حرکت رو باز کنه.
export async function GET(req: NextRequest) {
  const userId = await getMobileUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await checkModuleForUser(userId, ModuleKey.EXERCISE)).ok) {
    return NextResponse.json({ error: SYNC_ERROR_MODULE_LOCKED }, { status: 403 });
  }
  if (!(await checkRateLimit(`mobile-media:${userId}`, 300, 10 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد درخواست‌ها زیاد بود — کمی بعد دوباره امتحان کن" }, { status: 429 });
  }

  const key = req.nextUrl.searchParams.get("key");
  if (!key || key.length > 200) return NextResponse.json({ error: "key نامعتبر است" }, { status: 400 });

  const row = await prisma.exerciseMedia.findUnique({ where: { nameKey: key }, select: { nameKey: true, dataUrl: true, updatedAt: true } });
  if (!row) return NextResponse.json({ error: "عکسی برای این حرکت نیست" }, { status: 404 });

  const etag = `"${sha(row.nameKey + "|" + row.updatedAt.toISOString()).slice(0, 32)}"`;
  const headers = { ETag: etag, "Cache-Control": "private, no-cache" };
  if (etagMatches(req.headers.get("if-none-match"), etag)) return new NextResponse(null, { status: 304, headers });

  const body: MobileCatalogMediaResponse = { key: row.nameKey, dataUrl: row.dataUrl, updatedAt: row.updatedAt.toISOString() };
  return NextResponse.json(body, { headers });
}
