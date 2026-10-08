import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { adminErrorResponse, revokeSessions } from "@/lib/adminUsers";

// DELETE — خروج اجباری کاربر از همه‌ی دستگاه‌ها
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin("users.edit");
  if (!guard.ok) return guard.response;
  try {
    const count = await revokeSessions(guard, params.id);
    return NextResponse.json({ ok: true, count });
  } catch (e) {
    return adminErrorResponse(e);
  }
}
