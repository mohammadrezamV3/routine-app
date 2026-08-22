import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { getUsersList, UsersListFilter } from "@/lib/adminAnalytics";

const VALID_FILTERS: UsersListFilter[] = ["all", "new", "active", "inactive", "free", "paid", "blocked"];

export async function GET(req: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const sp = req.nextUrl.searchParams;
  const filterParam = sp.get("filter") || "all";
  const filter = (VALID_FILTERS as string[]).includes(filterParam) ? (filterParam as UsersListFilter) : "all";
  const sortParam = sp.get("sort");
  const sort = sortParam === "oldest" || sortParam === "name" ? sortParam : "newest";

  const result = await getUsersList({
    search: sp.get("search") || undefined,
    filter,
    sort,
    page: Number(sp.get("page")) || 1,
    pageSize: Number(sp.get("pageSize")) || 25,
  });

  return NextResponse.json(result);
}
