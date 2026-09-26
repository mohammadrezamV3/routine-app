import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { getUsersList, UsersListFilter } from "@/lib/adminAnalytics";
import { writeAuditLog } from "@/lib/adminAnalytics";

const VALID_FILTERS: UsersListFilter[] = ["all", "new", "active", "inactive", "free", "paid", "blocked", "admins", "deleted"];

function csvCell(v: unknown): string {
  let s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
  // جلوگیری از CSV/Formula injection در اکسل
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

// GET ?filter=&search= — خروجی CSV (حداکثر ۵۰۰۰ ردیف)
export async function GET(req: NextRequest) {
  const guard = await requireAdmin("users.view");
  if (!guard.ok) return guard.response;

  const sp = req.nextUrl.searchParams;
  const f = sp.get("filter") || "all";
  const filter = (VALID_FILTERS as string[]).includes(f) ? (f as UsersListFilter) : "all";
  const rows: any[] = [];
  for (let page = 1; page <= 50; page++) {
    const res = await getUsersList({ search: sp.get("search") || undefined, filter, page, pageSize: 100 });
    rows.push(...res.users);
    if (res.users.length < 100) break;
  }
  const header = ["id", "name", "lastName", "username", "email", "phone", "market", "plan", "admin", "blocked", "createdAt", "lastActivityAt"];
  const lines = [header.join(",")].concat(
    rows.map((u) => [u.id, u.name, u.lastName, u.username, u.email, u.phone, u.market, u.plan, u.isAdmin ? "yes" : "", u.isBlocked ? "yes" : "", u.createdAt, u.lastActivityAt].map(csvCell).join(",")),
  );
  await writeAuditLog(guard.userId, "user.export", "User", undefined, { filter, count: rows.length });
  return new NextResponse("﻿" + lines.join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="users-${filter}.csv"`, "Cache-Control": "no-store" },
  });
}
