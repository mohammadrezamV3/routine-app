import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { sanitizeFilters } from "@/lib/adminUsersView";
import { listUsers, tabCounts } from "@/lib/adminUsersList";

// GET ?tab=&search=&plan=&seen=&signup=&tag=&sort=&dir=&page=&pageSize=&counts=1
// (پارامتر قدیمی filter= هم به‌جای tab= پذیرفته می‌شه)
export async function GET(req: NextRequest) {
  const guard = await requireAdmin("users.view");
  if (!guard.ok) return guard.response;

  const sp = req.nextUrl.searchParams;
  const filters = sanitizeFilters({
    tab: sp.get("tab") || sp.get("filter") || "all",
    search: sp.get("search") || "", plan: sp.get("plan") || "", seen: sp.get("seen") || "",
    signup: sp.get("signup") || "", tag: sp.get("tag") || "",
  });
  const result = await listUsers(filters, {
    sort: sp.get("sort") || undefined,
    dir: sp.get("dir") === "asc" ? "asc" : "desc",
    page: Number(sp.get("page")) || 1,
    pageSize: Number(sp.get("pageSize")) || 25,
  });
  const counts = sp.get("counts") === "1" ? await tabCounts(filters) : undefined;
  return NextResponse.json({ ...result, counts });
}
