import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { requireModule } from "@/lib/moduleAccess";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { clampText, parseIsoDate } from "@/lib/validate";
import { getUserWeekRange } from "@/lib/weeklyReport/weekRange";
import { Domain, DOMAINS, computeSingleDomainMetric, resolveActiveModules } from "@/lib/weeklyReport/metrics";

// GET /api/reports/weekly/goals — آخرین اهداف کاربر (پذیرفته‌شده/محقق‌شده/ناکام)
export async function GET() {
  const guard = await requireModule(ModuleKey.AI_INSIGHT);
  if (!guard.ok) return guard.response;

  const goals = await prisma.weeklyGoal.findMany({
    where: { userId: guard.userId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  return NextResponse.json({ goals });
}

// POST /api/reports/weekly/goals  { weekStart, domain?, title, description, wasEdited? }
// فقط با Accept/Edit صدا زده می‌شه — AI مستقیم هدف نمی‌سازه (بند ۳۶).
// followUpScoreBefore از امتیاز *همون هفته‌ای که پیشنهاد ازش اومده* گرفته
// می‌شه — مبنای مقایسه‌ی هفته‌ی بعد در snapshot.ts (Feedback Loop، بند ۳۷).
export async function POST(req: NextRequest) {
  const guard = await requireModule(ModuleKey.AI_INSIGHT);
  if (!guard.ok) return guard.response;

  if (!guard.isSuperAdmin && !checkRateLimit(`weekly-goal-accept:${guard.userId}`, 20, 24 * 60 * 60 * 1000)) {
    return NextResponse.json({ error: "تعداد درخواست‌ها بیش از حد مجازه — بعدا دوباره امتحان کن" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const weekStart = parseIsoDate(body?.weekStart);
  if (!weekStart) return NextResponse.json({ error: "هفته نامعتبر است" }, { status: 400 });

  const title = clampText(String(body?.title || "").trim(), 120);
  const description = clampText(String(body?.description || "").trim(), 400);
  if (!title || !description) return NextResponse.json({ error: "عنوان و توضیح لازمه" }, { status: 400 });

  const rawDomain = body?.domain;
  const domain: Domain | null = typeof rawDomain === "string" && DOMAINS.includes(rawDomain as Domain) ? (rawDomain as Domain) : null;
  const wasEdited = !!body?.wasEdited;

  const user = await prisma.user.findUnique({ where: { id: guard.userId }, select: { timezone: true } });
  const timezone = user?.timezone || "Asia/Tehran";

  let followUpScoreBefore: number | null = null;
  if (domain) {
    const moduleAccess = await prisma.moduleAccess.findMany({ where: { userId: guard.userId }, select: { module: true, active: true, expiresAt: true } });
    const activeModules = resolveActiveModules(guard.isSuperAdmin, moduleAccess);
    const week = getUserWeekRange(timezone, weekStart, 0);
    const metric = await computeSingleDomainMetric(domain, guard.userId, week, activeModules);
    followUpScoreBefore = metric.score;
  }

  const followUpWeekStart = new Date(weekStart);
  followUpWeekStart.setDate(followUpWeekStart.getDate() + 7);

  const goal = await prisma.weeklyGoal.create({
    data: {
      userId: guard.userId, weekStart, domain, title, description, wasEdited,
      status: "ACCEPTED", followUpWeekStart, followUpScoreBefore,
    },
  });

  return NextResponse.json({ goal });
}
