import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { getTransactions, TransactionsFilter } from "@/lib/adminAnalytics";

const VALID_FILTERS: TransactionsFilter[] = ["all", "paid", "refunded"];

export async function GET(req: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const sp = req.nextUrl.searchParams;
  const filterParam = sp.get("filter") || "all";
  const filter = (VALID_FILTERS as string[]).includes(filterParam) ? (filterParam as TransactionsFilter) : "all";

  const result = await getTransactions({ filter, page: Number(sp.get("page")) || 1, pageSize: Number(sp.get("pageSize")) || 25 });
  return NextResponse.json(result);
}
