import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkNewProgramEligibility } from "@/lib/exerciseEligibility";
import { requireModule } from "@/lib/moduleAccess";
import { ModuleKey } from "@prisma/client";

// GET /api/exercise/plan/eligibility — آیا کاربر الان واجد شرایط برنامه‌ی جدیده؟
export async function GET() {
  const guard = await requireModule(ModuleKey.EXERCISE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const currentActive = await prisma.exercisePlan.findFirst({ where: { userId, isActive: true }, orderBy: { startDate: "desc" } });
  const eligibility = await checkNewProgramEligibility(userId, currentActive);
  return NextResponse.json({ eligibility });
}
