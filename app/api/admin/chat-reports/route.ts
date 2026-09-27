import { NextRequest, NextResponse } from "next/server";
import { TradeChatReportStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { writeAuditLog } from "@/lib/adminAnalytics";

// صفِ بررسیِ گزارش‌های چت — دسترسیِ «chat».
//
// چرا خودِ متنِ پیام این‌جا برمی‌گردد (حتی وقتی حذف شده): ادمین باید ببیند
// چه چیزی گزارش شده تا بتواند تصمیم بگیرد. حذفِ نرم دقیقاً برای همین است.

const STATUSES = ["OPEN", "ACTIONED", "DISMISSED"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireAdmin("chat");
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
          user: { select: { id: true, username: true, name: true } },
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
        authorId: r.message.user.id,
      },
    })),
  });
}

// PATCH /api/admin/chat-reports  { id, action: "delete" | "dismiss" }
export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin("chat");
  if (!guard.ok) return guard.response;

  const payload = await req.json().catch(() => null);
  const id = typeof payload?.id === "string" ? payload.id : "";
  const action = payload?.action;
  if (!id || (action !== "delete" && action !== "dismiss")) {
    return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
  }

  const report = await prisma.tradeChatReport.findUnique({
    where: { id },
    select: { id: true, messageId: true, status: true },
  });
  if (!report) return NextResponse.json({ error: "گزارش پیدا نشد" }, { status: 404 });
  // گزارشِ بسته‌شده دوباره قابلِ تغییر نیست — وگرنه «رد» روی یک گزارشِ
  // ACTIONED وضعیتش رو برخلافِ واقعیت (پیامی که واقعا حذف شده) عوض می‌کرد.
  if (report.status !== "OPEN") {
    return NextResponse.json({ error: "این گزارش قبلا بررسی شده" }, { status: 409 });
  }

  const now = new Date();
  if (action === "delete") {
    // پیام برداشته می‌شود و **همه‌ی** گزارش‌های همان پیام بسته می‌شوند،
    // نه فقط این یکی — وگرنه ادمین باید یک پیام را چند بار بررسی کند.
    await prisma.$transaction([
      // پیامی که قبلا حذف شده زمان/عاملِ حذفِ اصلی‌اش را نگه می‌دارد.
      prisma.tradeChatMessage.updateMany({
        where: { id: report.messageId, deletedAt: null },
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

  await writeAuditLog(
    guard.userId,
    action === "delete" ? "chat.report_delete_message" : "chat.report_dismiss",
    "TradeChatReport",
    report.id,
    { messageId: report.messageId },
  );
  return NextResponse.json({ ok: true });
}
