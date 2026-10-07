import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { adminErrorResponse, addUserTag, removeUserTag } from "@/lib/adminUsers";

// POST { tag } · DELETE ?tag=
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin("users.edit");
  if (!guard.ok) return guard.response;
  const body = await req.json().catch(() => null);
  try {
    const tag = await addUserTag(guard, params.id, body?.tag);
    return NextResponse.json({ ok: true, tag });
  } catch (e) { return adminErrorResponse(e); }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin("users.edit");
  if (!guard.ok) return guard.response;
  try {
    await removeUserTag(guard, params.id, req.nextUrl.searchParams.get("tag"));
    return NextResponse.json({ ok: true });
  } catch (e) { return adminErrorResponse(e); }
}
