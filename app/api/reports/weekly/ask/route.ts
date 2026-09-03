import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { requireModule } from "@/lib/moduleAccess";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { clampText } from "@/lib/validate";
import { answerWeeklyReportQuestion, AskArionContext } from "@/lib/aiClient";
import { getOrGenerateWeeklyReport } from "@/lib/weeklyReport/snapshot";
import { DOMAINS, DOMAIN_LABELS_FA } from "@/lib/weeklyReport/metrics";

// POST /api/reports/weekly/ask  { question, offset }
// Context AI فقط از همون Snapshot cache‌شده‌ی همین هفته میاد (نه دیتابیس
// خام) — بند ۳۴. بدون حافظه‌ی مکالمه‌ای در V2 (stateless، هر سوال مستقل).
export async function POST(req: NextRequest) {
  const guard = await requireModule(ModuleKey.AI_INSIGHT);
  if (!guard.ok) return guard.response;

  if (!guard.isSuperAdmin && !(await checkRateLimit(`weekly-ask-arion:${guard.userId}`, 20, 24 * 60 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد سوال‌های امروز تمام شده — فردا دوباره امتحان کن" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const question = clampText(String(body?.question || "").trim(), 300);
  if (!question) return NextResponse.json({ error: "سوال خالیه" }, { status: 400 });

  const rawOffset = Number(body?.offset ?? 0);
  const offset = Number.isInteger(rawOffset) ? rawOffset : 0;
  if (offset > 0) return NextResponse.json({ error: "هفته‌ی آینده قابل‌انتخاب نیست" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: guard.userId }, select: { timezone: true } });
  const timezone = user?.timezone || "Asia/Tehran";

  const report = await getOrGenerateWeeklyReport(guard.userId, timezone, guard.isSuperAdmin, offset);

  const context: AskArionContext = {
    weekLabel: `${report.weekStart} تا ${report.weekEnd}`,
    overallScore: report.overallScore,
    domains: DOMAINS.filter((d) => report.domainScores[d].active).map((d) => ({
      key: d, label: DOMAIN_LABELS_FA[d], score: report.domainScores[d].score, previousWeek: report.comparison[d]?.previousWeek ?? null, active: true,
    })),
    wins: report.wins,
    problems: report.problems,
    insights: report.aiInsights || [],
  };

  try {
    const answer = await answerWeeklyReportQuestion(question, context, guard.userId);
    return NextResponse.json({ answer });
  } catch {
    return NextResponse.json({ error: "پاسخ‌دادن الان ممکن نیست — بعدا دوباره امتحان کن" }, { status: 502 });
  }
}
