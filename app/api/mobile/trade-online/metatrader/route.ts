import { NextRequest, NextResponse } from "next/server";
import { guardTradeOnline } from "@/lib/mobileTradeOnline";
import { getMtLink, listMtAccountStatuses, ownedTradeAccount } from "@/lib/mobileTradeOnlineMt";
import type { MtAccountsResponse, MtLinkResponse } from "@/lib/mobileTradeOnlineContract";

// GET /api/mobile/trade-online/metatrader            → همه‌ی حساب‌های آرشیونشده + وضعیتِ اتصال
// GET /api/mobile/trade-online/metatrader?accountId= → اتصالِ یک حساب (مثلِ GET /api/trade/metatrader)
// حسابِ غیرِخودی/ناموجود → ۴۰۴ (ضدِ IDOR — وجودِ حسابِ دیگران لو نمی‌ره).
export async function GET(req: NextRequest) {
  const guard = await guardTradeOnline(req, { key: "mobile-trade-online-mt", limit: 120, windowMs: 10 * 60 * 1000 });
  if (!guard.ok) return guard.response;

  const accountId = req.nextUrl.searchParams.get("accountId");
  if (accountId === null) {
    const body: MtAccountsResponse = { accounts: await listMtAccountStatuses(guard.userId) };
    return NextResponse.json(body);
  }
  if (!(await ownedTradeAccount(guard.userId, accountId))) {
    return NextResponse.json({ error: "حساب پیدا نشد" }, { status: 404 });
  }
  const body: MtLinkResponse = { link: await getMtLink(guard.userId, accountId) };
  return NextResponse.json(body);
}
