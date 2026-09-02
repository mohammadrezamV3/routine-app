import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseIsoDate, readJsonBody } from "@/lib/validate";

// سقف تعداد کلید «انجام‌شده»ی یک روز — از هر برنامه‌ی واقعی خیلی بیشتره
const MAX_DAILY_TASK_KEYS = 500;

// GET /api/tasks/daily?date=2026-07-24
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // `new Date(userInput)` مستقیم استفاده نمی‌شه: یه ورودی بدشکل یه
  // Invalid Date می‌داد که Prisma باهاش throw می‌کرد و روت ۵۰۰ می‌شد.
  const date = parseIsoDate(req.nextUrl.searchParams.get("date"));
  if (!date) return NextResponse.json({ error: "تاریخ نامعتبر است (قالب درست: YYYY-MM-DD)" }, { status: 400 });

  const entry = await prisma.dailyEntry.findUnique({
    where: { userId_date: { userId, date } },
  });

  return NextResponse.json({
    tasks: entry?.completedItems ?? {},
    wake: entry?.wakeUpAt ?? null,
  });
}

// POST /api/tasks/daily  { date, tasks, wake }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = await readJsonBody<{ date?: string; tasks?: Record<string, boolean>; wake?: string | null }>(req);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const { tasks, wake } = parsed.body;

  const date = parseIsoDate(parsed.body?.date);
  if (!date) return NextResponse.json({ error: "تاریخ نامعتبر است (قالب درست: YYYY-MM-DD)" }, { status: 400 });

  // `wake` یه timestamp کامله (نه فقط روز)؛ اگه بدشکل بود باید null بشه نه
  // Invalid Date — وگرنه همون ۵۰۰ قبلی از مسیر دیگه‌ای برمی‌گرده.
  const wakeAt = wake ? new Date(wake) : null;
  const wakeUpAt = wakeAt && !Number.isNaN(wakeAt.getTime()) ? wakeAt : null;

  // فقط کلیدهای boolean واقعی ذخیره می‌شن، با سقف تعداد — این ستون Jsonه و
  // بدون سقف هر چیزی که فرستاده بشه عینا می‌نشست توی دیتابیس.
  const completedItems: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(tasks ?? {}).slice(0, MAX_DAILY_TASK_KEYS)) {
    if (typeof k === "string" && k.length <= 200) completedItems[k.slice(0, 200)] = !!v;
  }

  const entry = await prisma.dailyEntry.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, completedItems, wakeUpAt },
    update: { completedItems, wakeUpAt },
  });

  return NextResponse.json({ ok: true, id: entry.id });
}
