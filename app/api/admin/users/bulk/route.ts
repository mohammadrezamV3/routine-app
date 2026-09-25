import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { AdminPermission } from "@/lib/adminPermissions";
import { AdminActionError, restoreUser, setBlocked, softDelete } from "@/lib/adminUsers";

const ACTIONS: Record<string, AdminPermission> = { block: "users.edit", unblock: "users.edit", delete: "users.delete", restore: "users.delete" };

// POST { ids: string[], action } — هر کاربر جدا چک می‌شه؛ خطای یکی جلوی بقیه رو نمی‌گیره
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const action = String(body?.action || "");
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === "string").slice(0, 100) : [];
  if (!ACTIONS[action] || ids.length === 0) return NextResponse.json({ error: "ورودی نامعتبر است" }, { status: 400 });

  const guard = await requireAdmin(ACTIONS[action]);
  if (!guard.ok) return guard.response;

  const failed: { id: string; error: string }[] = [];
  for (const id of ids) {
    try {
      if (action === "block") await setBlocked(guard, id, true);
      else if (action === "unblock") await setBlocked(guard, id, false);
      else if (action === "delete") await softDelete(guard, id);
      else await restoreUser(guard, id);
    } catch (e) {
      failed.push({ id, error: e instanceof AdminActionError ? e.message : "خطای سرور" });
    }
  }
  return NextResponse.json({ ok: true, done: ids.length - failed.length, failed });
}
