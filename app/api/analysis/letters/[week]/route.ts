import { tr } from "@/lib/i18n";
import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { featureBlocked } from "@/lib/featureFlagsServer";
import { isoToUtcDate } from "@/lib/weeklyAnalysis/week";
import type { WeeklyLetterData } from "@/lib/weeklyLetter/types";

// GET /api/analysis/letters/[week] — [week] = شنبه‌ی هفته به شکل YYYY-MM-DD.
// → { letter: WeeklyLetterData, prev: string|null, next: string|null }
// خوندنش شماره رو «خوانده‌شده» می‌کنه (و اعلان زنگوله‌ی همون شماره رو هم).
// prev = شماره‌ی قدیمی‌تر، next = جدیدتر (weekStart).
const WEEK_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(_req: NextRequest, { params }: { params: { week: string } }) {
  try {
    const guard = await requireModule(ModuleKey.AI_INSIGHT);
    if (!guard.ok) return guard.response;
    { const off = await featureBlocked("weeklyAnalysis", guard.userId); if (off) return off; }
    const { userId } = guard;

    const week = params.week;
    const weekStart = WEEK_RE.test(week) ? isoToUtcDate(week) : null;
    if (!weekStart || Number.isNaN(weekStart.getTime()) || weekStart.toISOString().slice(0, 10) !== week) {
      return NextResponse.json({ error: tr("تاریخ هفته نامعتبر است", "Invalid week date") }, { status: 400 });
    }

    const row = await prisma.weeklyLetter.findUnique({
      where: { userId_weekStart: { userId, weekStart } },
      select: { id: true, status: true, data: true, readAt: true },
    });
    if (!row || row.status !== "READY") return NextResponse.json({ error: tr("این هفته‌نامه پیدا نشد", "This weekly letter was not found") }, { status: 404 });

    const [prev, next] = await Promise.all([
      prisma.weeklyLetter.findFirst({ where: { userId, status: "READY", weekStart: { lt: weekStart } }, orderBy: { weekStart: "desc" }, select: { weekStart: true } }),
      prisma.weeklyLetter.findFirst({ where: { userId, status: "READY", weekStart: { gt: weekStart } }, orderBy: { weekStart: "asc" }, select: { weekStart: true } }),
    ]);

    if (!row.readAt) {
      const now = new Date();
      await Promise.all([
        prisma.weeklyLetter.updateMany({ where: { id: row.id, userId, readAt: null }, data: { readAt: now } }),
        prisma.inAppNotification.updateMany({
          where: { userId, type: "weekly.letter", url: `/analysis/weekly/letters/${week}`, readAt: null },
          data: { readAt: now },
        }),
      ]).catch(() => {});
    }

    return NextResponse.json({
      letter: row.data as unknown as WeeklyLetterData,
      prev: prev ? prev.weekStart.toISOString().slice(0, 10) : null,
      next: next ? next.weekStart.toISOString().slice(0, 10) : null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || tr("خطای غیرمنتظره", "Unexpected error") }, { status: 500 });
  }
}
