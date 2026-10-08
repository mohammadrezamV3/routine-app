import { NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { checkRateLimit } from "@/lib/rateLimit";
import { featureBlocked } from "@/lib/featureFlagsServer";
import { ensureLetterForUser } from "@/lib/weeklyLetter/dispatch";
import { rowToSummary } from "@/lib/weeklyLetter/summary";
import type { LetterSummary } from "@/lib/weeklyAnalysis/types";

// GET /api/analysis/letters → { letters: LetterSummary[], unread: number } (تازه‌ترین اول)
// قبل از لیست‌کردن، شماره‌ی «هفته‌ی گذشته»ی همین کاربر اگه سر وقت ساخته نشده
// (مثلا زمان‌بند خاموش بوده) همین‌جا ساخته می‌شه — بدون فراخوانی AI تا کاربر
// منتظر نمونه. ساخت ضدتکراره، پس بازکردن پشت‌سرهم آرشیو چیزی دوبار نمی‌سازه.
const LAZY_TIMEOUT_MS = 20_000;
const MAX_LETTERS = 120;

export const maxDuration = 30;

export async function GET() {
  try {
    const guard = await requireModule(ModuleKey.AI_INSIGHT);
    if (!guard.ok) return guard.response;
    { const off = await featureBlocked("weeklyAnalysis", guard.userId); if (off) return off; }
    const { userId, isSuperAdmin } = guard;
    if (!isSuperAdmin && !(await checkRateLimit(`weekly-letters:${userId}`, 60, 10 * 60 * 1000))) {
      return NextResponse.json({ error: "تعداد درخواست بیش از حد مجاز — کمی صبر کن" }, { status: 429 });
    }

    await Promise.race([
      ensureLetterForUser(userId).catch(() => null),
      new Promise((r) => setTimeout(r, LAZY_TIMEOUT_MS)),
    ]);

    const [rows, unread] = await Promise.all([
      prisma.weeklyLetter.findMany({
        where: { userId, status: "READY" },
        orderBy: { weekStart: "desc" },
        take: MAX_LETTERS,
        select: { weekStart: true, issueNo: true, summary: true, readAt: true, createdAt: true },
      }),
      prisma.weeklyLetter.count({ where: { userId, status: "READY", readAt: null } }),
    ]);
    const letters = rows.map((r) => rowToSummary(r)).filter((x): x is LetterSummary => !!x);
    return NextResponse.json({ letters, unread });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "خطای غیرمنتظره" }, { status: 500 });
  }
}
