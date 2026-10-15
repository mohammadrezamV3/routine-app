import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { AdminPermission } from "@/lib/adminPermissions";
import {
  AdminActionError, addUserTag, grantModuleDays, removeUserTag, restoreUser, sendUserMessage, setBlocked, softDelete,
} from "@/lib/adminUsers";
import { tr } from "@/lib/i18n";

const ACTIONS: Record<string, AdminPermission> = {
  block: "users.edit", unblock: "users.edit", delete: "users.delete", restore: "users.delete",
  message: "users.edit", tag: "users.edit", untag: "users.edit", grant: "users.access",
};

// POST { ids: string[], action, ...پارامترهای اقدام } — هر کاربر جدا چک می‌شه؛ خطای یکی جلوی بقیه رو نمی‌گیره
//  message: { title, body, url? } · tag/untag: { tag } · grant: { modules: string[], days: number }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const action = String(body?.action || "");
  const ids: string[] = Array.isArray(body?.ids)
    ? Array.from(new Set<string>(body.ids.filter((x: unknown): x is string => typeof x === "string" && x.length > 0))).slice(0, 100)
    : [];
  if (!ACTIONS[action] || ids.length === 0) return NextResponse.json({ error: tr("ورودی نامعتبر است", "Invalid input") }, { status: 400 });

  const guard = await requireAdmin(ACTIONS[action]);
  if (!guard.ok) return guard.response;

  const failed: { id: string; error: string }[] = [];
  for (const id of ids) {
    try {
      if (action === "block") await setBlocked(guard, id, true);
      else if (action === "unblock") await setBlocked(guard, id, false);
      else if (action === "delete") await softDelete(guard, id);
      else if (action === "restore") await restoreUser(guard, id);
      else if (action === "message") await sendUserMessage(guard, id, { title: body.title, body: body.body, url: body.url });
      else if (action === "tag") await addUserTag(guard, id, body.tag);
      else if (action === "untag") await removeUserTag(guard, id, body.tag);
      else await grantModuleDays(guard, id, body.modules, body.days);
    } catch (e) {
      failed.push({ id, error: e instanceof AdminActionError ? e.message : tr("خطای سرور", "Server error") });
    }
  }
  return NextResponse.json({ ok: true, done: ids.length - failed.length, failed });
}
