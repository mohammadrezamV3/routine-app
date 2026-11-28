import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { snapshotMetrics } from "@/lib/guard/registry";
import { aggregateCounters } from "@/lib/guard/adminStats";

export const dynamic = "force-dynamic";

const MINUTES = 10;

// GET /api/admin/system/load → آمار محافظ درخواست: بافر حلقوی همین worker
// (درخواست/429/503/قطع‌کننده/سمافور) + شمارنده‌های مشترک دیتابیس (ai/export/auth).
// فقط شمارنده و شناسه‌ی کاربر؛ هیچ متن جستجو/پیامی ذخیره یا برگردونده نمی‌شه.
export async function GET() {
  const guard = await requireAdmin("system");
  if (!guard.ok) return guard.response;

  const local = snapshotMetrics(MINUTES);
  let shared: ReturnType<typeof aggregateCounters> | null = null;
  try {
    const rows = await prisma.rateCounter.findMany({
      where: { bucket: { gte: BigInt(Date.now() - MINUTES * 60_000) } },
      select: { key: true, policy: true, count: true },
      take: 5000,
    });
    shared = aggregateCounters(rows);
  } catch { /* جدول/دیتابیس در دسترس نیست: فقط آمار حافظه */ }

  return NextResponse.json({ minutes: MINUTES, local, shared });
}
