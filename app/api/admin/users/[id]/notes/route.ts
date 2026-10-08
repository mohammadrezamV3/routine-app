import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { adminErrorResponse, addUserNote, deleteUserNote } from "@/lib/adminUsers";

// یادداشت خصوصی ادمین‌ها — هیچ‌وقت به خود کاربر نشون داده نمی‌شه
// POST { body } · DELETE ?noteId=
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin("users.edit");
  if (!guard.ok) return guard.response;
  const body = await req.json().catch(() => null);
  try {
    const note = await addUserNote(guard, params.id, body?.body);
    return NextResponse.json({ ok: true, note });
  } catch (e) { return adminErrorResponse(e); }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin("users.edit");
  if (!guard.ok) return guard.response;
  try {
    await deleteUserNote(guard, params.id, req.nextUrl.searchParams.get("noteId") || "");
    return NextResponse.json({ ok: true });
  } catch (e) { return adminErrorResponse(e); }
}
