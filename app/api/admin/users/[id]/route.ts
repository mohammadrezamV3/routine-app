import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { getUserDetail } from "@/lib/adminAnalytics";
import { adminErrorResponse, hardDelete, restoreUser, setBlocked, softDelete, updateProfile } from "@/lib/adminUsers";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin("users.view");
  if (!guard.ok) return guard.response;

  const detail = await getUserDetail(params.id);
  if (!detail) return NextResponse.json({ error: "کاربر پیدا نشد" }, { status: 404 });
  return NextResponse.json(detail);
}

// PATCH { blocked?: boolean, profile?: {...}, restore?: true }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "ورودی نامعتبر است" }, { status: 400 });

  const guard = await requireAdmin(body.restore === true ? "users.delete" : "users.edit");
  if (!guard.ok) return guard.response;

  try {
    if (body.restore === true) {
      await restoreUser(guard, params.id);
      return NextResponse.json({ ok: true });
    }
    let user: any = {};
    if (body.profile && typeof body.profile === "object") user = { ...user, ...(await updateProfile(guard, params.id, body.profile)) };
    if (typeof body.blocked === "boolean") user = { ...user, ...(await setBlocked(guard, params.id, body.blocked)) };
    if (!Object.keys(user).length) return NextResponse.json({ error: "ورودی نامعتبر است" }, { status: 400 });
    return NextResponse.json({ ok: true, user });
  } catch (e) {
    return adminErrorResponse(e);
  }
}

// DELETE ?mode=soft|hard — پیش‌فرض soft
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin("users.delete");
  if (!guard.ok) return guard.response;
  try {
    if (req.nextUrl.searchParams.get("mode") === "hard") await hardDelete(guard, params.id);
    else await softDelete(guard, params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return adminErrorResponse(e);
  }
}
