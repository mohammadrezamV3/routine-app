import { NextRequest, NextResponse } from "next/server";
import { TradeChatReportStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";

// صفِ بررسیِ گزارش‌های چت. فقط سوپریوزر.
//
// چرا خودِ متنِ پیام این‌جا برمی‌گردد (حتی وقتی حذف شده): ادمین باید ببیند
// چه چیزی گزارش شده تا بتواند تصمیم بگیرد. حذفِ نرم دقیقاً برای همین است.

const STATUSES = ["OPEN", "ACTIONED", "DISMISSED"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const statusRaw = req.nextUrl.searchParams.get("status");
  const status = STATUSES.includes(statusRaw as any) ? (statusRaw as TradeChatReportStatus) : "OPEN";

  const reports = await prisma.tradeChatReport.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, reason: true, note: true, status: true, createdAt: true,
      reporter: { select: { username: true, name: true } },
      message: {
        select: {
          id: true, symbol: true, body: true, createdAt: true, deletedAt: true,
          user: { select: { username: true, name: true } },
        },
      },
    },
  });

  const openCount = await prisma.tradeChatReport.count({ where: { status: "OPEN" } });

  return NextResponse.json({
    openCount,
    reports: reports.map((r) => ({
      id: r.id,
      reason: r.reason,
      note: r.note,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      reporter: r.reporter.name?.trim() || r.reporter.username || "کاربر",
      message: {
        id: r.message.id,
        symbol: r.message.symbol,
        body: r.message.body,
        createdAt: r.message.createdAt.toISOString(),
        deleted: !!r.message.deletedAt,
        author: r.message.user.name?.trim() || r.message.user.username || "کاربر",
      },
    })),
  });
}

// PATCH /api/admin/chat-reports  { id, action: "delete" | "dismiss" }
export async function PATCH(req: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const payload = await req.json().catch(() => null);
  const id = typeof payload?.id === "string" ? payload.id : "";
  const action = payload?.action;
  if (!id || (action !== "delete" && action !== "dismiss")) {
    return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
  }

  const report = await prisma.tradeChatReport.findUnique({
    where: { id },
    select: { id: true, messageId: true },
  });
  if (!report) return NextResponse.json({ error: "گزارش پیدا نشد" }, { status: 404 });

  const now = new Date();
  if (action === "delete") {
    // پیام برداشته می‌شود و **همه‌ی** گزارش‌های همان پیام بسته می‌شوند،
    // نه فقط این یکی — وگرنه ادمین باید یک پیام را چند بار بررسی کند.
    await prisma.$transaction([
      prisma.tradeChatMessage.update({
        where: { id: report.messageId },
        data: { deletedAt: now, deletedBy: guard.userId },
      }),
      prisma.tradeChatReport.updateMany({
        where: { messageId: report.messageId, status: "OPEN" },
        data: { status: "ACTIONED", reviewedAt: now, reviewedBy: guard.userId },
      }),
    ]);
  } else {
    await prisma.tradeChatReport.update({
      where: { id },
      data: { status: "DISMISSED", reviewedAt: now, reviewedBy: guard.userId },
    });
  }

  return NextResponse.json({ ok: true });
}
