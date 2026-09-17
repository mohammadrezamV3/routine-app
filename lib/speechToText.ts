import { NextResponse } from "next/server";
import { logError } from "@/lib/errorLog";

// منطقِ مشترکِ تبدیلِ ویس به متن — قبلا فقط داخلِ
// app/api/routine/assistant/voice/route.ts بود؛ حالا پشتیبانی (تیکت) هم
// همین را صدا می‌زند، پس یک‌بار این‌جا نوشته شده تا دو کپی از هم درنروند.
//
// فایلِ صوتی هیچ‌جا ذخیره نمی‌شود؛ فقط از حافظه به سرویسِ تبدیل می‌رود.

export const MAX_AUDIO_BYTES = 1024 * 1024;
const ALLOWED_AUDIO_PREFIXES = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav"];

export type SttResult = { ok: true; text: string } | { ok: false; status: number; error: string };

export async function transcribeVoice(file: File, feature: string): Promise<SttResult> {
  const sttUrl = process.env.ARVAN_AI_STT_URL;
  const apiKey = process.env.ARVAN_AI_STT_API_KEY || process.env.ARVAN_AI_API_KEY;
  if (!sttUrl || !apiKey) {
    return { ok: false, status: 503, error: "تبدیلِ ویس به متن روی این سرور فعال نیست. فعلا پیامت را تایپ کن." };
  }
  if (file.size === 0) return { ok: false, status: 400, error: "چیزی ضبط نشد. دوباره امتحان کن." };
  if (file.size > MAX_AUDIO_BYTES) return { ok: false, status: 413, error: "ویس خیلی طولانی است. کوتاه‌تر بگو." };
  const type = (file.type || "").toLowerCase();
  if (type && !ALLOWED_AUDIO_PREFIXES.some((p) => type.startsWith(p))) {
    return { ok: false, status: 415, error: "قالبِ فایلِ صوتی پشتیبانی نمی‌شود." };
  }

  const upstream = new FormData();
  upstream.append("file", file, file.name || "voice.webm");
  upstream.append("model", process.env.ARVAN_AI_STT_MODEL || "whisper-1");
  // زبان را صریح می‌دهیم: تشخیصِ خودکار روی جمله‌های کوتاهِ فارسی گاهی
  // عربی/اردو حدس می‌زند و خروجی به کلی بی‌ربط می‌شود.
  upstream.append("language", "fa");
  // بدونِ این فیلد، گیت‌وی پیش‌فرض را روی response_format:"verbose_json"
  // می‌گذارد و مدلِ انتخاب‌شده همان را رد می‌کند — نگاه کن به کامنتِ قبلیِ
  // همین منطق در routine/assistant/voice.
  upstream.append("response_format", "json");

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
    logError("ai-gateway", `تبدیلِ ویس شکست خورد: ${e?.message || e}`, { context: { feature } });
    return { ok: false, status: 503, error: timedOut ? "تبدیلِ ویس طول کشید. دوباره بفرست." : "به سرویسِ تبدیلِ ویس وصل نشدم." };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logError("ai-gateway", `سرویسِ تبدیلِ ویس ${res.status} داد: ${body.slice(0, 200)}`, { context: { feature } });
    return { ok: false, status: 503, error: "تبدیلِ ویس انجام نشد. دوباره امتحان کن." };
  }

  const data = await res.json().catch(() => null);
  const text = typeof data?.text === "string" ? data.text.trim() : "";
  if (!text) return { ok: false, status: 422, error: "چیزی از ویس فهمیده نشد. واضح‌تر بگو." };
  return { ok: true, text: text.slice(0, 500) };
}

/** خواندنِ فایلِ صوتیِ فرم‌دیتای درخواست — مشترک بینِ هر دو روت. */
export async function readAudioFromRequest(req: Request): Promise<File | NextResponse> {
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
  return file;
}
