import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const roadmap = await prisma.roadmap.findFirst({ where: { id: params.id, userId } });
  if (!roadmap) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ roadmap });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  await prisma.roadmap.deleteMany({ where: { id: params.id, userId } });
  return NextResponse.json({ ok: true });
}

// PATCH /api/roadmaps/[id]  { progress: { "0": true, ... } }
//
// پیشرفت این‌جا ذخیره می‌شود نه در UserSetting: کلیدِ پویا
// (`roadmapDone:custom-<id>`) اصلاً در allowlistِ کلیدها نبود و روت
// تنظیمات برایش ۴۰۰ می‌داد، یعنی پیشرفتِ کاربرِ واردشده هیچ‌وقت ذخیره
// نمی‌شد.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await req.json().catch(() => null);
  const raw = body?.progress;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return NextResponse.json({ error: "progress نامعتبر است" }, { status: 400 });
  }

  // فقط دو شکلِ کلیدِ شناخته‌شده و مقدارِ بولی — تا کاربر نتواند هر چیزی
  // در ستونِ Json بریزد:
  //   "3"     → مرحله‌ی چهارم
  //   "s2-5"  → جلسه‌ی ششمِ مرحله‌ی سوم
  const progress: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(raw).slice(0, 600)) {
    if (/^(\d{1,3}|s\d{1,3}-\d{1,3})$/.test(k) && typeof v === "boolean") progress[k] = v;
  }

  const updated = await prisma.roadmap.updateMany({
    where: { id: params.id, userId },
    data: { progress },
  });
  if (updated.count === 0) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
