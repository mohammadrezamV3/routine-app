import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { clampText } from "@/lib/validate";

// مدیریت دستی رویدادهای اقتصادی. تا وقتی هیچ فید خارجی تنظیم نشده،
// همین مسیر تنها راه پرکردن تقویم است — و حتی بعد از تنظیم فید هم برای
// اصلاح/افزودن دستی باقی می‌ماند (رویدادهای دستی با source=MANUAL از
// همگام‌سازی خودکار دست‌نخورده می‌مانند).

const IMPACTS = ["LOW", "MEDIUM", "HIGH"] as const;

function parseBody(body: any): string | { title: string; country: string; currency: string; impact: (typeof IMPACTS)[number]; occursAt: Date; actual: string | null; forecast: string | null; previous: string | null } {
  if (!body || typeof body !== "object") return "بدنه‌ی درخواست نامعتبر است";
  const title = String(body.title || "").trim();
  if (!title) return "عنوان رویداد الزامی است";
  const currency = String(body.currency || "").trim().toUpperCase();
  if (!/^[A-Z]{3,8}$/.test(currency)) return "کد ارز نامعتبر است";
  if (!IMPACTS.includes(body.impact)) return "سطح تأثیر نامعتبر است";
  const occursAt = new Date(String(body.occursAt || ""));
  if (isNaN(occursAt.getTime())) return "تاریخ و ساعت رویداد نامعتبر است";
  const country = String(body.country || "").trim().toUpperCase().slice(0, 2) || currency.slice(0, 2);

  const opt = (v: unknown) => (typeof v === "string" && v.trim() ? clampText(v.trim(), 24) : null);
  return {
    title: clampText(title, 160), country, currency, impact: body.impact, occursAt,
    actual: opt(body.actual), forecast: opt(body.forecast), previous: opt(body.previous),
  };
}

export async function GET(req: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const events = await prisma.economicEvent.findMany({
    orderBy: { occursAt: "desc" },
    take: 200,
  });
  return NextResponse.json({
    events: events.map((e) => ({ ...e, occursAt: e.occursAt.toISOString(), createdAt: e.createdAt.toISOString(), updatedAt: e.updatedAt.toISOString() })),
    externalConfigured: !!process.env.ECONOMIC_CALENDAR_URL,
  });
}

export async function POST(req: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const parsed = parseBody(await req.json().catch(() => null));
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });

  const event = await prisma.economicEvent.create({ data: { ...parsed, source: "MANUAL" } });
  return NextResponse.json({ ok: true, event });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => null);
  const id = String(body?.id || "");
  if (!id) return NextResponse.json({ error: "id الزامی است" }, { status: 400 });

  const parsed = parseBody(body);
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });

  await prisma.economicEvent.update({ where: { id }, data: parsed });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id الزامی است" }, { status: 400 });
  await prisma.economicEvent.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
