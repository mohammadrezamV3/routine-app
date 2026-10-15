import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest } from "@/lib/mentorGuard";
import { readJsonBody, toEnglishDigits } from "@/lib/validate";
import { requireMentorTools } from "@/lib/mentorToolsGuard";
import { ALERT_MAX_DAYS, ALERT_MIN_DAYS } from "@/lib/mentorAdherence";
import { tr } from "@/lib/i18n";

// GET /api/mentor/alerts → { alertMissedDays: number | null }
export async function GET() {
  const g = await requireMentorTools();
  if (!g.ok) return g.response;
  return NextResponse.json({ alertMissedDays: g.profile.alertMissedDays });
}

// PUT /api/mentor/alerts { alertMissedDays: null | ۲..۱۴ } — null یعنی خاموش
export async function PUT(req: Request) {
  const g = await requireMentorTools();
  if (!g.ok) return g.response;
  const parsed = await readJsonBody(req, 4 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const raw = parsed.body?.alertMissedDays;
  let value: number | null;
  if (raw === null) value = null;
  else {
    const n = typeof raw === "string" ? Number(toEnglishDigits(raw)) : raw;
    if (typeof n !== "number" || !Number.isInteger(n) || n < ALERT_MIN_DAYS || n > ALERT_MAX_DAYS) {
      return badRequest(tr(tr(`آستانه‌ی هشدار باید بین ${ALERT_MIN_DAYS} تا ${ALERT_MAX_DAYS} روز باشد`, `The alert threshold must be between ${ALERT_MIN_DAYS} and ${ALERT_MAX_DAYS} days`), `The alert threshold must be between ${ALERT_MIN_DAYS} and ${ALERT_MAX_DAYS} days`));
    }
    value = n;
  }
  await prisma.mentorProfile.update({ where: { id: g.profile.id }, data: { alertMissedDays: value } });
  return NextResponse.json({ alertMissedDays: value });
}
