import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { parseDateRange, parseIsoDate, readJsonBody } from "@/lib/validate";
import { withLiveSync } from "@/lib/realtime";
import { AWAKENINGS_MAX, LATENCY_MAX, NAP_MAX, SLEEP_MAX_MIN, SLEEP_MIN_MIN, sanitizeTags, type SleepRecord } from "@/lib/sleep";
import { sessionFeatureBlocked } from "@/lib/featureFlagsServer";

// ثبت خواب — سیستم جدای خواب (ماژول SLEEP، صفحه‌ی /sleep). هر شب یک ردیف با کلید
// (userId, date) که date = روز *بیدارشدن* ـه (خواب شب ۱۰ → ۱۱ مال ۱۱ ـه).
// زمان‌ها ISO  کامل (UTC) ذخیره می‌شن؛ ساعت محلی سمت کلاینت ساخته می‌شه.

type Row = {
  date: Date; sleptAt: Date | null; wokeAt: Date | null; quality: number | null; note: string | null;
  latencyMin: number | null; awakenings: number | null; napMin: number | null; tags: string[];
};
const ROW_SELECT = {
  date: true, sleptAt: true, wokeAt: true, quality: true, note: true,
  latencyMin: true, awakenings: true, napMin: true, tags: true,
} as const;

function toRecord(r: Row): SleepRecord | null {
  if (!r.sleptAt || !r.wokeAt) return null;
  const d = r.date;
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    sleptAt: r.sleptAt.toISOString(),
    wokeAt: r.wokeAt.toISOString(),
    quality: r.quality,
    note: r.note,
    latencyMin: r.latencyMin,
    awakenings: r.awakenings,
    napMin: r.napMin,
    tags: r.tags ?? [],
  };
}

/** عدد صحیح در بازه یا null */
function optInt(v: unknown, max: number): number | null {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max ? v : null;
}

// GET /api/sleep?from=YYYY-MM-DD&to=YYYY-MM-DD — خوندن فقط سشن می‌خواد (مثل
// tasks/daily): بعد از پایان دوره‌ی رایگان هم تاریخچه گروگان نمی‌مونه؛ نوشتن پلن می‌خواد.
export async function GET(req: NextRequest) {
  { const off = await sessionFeatureBlocked("sleep"); if (off) return off; }
  const session = await getServerSession(authOptions);
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
  const b = parsed.body ?? {};
  const date = parseIsoDate(b.date);
  const sleptAt = typeof b.sleptAt === "string" ? new Date(b.sleptAt) : null;
  const wokeAt = typeof b.wokeAt === "string" ? new Date(b.wokeAt) : null;
  if (!date || !sleptAt || !wokeAt || Number.isNaN(sleptAt.getTime()) || Number.isNaN(wokeAt.getTime())) {
    return NextResponse.json({ error: "زمان خواب یا بیداری نامعتبر است" }, { status: 400 });
  }
  const minutes = (wokeAt.getTime() - sleptAt.getTime()) / 60000;
  if (minutes < SLEEP_MIN_MIN || minutes > SLEEP_MAX_MIN) {
    return NextResponse.json({ error: "مدت خواب باید بین 30 دقیقه تا 20 ساعت باشد" }, { status: 400 });
  }
  if (wokeAt.getTime() > Date.now() + 12 * 3600_000) {
    return NextResponse.json({ error: "زمان بیداری در آینده است" }, { status: 400 });
  }
  // روز ثبت باید همون حوالی بیداری باشه (±۱ روز برای اختلاف منطقه‌ی زمانی)
  if (Math.abs(wokeAt.getTime() - date.getTime()) > 2 * 86_400_000) {
    return NextResponse.json({ error: "تاریخ با زمان بیداری جور نیست" }, { status: 400 });
  }
  const quality = typeof b.quality === "number" && Number.isInteger(b.quality) && b.quality >= 1 && b.quality <= 5 ? b.quality : null;
  const note = typeof b.note === "string" && b.note.trim() ? b.note.trim().slice(0, 200) : null;
  const latencyMin = optInt(b.latencyMin, LATENCY_MAX);
  const awakenings = optInt(b.awakenings, AWAKENINGS_MAX);
  const napMin = optInt(b.napMin, NAP_MAX);
  const tags = sanitizeTags(b.tags);
  const data = { sleptAt, wokeAt, quality, note, latencyMin, awakenings, napMin, tags };

  const row = await prisma.sleepEntry.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, ...data },
    update: data,
    select: ROW_SELECT,
  });
  return NextResponse.json({ entry: toRecord(row) });
}

// DELETE /api/sleep?date=YYYY-MM-DD
async function handleDELETE(req: NextRequest) {
  { const off = await sessionFeatureBlocked("sleep"); if (off) return off; }
  const guard = await requireModule(ModuleKey.SLEEP);
  if (!guard.ok) return guard.response;
  const date = parseIsoDate(req.nextUrl.searchParams.get("date"));
  if (!date) return NextResponse.json({ error: "تاریخ نامعتبر است" }, { status: 400 });
  await prisma.sleepEntry.deleteMany({ where: { userId: guard.userId, date } });
  return NextResponse.json({ ok: true });
}

export const POST = withLiveSync(["sleep"], handlePOST);
export const DELETE = withLiveSync(["sleep"], handleDELETE);
