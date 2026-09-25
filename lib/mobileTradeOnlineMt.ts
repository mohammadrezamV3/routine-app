// هسته‌ی مشترکِ مدیریتِ اتصالِ متاتریدر از سمتِ کاربر — هم روتِ وب
// (/api/trade/metatrader، سشنِ کوکی) و هم روتِ موبایل
// (/api/mobile/trade-online/metatrader*، Bearer) از همین استفاده می‌کنن تا
// رفتار یکی بمونه. اندپوینت‌هایی که خودِ EA صدا می‌زنه (/api/mt/pair و
// /api/mt/sync) جدان.
//
// مدلِ امنیتی (lib/metatrader.ts): رمزِ حسابِ معاملاتی هیچ‌وقت خواسته/ذخیره
// نمی‌شه؛ کدِ اتصال و توکنِ EA فقط SHA-256 ذخیره می‌شن؛ کد فقط یک‌بار
// برمی‌گرده. همه‌ی کوئری‌ها با userId (ضدِ IDOR).
import { prisma } from "@/lib/prisma";
import { MtPlatform, PAIRING_TTL_MS, generatePairingCode, hashSecret } from "@/lib/metatrader";
import type { MtAccountStatus, MtLinkDto } from "@/lib/mobileTradeOnlineContract";

export const MT_LINK_SELECT = {
  id: true, platform: true, brokerName: true, serverName: true, accountLogin: true,
  balance: true, equity: true, currency: true, tokenPrefix: true,
  connectedAt: true, lastSyncAt: true, revokedAt: true, pairingExpiresAt: true,
} as const;

type LinkRow = {
  id: string; platform: MtPlatform;
  brokerName: string | null; serverName: string | null; accountLogin: string | null;
  balance: number | null; equity: number | null; currency: string | null; tokenPrefix: string | null;
  connectedAt: Date | null; lastSyncAt: Date | null; revokedAt: Date | null; pairingExpiresAt: Date | null;
};

export function serializeMtLink(l: LinkRow, hasToken: boolean): MtLinkDto {
  return {
    ...l,
    connected: hasToken && !l.revokedAt,
    connectedAt: l.connectedAt?.toISOString() ?? null,
    lastSyncAt: l.lastSyncAt?.toISOString() ?? null,
    revokedAt: l.revokedAt?.toISOString() ?? null,
    pairingExpiresAt: l.pairingExpiresAt?.toISOString() ?? null,
  };
}

/** حسابِ مالِ همین کاربر (آرشیوشده هم) — وگرنه null */
export async function ownedTradeAccount(userId: string, accountId: string) {
  if (!accountId || typeof accountId !== "string" || accountId.length > 64) return null;
  return prisma.tradeAccount.findFirst({ where: { id: accountId, userId }, select: { id: true } });
}

/** وضعیتِ اتصالِ یک حساب؛ فرض: مالکیت قبلا چک شده */
export async function getMtLink(userId: string, accountId: string): Promise<MtLinkDto | null> {
  const link = await prisma.tradeMtLink.findFirst({
    where: { accountId, userId },
    select: { ...MT_LINK_SELECT, tokenHash: true },
  });
  if (!link) return null;
  const { tokenHash, ...rest } = link;
  return serializeMtLink(rest as LinkRow, !!tokenHash);
}

/**
 * کدِ اتصالِ تازه. کد فقط همین‌جا برمی‌گرده؛ در دیتابیس فقط هشش می‌مونه.
 * کدِ جدید اتصالِ قبلی رو باطل می‌کنه — وگرنه یک EAی قدیمی روی همون حساب
 * می‌موند بدونِ اینکه کاربر بدونه. فرض: مالکیت قبلا چک شده.
 */
export async function createMtPairing(userId: string, accountId: string, platform: MtPlatform) {
  const code = generatePairingCode();
  const pairingHash = hashSecret(code);
  const pairingExpiresAt = new Date(Date.now() + PAIRING_TTL_MS);
  const link = await prisma.tradeMtLink.upsert({
    where: { accountId },
    create: { userId, accountId, platform, pairingHash, pairingExpiresAt },
    update: { platform, pairingHash, pairingExpiresAt, tokenHash: null, tokenPrefix: null, revokedAt: null, connectedAt: null },
    select: MT_LINK_SELECT,
  });
  return { code, expiresAt: pairingExpiresAt.toISOString(), link: serializeMtLink(link as LinkRow, false) };
}

/** ابطالِ اتصال — معاملاتِ همگام‌شده دست‌نخورده می‌مونن؛ فقط EA دیگه اجازه‌ی ارسال نداره */
export async function revokeMtLink(userId: string, accountId: string): Promise<void> {
  await prisma.tradeMtLink.updateMany({
    where: { accountId, userId },
    data: { tokenHash: null, tokenPrefix: null, pairingHash: null, pairingExpiresAt: null, revokedAt: new Date() },
  });
}

export function parseMtPlatform(v: unknown): MtPlatform {
  return v === "MT5" ? "MT5" : "MT4";
}

/** همه‌ی حساب‌های آرشیونشده‌ی کاربر + وضعیتِ اتصال — ترتیبِ فهرستِ حساب‌های وب */
export async function listMtAccountStatuses(userId: string): Promise<MtAccountStatus[]> {
  const rows = await prisma.tradeAccount.findMany({
    where: { userId, archived: false },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: {
      id: true, name: true, type: true, color: true, archived: true,
      mtLink: { select: { ...MT_LINK_SELECT, tokenHash: true } },
    },
  });
  return rows.map((a) => {
    let link: MtLinkDto | null = null;
    if (a.mtLink) {
      const { tokenHash, ...rest } = a.mtLink;
      link = serializeMtLink(rest as LinkRow, !!tokenHash);
    }
    return { accountId: a.id, name: a.name, type: a.type, color: a.color, archived: a.archived, link };
  });
}
