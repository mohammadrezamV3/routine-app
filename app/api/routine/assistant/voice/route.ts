import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { requireModule } from "@/lib/moduleAccess";
import { checkRateLimit } from "@/lib/rateLimit";
import { readAudioFromRequest, transcribeVoice } from "@/lib/speechToText";

// تبدیلِ ویسِ کاربر به متن، برای دکمه‌ی میکروفونِ «مدیرِ برنامه».
//
// این روت عمدا *فقط* متن برمی‌گرداند و هیچ تغییری در برنامه‌ها نمی‌دهد:
// متنِ حاصل مثل هر پیامِ تایپ‌شده‌ای به /api/routine/assistant می‌رود و همان
// اعتبارسنجی‌ها و همان سهمیه را می‌خورد. اگر این‌جا هم تغییر اعمال می‌شد،
// دو مسیرِ نوشتن داشتیم که باید جدا نگه داشته می‌شدند — و از هم درمی‌رفتند.
//
// منطقِ واقعیِ تبدیل (فراخوانی گیت‌وی) توی lib/speechToText.ts مشترک است؛
// پشتیبانی (app/api/support/tickets/voice) هم همان را صدا می‌زند — فقط
// گیتِ دسترسی این‌جا ماژولِ ROUTINE است، چون این دکمه فقط توی همان پنل است.

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const guard = await requireModule(ModuleKey.ROUTINE);
  if (!guard.ok) return guard.response;
  const { userId } = guard;

  // تبدیلِ گفتار گران‌تر از یک پیامِ متنی است، پس سقفِ سخت‌گیرانه‌تری دارد.
  if (!(await checkRateLimit(`routine-voice:${userId}`, 20, 10 * 60 * 1000))) {
    return NextResponse.json(
      { error: "ویس‌ها را خیلی سریع پشتِ هم فرستادی. چند دقیقه صبر کن." },
      { status: 429 }
    );
  }

  const fileOrResponse = await readAudioFromRequest(req);
  if (fileOrResponse instanceof NextResponse) return fileOrResponse;

  const result = await transcribeVoice(fileOrResponse, "ROUTINE_VOICE");
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ text: result.text });
}
