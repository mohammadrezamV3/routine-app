import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { requireModule } from "@/lib/moduleAccess";
import { checkRateLimit } from "@/lib/rateLimit";
import { logError } from "@/lib/errorLog";

// تبدیلِ ویسِ کاربر به متن، برای دکمه‌ی میکروفونِ «مدیرِ برنامه».
//
// این روت عمدا *فقط* متن برمی‌گرداند و هیچ تغییری در برنامه‌ها نمی‌دهد:
// متنِ حاصل مثل هر پیامِ تایپ‌شده‌ای به /api/routine/assistant می‌رود و همان
// اعتبارسنجی‌ها و همان سهمیه را می‌خورد. اگر این‌جا هم تغییر اعمال می‌شد،
// دو مسیرِ نوشتن داشتیم که باید جدا نگه داشته می‌شدند — و از هم درمی‌رفتند.
//
// فایلِ صوتی هیچ‌جا ذخیره نمی‌شود؛ فقط از حافظه به سرویسِ تبدیل می‌رود.

export const dynamic = "force-dynamic";

/** سقفِ حجمِ آپلود — با سقفِ سمتِ کلاینت یکی است، ولی کلاینت قابلِ دور زدن است */
const MAX_AUDIO_BYTES = 1024 * 1024;

const ALLOWED_AUDIO_PREFIXES = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav"];

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

  const sttUrl = process.env.ARVAN_AI_STT_URL;
  const apiKey = process.env.ARVAN_AI_STT_API_KEY || process.env.ARVAN_AI_API_KEY;
  if (!sttUrl || !apiKey) {
    // پیام باید بگوید «این قابلیت روشن نیست»، نه «خطایی رخ داد» — کاربر
    // نباید فکر کند ویسش بد بوده و ده بار دوباره امتحان کند.
    return NextResponse.json(
      { error: "تبدیلِ ویس به متن روی این سرور فعال نیست. فعلا پیامت را تایپ کن." },
      { status: 503 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "فایلِ صوتی خوانده نشد." }, { status: 400 });
  }

  const file = form.get("audio");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "فایلِ صوتی فرستاده نشد." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "چیزی ضبط نشد. دوباره امتحان کن." }, { status: 400 });
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "ویس خیلی طولانی است. کوتاه‌تر بگو." }, { status: 413 });
  }
  const type = (file.type || "").toLowerCase();
  if (type && !ALLOWED_AUDIO_PREFIXES.some((p) => type.startsWith(p))) {
    return NextResponse.json({ error: "قالبِ فایلِ صوتی پشتیبانی نمی‌شود." }, { status: 415 });
  }

  const upstream = new FormData();
  upstream.append("file", file, file.name || "voice.webm");
  upstream.append("model", process.env.ARVAN_AI_STT_MODEL || "whisper-1");
  // زبان را صریح می‌دهیم: تشخیصِ خودکار روی جمله‌های کوتاهِ فارسی گاهی
  // عربی/اردو حدس می‌زند و خروجی به کلی بی‌ربط می‌شود.
  upstream.append("language", "fa");

  let res: Response;
  try {
    res = await fetch(sttUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstream,
      signal: AbortSignal.timeout(45_000),
    });
  } catch (e: any) {
    const timedOut = e?.name === "TimeoutError" || e?.name === "AbortError";
    logError("ai-gateway", `تبدیلِ ویس شکست خورد: ${e?.message || e}`, { context: { feature: "ROUTINE_VOICE" } });
    return NextResponse.json(
      { error: timedOut ? "تبدیلِ ویس طول کشید. دوباره بفرست." : "به سرویسِ تبدیلِ ویس وصل نشدم." },
      { status: 503 }
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logError("ai-gateway", `سرویسِ تبدیلِ ویس ${res.status} داد: ${body.slice(0, 200)}`, {
      context: { feature: "ROUTINE_VOICE" },
    });
    return NextResponse.json({ error: "تبدیلِ ویس انجام نشد. دوباره امتحان کن." }, { status: 503 });
  }

  const data = await res.json().catch(() => null);
  const text = typeof data?.text === "string" ? data.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "چیزی از ویس فهمیده نشد. واضح‌تر بگو." }, { status: 422 });
  }

  return NextResponse.json({ text: text.slice(0, 500) });
}
