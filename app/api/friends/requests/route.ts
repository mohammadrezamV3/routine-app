import { tr } from "@/lib/i18n";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NAME_STYLE_SELECT, nameFlags } from "@/lib/nameStyle";
import { sessionFeatureBlocked } from "@/lib/featureFlagsServer";

// GET /api/friends/requests → درخواست‌های دوستی هنوز تاییدنشده:
//   requests = دریافت‌شده (قبول/رد)، sent = ارسالی خود کاربر (لغو با DELETE /api/friends/:id).
// هر دو فقط ردیف‌هایی که یک طرفشان خود کاربره — هیچ داده‌ای از رابطه‌ی بقیه نه.
export async function GET() {
  { const off = await sessionFeatureBlocked("friends"); if (off) return off; }
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const userSelect = { id: true, name: true, username: true, avatarUrl: true, ...NAME_STYLE_SELECT } as const;
  const [rows, sentRows] = await Promise.all([
    prisma.friendship.findMany({
      where: { addresseeId: userId, status: "PENDING" },
      include: { requester: { select: userSelect } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.friendship.findMany({
      where: { requesterId: userId, status: "PENDING" },
      include: { addressee: { select: userSelect } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    requests: rows.map((r) => ({
      friendshipId: r.id,
      id: r.requester.id,
      name: r.requester.name || r.requester.username || tr("کاربر", "User"),
      username: r.requester.username,
      avatarUrl: r.requester.avatarUrl,
      ...nameFlags(r.requester),
    })),
    sent: sentRows.map((r) => ({
      friendshipId: r.id,
      id: r.addressee.id,
      name: r.addressee.name || r.addressee.username || tr("کاربر", "User"),
      username: r.addressee.username,
      avatarUrl: r.addressee.avatarUrl,
      ...nameFlags(r.addressee),
    })),
  });
}
