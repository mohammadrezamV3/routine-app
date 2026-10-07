import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { writeAuditLog } from "@/lib/adminAnalytics";
import { buildCsv, sanitizeFilters } from "@/lib/adminUsersView";
import { listUsersForExport } from "@/lib/adminUsersList";

// GET ?tab=&search=&plan=&seen=&signup=&tag=  یا  ?ids=a,b,c (انتخاب‌شده‌ها) — حداکثر 5000 ردیف.
// فقط ستون‌های غیرحساس (بدون رمز/توکن). دسترسی: users.view (کلید جدا برای خروجی وجود نداره).
export async function GET(req: NextRequest) {
  const guard = await requireAdmin("users.view");
  if (!guard.ok) return guard.response;

  const sp = req.nextUrl.searchParams;
  const ids = (sp.get("ids") || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 200);
  const filters = sanitizeFilters({
    tab: sp.get("tab") || sp.get("filter") || "all", search: sp.get("search") || "", plan: sp.get("plan") || "",
    seen: sp.get("seen") || "", signup: sp.get("signup") || "", tag: sp.get("tag") || "",
  });
  const rows = await listUsersForExport(filters, ids);
  const header = ["id", "name", "lastName", "username", "email", "phone", "market", "plan", "status", "atRisk", "admin", "tags", "ltv", "ltvCurrency", "createdAt", "lastActivityAt"];
  const csv = buildCsv(header, rows.map((u) => [
    u.id, u.name, u.lastName, u.username, u.email, u.phone, u.market, u.plan, u.status, u.atRisk ? "yes" : "", u.isAdmin ? "yes" : "",
    u.tags.join("|"), u.ltv?.amount ?? 0, u.ltv?.currency ?? "", u.createdAt, u.lastActivityAt,
  ]));
  await writeAuditLog(guard.userId, "user.export", "User", undefined, { tab: filters.tab, selected: ids.length || undefined, count: rows.length });
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="users-${ids.length ? "selected" : filters.tab}.csv"`, "Cache-Control": "no-store" },
  });
}
