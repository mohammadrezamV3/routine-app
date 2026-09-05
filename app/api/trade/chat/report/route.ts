import { NextRequest, NextResponse } from "next/server";
import { ModuleKey, TradeChatReportReason } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { checkRateLimit } from "@/lib/rateLimit";
import { clampText } from "@/lib/validate";
import { isChatReportReason } from "@/lib/tradeChat";

// POST /api/trade/chat/report  { messageId, reason, note? }
//
// گزارشِ یک پیام: طبقِ درخواستِ صریح، پیام همان لحظه از اتاق حذف می‌شود
// (حذفِ نرم — متن برای ادمین می‌ماند) و صفِ ادمین (`/admin/chat-reports`)
// متنِ کاملش را نشان می‌دهد تا اگر لازم بود روی نویسنده‌اش (از پنلِ
// `/admin/users/[id]`) اخطار/بن/غیرفعال‌سازی اعمال کند.
//
// چرا این تصمیم امن است با اینکه یک نفر می‌تواند با یک گزارش پیامی را
// پاک کند: هر کاربر هر پیام را فقط یک‌بار گزارش می‌تواند (یکتاییِ
// messageId+reporterId)، سقفِ نرخِ ۲۰ گزارش در ساعت هم هست، و همه‌ی
// گزارش‌ها با متنِ کاملِ پیام در صفِ ادمین باقی می‌مانند — سوءاستفاده‌ی
// مکرر همان‌جا دیده و اکانتِ گزارش‌دهنده هم قابلِ تنبیه است.
export async function POST(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;

  const payload = await req.json().catch(() => null);
  const messageId = typeof payload?.messageId === "string" ? payload.messageId : "";
  if (!messageId) return NextResponse.json({ error: "شناسه پیام لازم است" }, { status: 400 });
  if (!isChatReportReason(payload?.reason)) {
    return NextResponse.json({ error: "دلیل گزارش نامعتبر است" }, { status: 400 });
  }

  // سقفِ نرخ تا کسی نتواند با گزارشِ انبوه صف را غرق کند
  if (!(await checkRateLimit(`chat-report:${guard.userId}`, 20, 60 * 60_000))) {
    return NextResponse.json({ error: "تعداد گزارش‌هایت زیاد شده — بعداً دوباره تلاش کن" }, { status: 429 });
  }

  const message = await prisma.tradeChatMessage.findUnique({
    where: { id: messageId },
    select: { id: true, userId: true, deletedAt: true },
  });
  if (!message || message.deletedAt) {
    return NextResponse.json({ error: "پیام پیدا نشد" }, { status: 404 });
  }
  if (message.userId === guard.userId) {
    return NextResponse.json({ error: "نمی‌توانی پیام خودت را گزارش کنی" }, { status: 400 });
  }

  const note = clampText(String(payload?.note ?? "").trim(), 500) || null;
  const now = new Date();

  // یکتاییِ (messageId, reporterId) در دیتابیس تضمین شده؛ این‌جا upsert
  // می‌کنیم تا گزارشِ دوباره خطای ۵۰۰ ندهد و فقط بی‌اثر باشد. همراهش پیام
  // حذف (نرم) می‌شود و همه‌ی گزارش‌های همین پیام ACTIONED می‌شوند — طبقِ
  // همان تصمیمِ بالای فایل.
  await prisma.$transaction([
    prisma.tradeChatReport.upsert({
      where: { messageId_reporterId: { messageId, reporterId: guard.userId } },
      create: { messageId, reporterId: guard.userId, reason: payload.reason as TradeChatReportReason, note },
      update: {},
    }),
    prisma.tradeChatMessage.update({
      where: { id: messageId },
      data: { deletedAt: now, deletedBy: guard.userId },
    }),
    prisma.tradeChatReport.updateMany({
      where: { messageId, status: "OPEN" },
      data: { status: "ACTIONED", reviewedAt: now, reviewedBy: null },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
