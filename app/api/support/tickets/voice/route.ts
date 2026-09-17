import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { readAudioFromRequest, transcribeVoice } from "@/lib/speechToText";

// تبدیلِ ویس به متن برای فیلدِ پیامِ پشتیبانی — طبقِ درخواستِ صریح («دکمه
// ارسال و فیلدِ متن مثلِ مدیربرنامه باشه، فرد حتی بتونه ویس بفرسته»).
//
// عمدا هیچ ماژولی گیت نمی‌شود (برخلافِ routine/assistant/voice که پشتِ
// ModuleKey.ROUTINE است) — پشتیبانی باید برای هر کاربرِ واردشده در دسترس
// باشد، صرف‌نظر از این‌که کدام پلن را دارد. منطقِ تبدیل خودش توی
// lib/speechToText.ts مشترک با همان روتِ روتین است.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(await checkRateLimit(`support-voice:${userId}`, 20, 10 * 60 * 1000))) {
    return NextResponse.json(
      { error: "ویس‌ها را خیلی سریع پشتِ هم فرستادی. چند دقیقه صبر کن." },
      { status: 429 }
    );
  }

  const fileOrResponse = await readAudioFromRequest(req);
  if (fileOrResponse instanceof NextResponse) return fileOrResponse;

  const result = await transcribeVoice(fileOrResponse, "SUPPORT_VOICE");
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ text: result.text });
}
