import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { clampText } from "@/lib/validate";
import {
  generateEaToken, hashSecret, normalizePairingCode, tokenPrefixOf,
} from "@/lib/metatrader";

// POST /api/mt/pair — تنها اندپوینتی که خود EA بدون توکن صدا می‌زند.
// { code, platform, accountLogin, server, broker } → { token }
//
// این‌جا سشن کاربر وجود ندارد (EA مرورگر نیست و کوکی ندارد)؛ احراز هویت
// فقط با کد اتصال یک‌بارمصرفی است که کاربر خودش از پنل گرفته و در EA
// گذاشته. پس ریت‌لیمیت سخت‌گیرانه روی IP لازم است تا کسی نتواند کدها را
// حدس بزند — هرچند ۶۰ بیت آنتروپی عملا غیرقابل حدس است.
const PAIR_LIMIT = 10;
const PAIR_WINDOW_MS = 10 * 60_000;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  if (!checkRateLimit(`mt-pair:${ip}`, PAIR_LIMIT, PAIR_WINDOW_MS)) {
    return NextResponse.json({ error: "too many attempts" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const code = normalizePairingCode(body?.code || "");
  if (!code) return NextResponse.json({ error: "invalid code" }, { status: 400 });

  const link = await prisma.tradeMtLink.findUnique({
    where: { pairingHash: hashSecret(code) },
    select: { id: true, pairingExpiresAt: true },
  });
  // پیام خطا عمدا برای «کد اشتباه» و «کد منقضی» یکی است — تفکیکشان فقط
  // به حدس‌زننده اطلاعات می‌دهد.
  if (!link || !link.pairingExpiresAt || link.pairingExpiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "invalid or expired code" }, { status: 401 });
  }

  const token = generateEaToken();

  // کد بلافاصله بعد از مصرف باطل می‌شود — یک‌بارمصرف واقعی
  await prisma.tradeMtLink.update({
    where: { id: link.id },
    data: {
      tokenHash: hashSecret(token),
      tokenPrefix: tokenPrefixOf(token),
      pairingHash: null,
      pairingExpiresAt: null,
      revokedAt: null,
      connectedAt: new Date(),
      platform: body?.platform === "MT5" ? "MT5" : "MT4",
      accountLogin: body?.accountLogin ? clampText(String(body.accountLogin), 32) : null,
      serverName: body?.server ? clampText(String(body.server), 64) : null,
      brokerName: body?.broker ? clampText(String(body.broker), 64) : null,
    },
  });

  return NextResponse.json({ ok: true, token });
}
