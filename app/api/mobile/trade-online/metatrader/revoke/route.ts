import { NextRequest, NextResponse } from "next/server";
import { readJsonBody } from "@/lib/validate";
import { guardTradeOnline } from "@/lib/mobileTradeOnline";
import { ownedTradeAccount, revokeMtLink } from "@/lib/mobileTradeOnlineMt";
import type { MtRevokeResponse } from "@/lib/mobileTradeOnlineContract";

// POST /api/mobile/trade-online/metatrader/revoke { accountId }
// همون DELETE /api/trade/metatrader وب (POST چون apiClientِ موبایل فقط
// GET/POST داره). معاملاتِ همگام‌شده دست‌نخورده می‌مونن.
export async function POST(req: NextRequest) {
  const guard = await guardTradeOnline(req, { key: "mobile-trade-online-mt-revoke", limit: 30, windowMs: 10 * 60 * 1000 });
  if (!guard.ok) return guard.response;

  const parsed = await readJsonBody<{ accountId?: unknown }>(req, 4 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const accountId = typeof parsed.body?.accountId === "string" ? parsed.body.accountId : "";
  if (!(await ownedTradeAccount(guard.userId, accountId))) {
    return NextResponse.json({ error: "حساب پیدا نشد" }, { status: 404 });
  }
  await revokeMtLink(guard.userId, accountId);
  const body: MtRevokeResponse = { ok: true };
  return NextResponse.json(body);
}
