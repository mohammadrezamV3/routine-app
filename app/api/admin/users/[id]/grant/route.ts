import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { adminErrorResponse, grantModuleDays } from "@/lib/adminUsers";
import { prisma } from "@/lib/prisma";

// POST { modules: string[], days } — اعطا/تمدید دسترسی ماژول‌ها برای N روز
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin("users.access");
  if (!guard.ok) return guard.response;
  const body = await req.json().catch(() => null);
  try {
    await grantModuleDays(guard, params.id, body?.modules, body?.days);
    const moduleAccess = await prisma.moduleAccess.findMany({ where: { userId: params.id }, select: { module: true, active: true, expiresAt: true } });
    return NextResponse.json({ ok: true, moduleAccess });
  } catch (e) { return adminErrorResponse(e); }
}
