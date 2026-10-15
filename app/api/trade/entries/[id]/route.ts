import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { sessionFeatureBlocked } from "@/lib/featureFlagsServer";
import { tr } from "@/lib/i18n";

// جزئیات کامل یک معامله — تنها جایی که عکس‌ها و اسنپ‌شات چک‌لیست هم
// برگردانده می‌شوند. لیست معاملات عمدا این‌ها را ندارد تا سبک بماند.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  { const off = await sessionFeatureBlocked("tradeJournal"); if (off) return off; }
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;

  const entry = await prisma.tradeEntry.findFirst({
    where: { id: params.id, userId: guard.userId },
    include: {
      tags: { select: { id: true, name: true, color: true } },
      images: { select: { id: true, dataUrl: true, caption: true, order: true }, orderBy: { order: "asc" } },
    },
  });
  if (!entry) return NextResponse.json({ error: tr(tr("معامله پیدا نشد", "Trade not found"), "Trade not found") }, { status: 404 });

  return NextResponse.json({
    entry: {
      ...entry,
      openedAt: entry.openedAt.toISOString(),
      closedAt: entry.closedAt ? entry.closedAt.toISOString() : null,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      imageCount: entry.images.length,
    },
  });
}
