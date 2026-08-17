import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { leavesToPlainText, RichLeaf } from "@/lib/notepad";

const MAX_RESULTS = 30;

// GET /api/notepad/search?q=... — جستجو توی عنوانِ صفحات + متنِ بلاک‌ها.
// بدونِ raw SQL/full-text index (طبقِ قاعده‌ی پروژه)؛ برای مقیاسِ فعلی (دیتای
// یک کاربر) کافیه — اگه تعدادِ صفحات خیلی زیاد شد، Phase بعدی باید ایندکسِ
// جستجوی واقعی (مثلاً Postgres tsvector) اضافه کنه.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const q = (new URL(req.url).searchParams.get("q") || "").trim().toLowerCase();
  if (!q) return NextResponse.json({ results: [] });

  const pages = await prisma.notepadPage.findMany({
    where: { userId, isArchived: false },
    select: { id: true, title: true, icon: true },
  });
  const results: { pageId: string; title: string; icon: string | null; matchType: "title" | "block"; snippet: string }[] = [];

  for (const page of pages) {
    if (page.title.toLowerCase().includes(q)) {
      results.push({ pageId: page.id, title: page.title || "بدونِ عنوان", icon: page.icon, matchType: "title", snippet: "" });
      if (results.length >= MAX_RESULTS) break;
    }
  }

  if (results.length < MAX_RESULTS) {
    const blocks = await prisma.notepadBlock.findMany({
      where: { page: { userId, isArchived: false } },
      select: { pageId: true, content: true },
      take: 5000,
    });
    const alreadyMatched = new Set(results.map((r) => r.pageId));
    const pageMap = new Map(pages.map((p) => [p.id, p]));
    for (const block of blocks) {
      if (alreadyMatched.has(block.pageId)) continue;
      const text = leavesToPlainText((block.content as unknown as RichLeaf[]) || []);
      const idx = text.toLowerCase().indexOf(q);
      if (idx === -1) continue;
      const page = pageMap.get(block.pageId);
      if (!page) continue;
      const start = Math.max(0, idx - 24);
      const snippet = (start > 0 ? "…" : "") + text.slice(start, idx + q.length + 24) + (idx + q.length + 24 < text.length ? "…" : "");
      results.push({ pageId: block.pageId, title: page.title || "بدونِ عنوان", icon: page.icon, matchType: "block", snippet });
      alreadyMatched.add(block.pageId);
      if (results.length >= MAX_RESULTS) break;
    }
  }

  return NextResponse.json({ results });
}
