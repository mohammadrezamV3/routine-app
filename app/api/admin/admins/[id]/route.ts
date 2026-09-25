import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { adminErrorResponse, setAdminRole } from "@/lib/adminUsers";

// PATCH { permissions?, superAdmin? } — ویرایش نقش
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin("admins.manage");
  if (!guard.ok) return guard.response;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "ورودی نامعتبر است" }, { status: 400 });
  try {
    const user = await setAdminRole(guard, params.id, { permissions: body.permissions, superAdmin: body.superAdmin });
    return NextResponse.json({ ok: true, user });
  } catch (e) {
    return adminErrorResponse(e);
  }
}

// DELETE — گرفتن کامل نقش ادمین
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin("admins.manage");
  if (!guard.ok) return guard.response;
  try {
    const user = await setAdminRole(guard, params.id, { permissions: [], superAdmin: false });
    return NextResponse.json({ ok: true, user });
  } catch (e) {
    return adminErrorResponse(e);
  }
}
