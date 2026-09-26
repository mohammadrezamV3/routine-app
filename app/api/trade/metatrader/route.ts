import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { requireModule } from "@/lib/moduleAccess";
import {
  createMtPairing, getMtLink, ownedTradeAccount, parseMtPlatform, revokeMtLink,
} from "@/lib/mobileTradeOnlineMt";

// مدیریت اتصال متاتریدر یک حساب، از سمت کاربر لاگین‌کرده.
// (اندپوینت‌هایی که خود EA صدا می‌زند جدا هستند: /api/mt/pair و /api/mt/sync)
// هسته‌ی مشترک با اپ موبایل: lib/mobileTradeOnlineMt.ts

// GET /api/trade/metatrader?accountId=...
export async function GET(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;

  const accountId = req.nextUrl.searchParams.get("accountId") || "";
  if (!(await ownedTradeAccount(guard.userId, accountId))) {
    return NextResponse.json({ error: "حساب پیدا نشد" }, { status: 404 });
  }
  return NextResponse.json({ link: await getMtLink(guard.userId, accountId) });
}

// POST /api/trade/metatrader  { accountId, platform }
// یک کد اتصال تازه می‌سازد. کد فقط همین یک‌بار برگردانده می‌شود؛ در
// دیتابیس فقط هشش می‌ماند، پس اگر کاربر گمش کرد باید کد جدید بگیرد.
export async function POST(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => null);
  const accountId = String(body?.accountId || "");
  if (!(await ownedTradeAccount(guard.userId, accountId))) {
    return NextResponse.json({ error: "حساب پیدا نشد" }, { status: 404 });
  }
  const r = await createMtPairing(guard.userId, accountId, parseMtPlatform(body?.platform));
  return NextResponse.json({ ok: true, code: r.code, expiresAt: r.expiresAt, link: r.link });
}

// DELETE /api/trade/metatrader?accountId=... — ابطال اتصال
// معاملات همگام‌شده دست‌نخورده می‌مانند؛ فقط EA دیگر اجازه‌ی ارسال ندارد.
export async function DELETE(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;

  const accountId = req.nextUrl.searchParams.get("accountId") || "";
  if (!(await ownedTradeAccount(guard.userId, accountId))) {
    return NextResponse.json({ error: "حساب پیدا نشد" }, { status: 404 });
  }
  await revokeMtLink(guard.userId, accountId);
  return NextResponse.json({ ok: true });
}
