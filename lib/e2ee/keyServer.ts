// فقط سمتِ سرور — وضعیتِ کلیدهای یک کاربر برای /api/e2ee/* (docs/mentor-e2ee.md).
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MAX_ACTIVE_KEYS } from "./core";

/** کلیدِ DEVICEی که این مدت دیده نشده بازنشسته می‌شود تا پیام‌ها برای دستگاهِ گم‌شده بسته‌بندی نشوند */
export const DEVICE_STALE_DAYS = 120;
const TOUCH_EVERY_MS = 12 * 60 * 60 * 1000;
export const LINK_TTL_MS = 30 * 60 * 1000;

export const E2E_KEY_SELECT = {
  id: true,
  version: true,
  kind: true,
  publicKey: true,
  retiredAt: true,
  backupCiphertext: true,
  backupKind: true,
  deviceLabel: true,
  createdAt: true,
  lastSeenAt: true,
} as const satisfies Prisma.UserE2EKeySelect;

export const keyChangedResponse = () =>
  NextResponse.json({ error: "کلید این حساب هم‌زمان تغییر کرد؛ دوباره تلاش کن", code: "KEY_CHANGED" }, { status: 409 });

type Tx = Prisma.TransactionClient;

/** نسخه‌ی تازه باید دقیقا «بزرگ‌ترین نسخه‌ی موجود + ۱» باشد (نسخه در AADِ پشتیبان است) */
export async function nextVersionOk(tx: Tx, userId: string, version: number): Promise<boolean> {
  const max = await tx.userE2EKey.aggregate({ where: { userId }, _max: { version: true } });
  return (max._max.version ?? 0) + 1 === version;
}

/** سقفِ کلیدهای فعال: قدیمی‌ترین دستگاه (کم‌تر دیده‌شده) کنار می‌رود */
export async function enforceDeviceCap(tx: Tx, userId: string): Promise<void> {
  const active = await tx.userE2EKey.findMany({ where: { userId, retiredAt: null }, select: { id: true, kind: true, lastSeenAt: true, createdAt: true } });
  const over = active.length - MAX_ACTIVE_KEYS;
  if (over <= 0) return;
  const devices = active
    .filter((k) => k.kind === "DEVICE")
    .sort((a, b) => (a.lastSeenAt ?? a.createdAt).getTime() - (b.lastSeenAt ?? b.createdAt).getTime())
    .slice(0, over);
  if (devices.length) await tx.userE2EKey.updateMany({ where: { id: { in: devices.map((d) => d.id) } }, data: { retiredAt: new Date() } });
}

export async function myKeyState(userId: string, touch: number | null) {
  const now = Date.now();
  // دستگاه‌های رهاشده‌ی خودِ همین کاربر
  await prisma.userE2EKey.updateMany({
    where: { userId, kind: "DEVICE", retiredAt: null, OR: [{ lastSeenAt: { lt: new Date(now - DEVICE_STALE_DAYS * 86_400_000) } }, { lastSeenAt: null, createdAt: { lt: new Date(now - DEVICE_STALE_DAYS * 86_400_000) } }] },
    data: { retiredAt: new Date() },
  });
  if (touch) {
    await prisma.userE2EKey.updateMany({
      where: { userId, version: touch, kind: "DEVICE", retiredAt: null, OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: new Date(now - TOUCH_EVERY_MS) } }] },
      data: { lastSeenAt: new Date() },
    });
  }
  const [user, kdf, keys, wrapCounts, v1Count, link] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } }),
    prisma.userE2EKdf.findUnique({ where: { userId }, select: { salt: true, iterations: true } }),
    prisma.userE2EKey.findMany({ where: { userId }, orderBy: { version: "asc" }, select: E2E_KEY_SELECT }),
    prisma.mentorMessageKeyWrap.groupBy({ by: ["keyVersion"], where: { userId }, _count: { _all: true } }),
    prisma.mentorMessage.count({ where: { scheme: 1, ciphertext: { not: null }, mentorship: { OR: [{ mentorId: userId }, { studentId: userId }] } } }),
    prisma.e2EDeviceLink.findFirst({
      where: { userId, OR: [{ status: "PENDING", expiresAt: { gt: new Date(now) } }, { status: { in: ["DONE", "DECLINED"] }, completedAt: { gt: new Date(now - 10 * 60 * 1000) } }] },
      orderBy: { createdAt: "desc" },
      select: { id: true, targetVersion: true, status: true, moved: true, createdAt: true, expiresAt: true },
    }),
  ]);
  const withWraps = new Set(wrapCounts.map((w) => w.keyVersion));
  return {
    userId,
    hasPassword: !!user?.passwordHash,
    kdf: kdf ? { salt: kdf.salt, iterations: kdf.iterations } : null,
    keys: keys.map((k) => ({
      version: k.version,
      kind: k.kind,
      publicKey: k.publicKey,
      active: !k.retiredAt,
      hasBackup: !!k.backupCiphertext,
      backupKind: (k.backupKind as "PASSWORD" | "PASSCODE" | null) ?? null,
      deviceLabel: k.deviceLabel,
      createdAt: k.createdAt,
      lastSeenAt: k.lastSeenAt,
      // پیامِ scheme 1 فقط برای کلیدهای SYNCEDِ پیش از این مهاجرت بوده
      hasMessages: withWraps.has(k.version) || (v1Count > 0 && k.kind === "SYNCED" && !!k.backupKind && k.backupKind === "PASSCODE"),
    })),
    link,
  };
}
