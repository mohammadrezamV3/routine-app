import { NextRequest, NextResponse } from "next/server";
import { readJsonBody } from "@/lib/validate";
import { guardTradeOnline } from "@/lib/mobileTradeOnline";
import { createMtPairing, ownedTradeAccount, parseMtPlatform } from "@/lib/mobileTradeOnlineMt";
import type { MtCodeResponse } from "@/lib/mobileTradeOnlineContract";

// POST /api/mobile/trade-online/metatrader/code { accountId, platform }
// همون POST /api/trade/metatrader وب: کدِ اتصالِ یک‌بارمصرفِ ۱۵ دقیقه‌ای.
// کد فقط در همین پاسخ برمی‌گرده؛ سرور فقط SHA-256ش رو نگه می‌داره. کدِ
// جدید اتصالِ قبلیِ همون حساب رو باطل می‌کنه. رمزِ حسابِ معاملاتی هیچ‌جا
// خواسته نمی‌شه.
export async function POST(req: NextRequest) {
  const guard = await guardTradeOnline(req, { key: "mobile-trade-online-mt-code", limit: 20, windowMs: 10 * 60 * 1000 });
  if (!guard.ok) return guard.response;

  const parsed = await readJsonBody<{ accountId?: unknown; platform?: unknown }>(req, 4 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const accountId = typeof parsed.body?.accountId === "string" ? parsed.body.accountId : "";
  if (!(await ownedTradeAccount(guard.userId, accountId))) {
    return NextResponse.json({ error: "حساب پیدا نشد" }, { status: 404 });
  }

  const r = await createMtPairing(guard.userId, accountId, parseMtPlatform(parsed.body?.platform));
  const body: MtCodeResponse = { ok: true, code: r.code, expiresAt: r.expiresAt, link: r.link };
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
