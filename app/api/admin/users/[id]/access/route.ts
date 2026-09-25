import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { adminErrorResponse, setModuleAccess } from "@/lib/adminUsers";

// PUT { modules: [{ module, active, expiresAt }] } — تعیین دستی دسترسی ماژول‌ها
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin("users.access");
  if (!guard.ok) return guard.response;
  const body = await req.json().catch(() => null);
  if (!Array.isArray(body?.modules)) return NextResponse.json({ error: "ورودی نامعتبر است" }, { status: 400 });
  try {
    const moduleAccess = await setModuleAccess(guard, params.id, body.modules);
    return NextResponse.json({ ok: true, moduleAccess });
  } catch (e) {
    return adminErrorResponse(e);
  }
}
