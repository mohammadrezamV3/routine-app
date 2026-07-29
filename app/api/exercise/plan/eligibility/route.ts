import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkNewProgramEligibility } from "@/lib/exerciseEligibility";

// GET /api/exercise/plan/eligibility — آیا کاربر الان واجد شرایط برنامه‌ی جدیده؟
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const currentActive = await prisma.exercisePlan.findFirst({ where: { userId, isActive: true }, orderBy: { startDate: "desc" } });
  const eligibility = await checkNewProgramEligibility(userId, currentActive);
  return NextResponse.json({ eligibility });
}
