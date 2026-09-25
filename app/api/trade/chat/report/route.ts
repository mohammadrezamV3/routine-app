import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { requireModule } from "@/lib/moduleAccess";
import { reportChatMessage } from "@/lib/mobileSocialChat";

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
// پیاده‌سازی: lib/mobileSocialChat.ts → reportChatMessage (مشترک با موبایل).
export async function POST(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;

  const payload = await req.json().catch(() => null);
  const r = await reportChatMessage(guard.userId, payload);
  return NextResponse.json(r.body, { status: r.status });
}
