import { tr } from "@/lib/i18n";
import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { getSessionFast } from "@/lib/serverSession";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { parseDateRange, parseIsoDate, readJsonBody } from "@/lib/validate";
import { SLEEP_ROW_SELECT, saveSleepEntry, sleepRowToRecord } from "@/lib/sleepWrite";
import { withLiveSync } from "@/lib/realtime";
import { sessionFeatureBlocked } from "@/lib/featureFlagsServer";

// ثبت خواب — سیستم جدای خواب (ماژول SLEEP، صفحه‌ی /sleep). هر شب یک ردیف با کلید
// (userId, date) که date = روز *بیدارشدن* ـه (خواب شب ۱۰ → ۱۱ مال ۱۱ ـه).
// زمان‌ها ISO  کامل (UTC) ذخیره می‌شن؛ ساعت محلی سمت کلاینت ساخته می‌شه.

const ROW_SELECT = SLEEP_ROW_SELECT;
const toRecord = sleepRowToRecord;

// GET /api/sleep?from=YYYY-MM-DD&to=YYYY-MM-DD — خوندن فقط سشن می‌خواد (مثل
// tasks/daily): بعد از پایان دوره‌ی رایگان هم تاریخچه گروگان نمی‌مونه؛ نوشتن پلن می‌خواد.
export async function GET(req: NextRequest) {
  { const off = await sessionFeatureBlocked("sleep"); if (off) return off; }
  const session = await getSessionFast();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const range = parseDateRange(req.nextUrl.searchParams.get("from"), req.nextUrl.searchParams.get("to"), 400);
  if ("error" in range) return NextResponse.json({ error: range.error }, { status: 400 });
  const rows = await prisma.sleepEntry.findMany({
    where: { userId, date: { gte: range.from, lte: range.to } },
    orderBy: { date: "asc" },
    select: ROW_SELECT,
  });
  return NextResponse.json({ entries: rows.map(toRecord).filter(Boolean) });
}

// POST /api/sleep { date, sleptAt, wokeAt, quality?, note? }
async function handlePOST(req: NextRequest) {
  { const off = await sessionFeatureBlocked("sleep"); if (off) return off; }
  const guard = await requireModule(ModuleKey.SLEEP);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const parsed = await readJsonBody<{
    date?: string; sleptAt?: string; wokeAt?: string; quality?: unknown; note?: unknown;
    latencyMin?: unknown; awakenings?: unknown; napMin?: unknown; tags?: unknown;
  }>(req, 4096);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const result = await saveSleepEntry(userId, parsed.body ?? {});
  if (typeof result === "string") return NextResponse.json({ error: result }, { status: 400 });
  return NextResponse.json({ entry: result.entry });
}

// DELETE /api/sleep?date=YYYY-MM-DD
async function handleDELETE(req: NextRequest) {
  { const off = await sessionFeatureBlocked("sleep"); if (off) return off; }
  const guard = await requireModule(ModuleKey.SLEEP);
  if (!guard.ok) return guard.response;
  const date = parseIsoDate(req.nextUrl.searchParams.get("date"));
  if (!date) return NextResponse.json({ error: tr("تاریخ نامعتبر است", "Invalid date") }, { status: 400 });
  await prisma.sleepEntry.deleteMany({ where: { userId: guard.userId, date } });
  return NextResponse.json({ ok: true });
}

export const POST = withLiveSync(["sleep"], handlePOST);
export const DELETE = withLiveSync(["sleep"], handleDELETE);
