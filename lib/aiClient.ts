// فراخوانیِ گیت‌وی هوش‌مصنوعیِ آروان‌کلود برای همه‌ی جاهایی که این اپ از AI
// استفاده می‌کنه — قبلاً مستقیم به Anthropic Messages API وصل بودن، الان
// همه از همین یک تابعِ مشترک (callAiChat) رد می‌شن که با API سازگارِ
// OpenAIِ همین گیت‌وی (endpoint‌ِ chat/completions) حرف می‌زنه. مدلِ
// پیش‌فرض GPT-4o-mini است (AI_MODEL_NAME)، ولی هر فراخوانی می‌تونه مدلِ
// خودش رو صریح بده — گزارشِ هفتگی مثلاً از WEEKLY_REPORT_AI_MODEL استفاده
// می‌کنه، چون کارش تحلیل/استدلاله نه تولیدِ قالبی.
// خروجی همیشه باید فقط JSON خام باشه (بدون توضیح اضافه) — هم با
// response_format:{type:"json_object"} در سطحِ خودِ فراخوانی اجباری شده، هم
// توی هر system prompt صریح تکرار شده، تا مستقیم قابلِ ذخیره/نمایش باشه.

import { AiFeatureKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/errorLog";
import { getAiCostRate, estimateAiCostUsdMicros } from "@/lib/appSettings";

const AI_MODEL_NAME = "gpt-4o-mini";

// گزارشِ هفتگی عمداً از یک مدلِ جداگانه استفاده می‌کنه (نه mini مثلِ بقیه‌ی
// فیچرها) — چون کارش تحلیل/تفسیرِ الگوهاست (نه تولیدِ قالبیِ ساده مثلِ
// رودمپ)، به استدلالِ قوی‌تری نیاز داره. اسمِ دقیقِ مدل روی گیت‌وی هنوز
// تایید نشده، برای همین از env قابلِ‌عوض‌کردنه — اگه رویِ گیت‌وی واقعی این
// اسم جواب نداد، بدونِ نیاز به تغییرِ کد فقط ARVAN_AI_WEEKLY_MODEL رو ست کن.
export const WEEKLY_REPORT_AI_MODEL = process.env.ARVAN_AI_WEEKLY_MODEL || "gpt-5.4-mini";

type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type ChatUsage = { inputTokens: number; outputTokens: number };
type ChatResult = { text: string; usage: ChatUsage; durationMs: number };

// پنل Owner › مصرف AI — یک ردیفِ واقعی به‌ازای هر فراخوانیِ واقعیِ گیت‌وی.
// success:true یعنی گیت‌وی واقعاً پاسخ داد و توکن مصرف شد (حتی اگه بعداً
// اعتبارسنجیِ ساختارِ خروجی شکست بخوره — هزینه‌ش واقعاً اتفاق افتاده)؛
// success:false یعنی خودِ فراخوانی (شبکه/HTTP) شکست خورده، پس توکنی مصرف نشده.
async function recordAiUsage(
  userId: string,
  feature: AiFeatureKey,
  usage: ChatUsage,
  durationMs: number,
  success: boolean,
  model: string = AI_MODEL_NAME
) {
  try {
    const rate = await getAiCostRate();
    await prisma.aiUsageRecord.create({
      data: {
        userId,
        feature,
        model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        costUsdMicros: estimateAiCostUsdMicros(usage.inputTokens, usage.outputTokens, rate),
        durationMs,
        success,
      },
    });
  } catch (err: any) {
    // ثبتِ آمار نباید جلوی مسیرِ اصلیِ فیچر رو بگیره
    logError("ai-gateway", `ثبتِ AiUsageRecord شکست خورد: ${err?.message || err}`, { severity: "WARNING" as any, context: { feature } });
  }
}

// سقفِ انتظار برای پاسخِ گیت‌وی.
//
// همان دلیلِ lib/zibal.ts و lib/zarinpal.ts: `fetch` در Node تایم‌اوتِ
// پیش‌فرض ندارد، ولی nginx دارد. بدون این، یک گیت‌ویِ کند باعث می‌شد nginx
// اتصال را ببندد و یک صفحه‌ی HTML با کدِ ۵۰۴ بدهد؛ کلاینت روی `r.json()`
// خطا می‌خورد و کاربر پیامِ گمراه‌کننده‌ی «مشکلی در اتصال به سرور» را
// می‌دید — دقیقاً همان چیزی که روی صفحه‌ی گزارش هفتگی گزارش شد.
//
// عددش از درگاه‌های پرداخت بیشتر است چون تولیدِ متن ذاتاً کند است؛ در عوض
// روت‌های AI باید در nginx مهلتِ بیشتری بگیرند (deploy/nginx.conf.example).
const AI_TIMEOUT_MS = 45_000;

// baseUrl و apiKey هر دو از env میان — هیچ‌وقت نباید هاردکد یا کامیت بشن؛
// فقط توی .env سمتِ سرور (که .gitignore/.dockerignore شده) قرار می‌گیرن.
// نکته‌ی مهم: خودِ baseUrl فقط آدرسِ روتینگِ گیت‌وی به این مدلِ خاصه، شاملِ
// توکنِ احرازهویت نیست — احرازهویتِ واقعی با یه Access Key جداست که از
// پنلِ آروان‌کلود، بخشِ «ماشین یوزر» (Machine User) ساخته و گرفته می‌شه.
async function callAiChat(system: string, userContent: string | ChatContentPart[], maxTokens: number, model: string = AI_MODEL_NAME): Promise<ChatResult> {
  const baseUrl = process.env.ARVAN_AI_BASE_URL;
  const apiKey = process.env.ARVAN_AI_API_KEY;
  if (!baseUrl) {
    throw new Error("ARVAN_AI_BASE_URL تنظیم نشده — این فیچر بدون آدرسِ گیت‌وی کار نمی‌کند");
  }
  if (!apiKey) {
    throw new Error("ARVAN_AI_API_KEY تنظیم نشده — این فیچر بدون کلید دسترسی کار نمی‌کند");
  }

  const startedAt = Date.now();
  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
      }),
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    });
  } catch (e: any) {
    if (e?.name === "TimeoutError" || e?.name === "AbortError") {
      throw new Error(`گیت‌وی هوش مصنوعی در ${AI_TIMEOUT_MS / 1000} ثانیه پاسخ نداد`);
    }
    throw new Error("اتصال به گیت‌وی هوش مصنوعی برقرار نشد");
  }
  const durationMs = Date.now() - startedAt;

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`خطا در فراخوانی گیت‌وی AI: ${response.status} ${text}`);
  }

  const data = await response.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  const usage: ChatUsage = {
    inputTokens: Number(data?.usage?.prompt_tokens) || 0,
    outputTokens: Number(data?.usage?.completion_tokens) || 0,
  };
  if (!text) throw new Error("پاسخ مدل خالی بود");
  return { text, usage, durationMs };
}

function parseJsonResponse(text: string): any {
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("پاسخ مدل قابل تبدیل به JSON نبود");
  }
}

const SYSTEM_PROMPT = `تو یک طراح مسیر یادگیری (roadmap) هستی. کاربر یک موضوع می‌ده و تو باید یک
مسیر یادگیری ساختاریافته و واقع‌بینانه براش بسازی، به زبان فارسی.

فقط و فقط یک JSON خام برگردون، بدون هیچ متن اضافه قبل یا بعدش، بدون Markdown fences.
دقیقاً با این شکل:

{
  "title": "عنوان کوتاه مسیر",
  "note": "یک جمله توضیح کلی درباره این مسیر",
  "stations": [
    { "t": "عنوان مرحله", "items": ["نکته ۱", "نکته ۲", "نکته ۳", "نکته ۴"] }
  ],
  "tips": ["نکته کلیدی ۱", "نکته کلیدی ۲", "نکته کلیدی ۳"],
  "pro": ["توصیه برای حرفه‌ای‌شدن ۱", "توصیه برای حرفه‌ای‌شدن ۲"],
  "books": ["نام کتاب یا منبع ۱", "نام کتاب یا منبع ۲"]
}

بین ۴ تا ۶ مرحله (station) بساز، هر کدوم با ۳ تا ۵ آیتم. واقع‌بین باش، نه ژنریک.`;

export type GeneratedRoadmap = {
  title: string;
  note: string;
  stations: { t: string; items: string[] }[];
  tips: string[];
  pro: string[];
  books: string[];
};

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === "string" && x.trim().length > 0);
}

/**
 * مدل زبانی گاهی خروجی رو دقیقاً طبق شکل خواسته‌شده برنمی‌گردونه (فیلد
 * جاافتاده، station بدون items، و ...). این تابع خروجی رو اعتبارسنجی و
 * نرمال می‌کنه تا هیچ‌وقت داده ناقص/بدشکل به دیتابیس یا UI نرسه — چون
 * صفحه جزئیات رودمپ مستقیم روی این فیلدها .map می‌زنه و با undefined کرش می‌کنه.
 */
function normalizeRoadmap(raw: any): GeneratedRoadmap {
  if (!raw || typeof raw !== "object") {
    throw new Error("خروجی مدل ساختار معتبری نداشت");
  }

  const stationsRaw = Array.isArray(raw.stations) ? raw.stations : [];
  const stations = stationsRaw
    .map((s: any) => ({
      t: typeof s?.t === "string" && s.t.trim() ? s.t.trim() : "مرحله بدون عنوان",
      items: asStringArray(s?.items),
    }))
    .filter((s: any) => s.items.length > 0);

  if (stations.length === 0) {
    throw new Error("مدل هیچ مرحله‌ی قابل‌استفاده‌ای برنگردوند");
  }

  return {
    title: typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : "مسیر یادگیری",
    note: typeof raw.note === "string" ? raw.note.trim() : "",
    stations,
    tips: asStringArray(raw.tips),
    pro: asStringArray(raw.pro),
    books: asStringArray(raw.books),
  };
}

async function callRoadmapOnce(topic: string, userId: string): Promise<GeneratedRoadmap> {
  const { text, usage, durationMs } = await callAiChat(SYSTEM_PROMPT, `موضوع: ${topic}`, 2000);
  // گیت‌وی واقعاً پاسخ داد و توکن مصرف شد — صرفِ‌نظر از اینکه اعتبارسنجیِ
  // ساختارِ خروجی پایین‌تر موفق بشه یا نه
  recordAiUsage(userId, AiFeatureKey.ROADMAP_GENERATION, usage, durationMs, true);
  return normalizeRoadmap(parseJsonResponse(text));
}

/**
 * تا ۲ بار امتحان می‌کنه — چون خطای parse/شکل گاهی گذراست (یک تولید بد
 * تصادفی)، نه یک خطای ساختاری همیشگی. اگه هر دو بار شکست خورد، همون خطای
 * تلاش آخر رو برمی‌گردونه.
 */
export async function generateRoadmap(topic: string, userId: string): Promise<GeneratedRoadmap> {
  let lastError: any;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await callRoadmapOnce(topic, userId);
    } catch (err) {
      lastError = err;
    }
  }
  // هر دو تلاش شکست خورد. اگه یه attempt واقعاً از گیت‌وی جواب گرفته بود، همون
  // داخلِ callRoadmapOnce با success:true ثبت شده (چون هزینه‌ش واقعاً افتاده)؛
  // این‌جا فقط شکستِ نهایی رو برای بخشِ «خطاها» ثبت می‌کنیم.
  logError("ai-gateway", `ساختِ رودمپ شکست خورد: ${lastError?.message || lastError}`, { context: { feature: "ROADMAP_GENERATION" } });
  throw lastError;
}

// ============================================================================
// برنامه‌ی هوشمند ورزش — همون الگوی generateRoadmap (system prompt ثابت،
// پروفایل توی پیام کاربر، پارس/اعتبارسنجی سخت‌گیرانه چون UI مستقیم روی
// خروجی .map می‌زنه). اگه آدرسِ گیت‌وی نبود یا تماس شکست خورد، فراخوان (route)
// باید به قالب ایستای lib/exercisePlans.ts برگرده — این فایل فقط پرتاب خطا می‌کنه.
// ============================================================================

const EXERCISE_SYSTEM_PROMPT = `تو یک مربی بدنسازی/تناسب‌اندام حرفه‌ای هستی که طبق اصول شناخته‌شده‌ی
تمرین مقاومتی و هوازی (NSCA/ACSM) برای کاربر یک برنامه‌ی هفتگی واقعی و اجراپذیر می‌سازی — نه یک قالب ژنریک.

اول، با توجه به مشخصات کاربر و توضیحی که خودش نوشته (اگه نوشته باشه)، بررسی کن این درخواست از نظر
بدنی/تمرینی واقع‌بینانه، بی‌خطر و قابل‌اجراست یا نه (مثلاً تناقض آشکار بین هدف/توضیح و روزهای موجود،
خواسته‌ی غیرممکن یا خطرناک، یا توضیحی که با محدودیت جسمی‌ای که گفته در تضاده).

اگه واقع‌بینانه نبود، فقط همین JSON خام رو برگردون (بدون Markdown fence، بدون هیچ متن دیگه):
{ "feasible": false, "message": "یک پیام کوتاه و دوستانه به فارسی، مثل یک چت‌بات که مستقیم با کاربر حرف می‌زنه، که توضیح بده چرا این ممکن نیست و چه پیشنهاد جایگزینی داری" }

اگه واقع‌بینانه و قابل‌اجرا بود، فقط همین JSON خام رو برگردون (بدون Markdown fence، بدون هیچ متن دیگه) —
یک آیتم به‌ازای هر روزی که کاربر گفته باشگاه می‌ره (نه کمتر نه بیشتر، و day‌ها باید دقیقاً همون روزهایی
باشن که کاربر داده):
{
  "feasible": true,
  "days": [
    { "day": "شنبه", "focus": "پایین‌تنه — اسکوات", "items": ["اسکوات هالتر ۴×۸", "لانج دمبل ۳×۱۰ هر پا", "پلانک ۳×۳۰ ثانیه"] }
  ]
}

قوانین (وقتی feasible=true):
- day دقیقاً یکی از نام‌های فارسی روزهای هفته (شنبه/یکشنبه/دوشنبه/سه‌شنبه/چهارشنبه/پنجشنبه/جمعه).
- هر آیتم: «نام حرکت تعداد‌ست×تکرار» یا برای کاردیو «نام حرکت + مدت‌زمان»، به سبک استاندارد فارسی بدنسازی.
- اگه کاربر توضیحی نوشته، برنامه رو با توجه به همون توضیح (نوع تمرین، تجهیزات، ترجیحات) بساز، نه یک قالب ژنریک.
- اگه کاربر محدودیت جسمی داره، از حرکات پرفشار/پرضربه (پرش، برپی، دویدن سرعتی) پرهیز کن و معادل ملایم‌تر بذار.
- بین ۲ تا ۵ حرکت برای هر روز؛ بین روزهایی که یک گروه عضلانی مشترک دارن فاصله‌ی ریکاوری منطقی بذار.
- قد/وزن فقط برای کالیبره‌کردن شدت/حجمه؛ هیچ توصیه‌ی پزشکی یا تغذیه‌ای نده.`;

export type ExercisePlanProfile = {
  level: "beginner" | "intermediate" | "advanced";
  goalLabel: string; // برچسبِ فارسیِ هدف، از قبل توسط caller حل‌شده (چون گزینه‌های هدف سمتِ UI بیشتر از این تایپِ محدودن)
  gymDays: string[]; // نام فارسی روزهای هفته
  heightCm?: number | null;
  weightKg?: number | null;
  hasPhysicalLimitation: boolean;
  limitationDetails?: string | null;
  description?: string | null;
};

export type GeneratedExerciseDay = { day: string; focus: string; items: string[] };
export type ExercisePlanResult =
  | { feasible: true; days: GeneratedExerciseDay[] }
  | { feasible: false; message: string };

const VALID_FA_DAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
const LEVEL_LABELS_FA: Record<ExercisePlanProfile["level"], string> = { beginner: "مبتدی", intermediate: "متوسط", advanced: "پیشرفته" };

function normalizeExercisePlan(raw: any, allowedDays: string[]): GeneratedExerciseDay[] {
  if (!Array.isArray(raw)) throw new Error("خروجی مدل ساختار معتبری نداشت");
  const days: GeneratedExerciseDay[] = raw
    .map((d: any) => ({
      day: typeof d?.day === "string" ? d.day.trim() : "",
      focus: typeof d?.focus === "string" && d.focus.trim() ? d.focus.trim() : "تمرین",
      items: asStringArray(d?.items),
    }))
    .filter((d: GeneratedExerciseDay) => VALID_FA_DAYS.includes(d.day) && allowedDays.includes(d.day) && d.items.length > 0);

  if (days.length === 0) {
    throw new Error("مدل هیچ روز قابل‌استفاده‌ای برنگردوند");
  }
  return days;
}

async function callExercisePlanOnce(profile: ExercisePlanProfile, userId: string): Promise<ExercisePlanResult> {
  const profileText = [
    `سطح: ${LEVEL_LABELS_FA[profile.level]}`,
    `هدف: ${profile.goalLabel}`,
    `روزهای باشگاه: ${profile.gymDays.join("، ")}`,
    profile.heightCm ? `قد: ${profile.heightCm} سانتی‌متر` : null,
    profile.weightKg ? `وزن: ${profile.weightKg} کیلوگرم` : null,
    profile.hasPhysicalLimitation ? "محدودیت جسمی داره — از حرکات پرفشار/پرضربه پرهیز کن" : null,
    profile.hasPhysicalLimitation && profile.limitationDetails ? `توضیحِ محدودیتِ جسمی: ${profile.limitationDetails}` : null,
    profile.description ? `توضیحِ کاربر درباره‌ی برنامه‌ی دلخواهش: ${profile.description}` : null,
  ].filter(Boolean).join("\n");

  const { text, usage, durationMs } = await callAiChat(EXERCISE_SYSTEM_PROMPT, profileText, 2000);
  recordAiUsage(userId, AiFeatureKey.EXERCISE_PLAN_GENERATION, usage, durationMs, true);
  const parsed = parseJsonResponse(text);

  if (parsed?.feasible === false) {
    const message = typeof parsed?.message === "string" && parsed.message.trim()
      ? parsed.message.trim()
      : "این برنامه با مشخصاتی که وارد کردی قابل‌اجرا نیست.";
    return { feasible: false, message };
  }

  return { feasible: true, days: normalizeExercisePlan(parsed?.days, profile.gymDays) };
}

export async function generateExercisePlan(profile: ExercisePlanProfile, userId: string): Promise<ExercisePlanResult> {
  let lastError: any;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await callExercisePlanOnce(profile, userId);
      // «feasible: false» یک پاسخِ معتبرِ مدلِه، نه خطای موقتِ شبکه/پارس —
      // نباید دوباره تلاش کنیم، همون رد رو مستقیم برگردونیم.
      return result;
    } catch (err) {
      lastError = err;
    }
  }
  logError("ai-gateway", `ساختِ برنامه‌ی تمرینی شکست خورد: ${lastError?.message || lastError}`, { context: { feature: "EXERCISE_PLAN_GENERATION" } });
  throw lastError;
}

// ============================================================================
// اسکنِ عکسِ غذا با هوش مصنوعی — تنها فراخوانیِ چندوجهی (multimodal) این فایل؛
// بقیه‌ی فراخوان‌ها فقط متنی‌ان. خروجی شاملِ کالری + درشت‌مغذی‌هاست، چون
// این تنها راهِ عملیِ این اپه که بدونِ کاتالوگِ دستیِ درشت‌مغذی برای هزاران
// غذا، بخشِ «ریزِ درشت‌مغذی‌ها» عدد داشته باشه.
// ============================================================================

const FOOD_SCAN_SYSTEM_PROMPT = `تو یک متخصص تغذیه هستی که با نگاه‌کردن به عکسِ یک وعده غذا، مقدارِ کالری و
درشت‌مغذی‌هاش رو تخمین می‌زنی. این یک تخمینِ بصریه، نه اندازه‌گیریِ آزمایشگاهی — بر اساسِ نوع و حجمِ ظاهریِ
غذا در عکس بهترین حدسِ واقع‌بینانه رو بزن.

اگه عکس اصلاً غذا/نوشیدنیِ قابل‌تشخیصی نشون نمی‌ده، فقط همین JSON خام رو برگردون:
{ "recognized": false, "message": "یک جمله‌ی کوتاه و دوستانه به فارسی که بگه غذایی توی عکس تشخیص داده نشد" }

اگه غذا قابل‌تشخیص بود، فقط همین JSON خام رو برگردون (بدون Markdown fence، بدون هیچ متنِ اضافه):
{
  "recognized": true,
  "name": "نامِ فارسیِ کوتاهِ غذا",
  "estimatedGrams": 250,
  "calories": 480,
  "proteinG": 22,
  "carbsG": 55,
  "fatG": 18
}

قوانین: همه‌ی اعدادِ بالا باید عددِ مثبت باشن (نه رشته)؛ calories باید با estimatedGrams/proteinG/carbsG/fatG
هم‌خوانیِ تقریبی داشته باشه (پروتئین×۴ + کربوهیدرات×۴ + چربی×۹ ≈ calories)؛ هیچ توصیه‌ی پزشکی یا تشخیصی نده،
فقط تخمینِ عددی.`;

export type FoodScanResult =
  | { recognized: true; name: string; estimatedGrams: number; calories: number; proteinG: number; carbsG: number; fatG: number }
  | { recognized: false; message: string };

function asPositiveNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function analyzeFoodPhoto(base64Data: string, mediaType: "image/jpeg" | "image/png" | "image/webp", userId: string): Promise<FoodScanResult> {
  let chatResult: { text: string; usage: { inputTokens: number; outputTokens: number }; durationMs: number };
  try {
    chatResult = await callAiChat(
      FOOD_SCAN_SYSTEM_PROMPT,
      [
        { type: "text", text: "این عکسِ غذا رو تحلیل کن." },
        { type: "image_url", image_url: { url: `data:${mediaType};base64,${base64Data}` } },
      ],
      500
    );
  } catch (err: any) {
    logError("ai-gateway", `اسکنِ عکسِ غذا شکست خورد: ${err?.message || err}`, { context: { feature: "FOOD_SCAN" } });
    throw err;
  }
  const { text, usage, durationMs } = chatResult;
  recordAiUsage(userId, AiFeatureKey.FOOD_SCAN, usage, durationMs, true);
  const parsed = parseJsonResponse(text);

  if (parsed?.recognized === false) {
    const message = typeof parsed?.message === "string" && parsed.message.trim()
      ? parsed.message.trim()
      : "غذایی توی این عکس تشخیص داده نشد.";
    return { recognized: false, message };
  }

  const calories = asPositiveNumber(parsed?.calories);
  const estimatedGrams = asPositiveNumber(parsed?.estimatedGrams);
  const proteinG = asPositiveNumber(parsed?.proteinG) ?? 0;
  const carbsG = asPositiveNumber(parsed?.carbsG) ?? 0;
  const fatG = asPositiveNumber(parsed?.fatG) ?? 0;
  const name = typeof parsed?.name === "string" && parsed.name.trim() ? parsed.name.trim() : "";

  if (!calories || !estimatedGrams || !name) {
    throw new Error("مدل تخمین قابل‌استفاده‌ای برنگردوند");
  }

  return { recognized: true, name, estimatedGrams, calories, proteinG, carbsG, fatG };
}

// ============================================================================
// خلاصه‌ی هوشمندِ گزارشِ هفتگی — برخلافِ بقیه‌ی فراخوان‌های این فایل که یک
// چیز از صفر می‌سازن (رودمپ/برنامه‌ی تمرین/تخمینِ غذا)، این‌جا AI فقط روی
// اعدادِ از‌قبل‌محاسبه‌شده‌ی lib/weeklyReport/* (Deterministic Analytics)
// تفسیر می‌نویسه — هیچ عدد/دستاوردِ جدیدی حق نداره بسازه (محافظتِ در برابرِ
// Hallucination، بخشِ ۳۱ اسپکِ گزارشِ هفتگی). ورودی فقط همون خلاصه‌ست، نه
// دیتابیسِ خام کاربر.
// ============================================================================

const WEEKLY_AI_PROMPT_V1 = `تو دستیارِ تحلیلِ هفتگیِ Arion هستی. یک خلاصه‌ی آماریِ از‌قبل‌محاسبه‌شده از عملکردِ
هفتگیِ کاربر می‌گیری و باید یک تفسیرِ کوتاهِ فارسی و ۲ تا ۳ پیشنهادِ عملی بنویسی.

قوانینِ حیاتی:
- فقط از اعدادی که توی ورودی داده شده استفاده کن. هیچ عدد، درصد، یا دستاوردِ جدیدی که توی ورودی نیست نساز.
- اگه داده‌ی کافی برای یک جمع‌بندیِ خاص نداری، چیزی درباره‌ش نگو — حدس نزن.
- هیچ توصیه‌ی پزشکی، مالی، یا تشخیصی نده — فقط بازخوردِ رفتاری/عملکردی بر اساسِ همین اعداد.
- لحن: مستقیم، محترمانه، مثلِ یک مربیِ شخصی — نه ژنریک، نه اغراق‌آمیز.
- خلاصه (summary) حداکثر ۵ جمله.
- حداکثر ۳ پیشنهاد (recommendations)، هرکدوم با یک توضیحِ کوتاه و دلیلِ مبتنی‌بر همون اعداد.

فقط و فقط این JSON خام رو برگردون (بدون Markdown fence، بدون متنِ اضافه):
{
  "summary": "خلاصه‌ی ۳ تا ۵ جمله‌ای",
  "recommendations": [
    { "title": "عنوانِ کوتاه", "description": "توضیحِ کوتاه با دلیلِ مبتنی‌بر داده", "priority": "high" | "medium" | "low", "domain": "یکی از keyهای domains ورودی، یا null اگه مربوط به یک دامنه‌ی خاص نیست" }
  ]
}`;

export type WeeklyReportAiDomainInput = { key: string; label: string; score: number | null; previousWeek: number | null; active: boolean };
export type WeeklyReportAiInput = {
  weekLabel: string;
  overallScore: number | null;
  previousOverallScore: number | null;
  domains: WeeklyReportAiDomainInput[];
  wins: string[];
  problems: string[];
};
export type WeeklyRecommendation = { title: string; description: string; priority: "high" | "medium" | "low"; domain: string | null };
export type WeeklyReportAiResult = {
  summary: string;
  recommendations: WeeklyRecommendation[];
};

function normalizeWeeklyAiResult(raw: any): WeeklyReportAiResult {
  const summary = typeof raw?.summary === "string" ? raw.summary.trim() : "";
  if (!summary) throw new Error("مدل خلاصه‌ای برنگردوند");

  const recsRaw = Array.isArray(raw?.recommendations) ? raw.recommendations : [];
  const priorities = new Set(["high", "medium", "low"]);
  const recommendations: WeeklyRecommendation[] = recsRaw
    .map((r: any) => ({
      title: typeof r?.title === "string" ? r.title.trim() : "",
      description: typeof r?.description === "string" ? r.description.trim() : "",
      priority: priorities.has(r?.priority) ? r.priority : "medium",
      domain: typeof r?.domain === "string" && r.domain.trim() ? r.domain.trim() : null,
    }))
    .filter((r: any) => r.title && r.description)
    .slice(0, 3);

  return { summary, recommendations };
}

async function callWeeklyAiOnce(input: WeeklyReportAiInput, userId: string): Promise<WeeklyReportAiResult> {
  const userContent = JSON.stringify(input);
  const { text, usage, durationMs } = await callAiChat(WEEKLY_AI_PROMPT_V1, userContent, 1200, WEEKLY_REPORT_AI_MODEL);
  recordAiUsage(userId, AiFeatureKey.WEEKLY_COACH_REPORT, usage, durationMs, true, WEEKLY_REPORT_AI_MODEL);
  return normalizeWeeklyAiResult(parseJsonResponse(text));
}

/**
 * تا ۲ بار امتحان می‌کنه (هم‌الگوی generateRoadmap). اگه هردو شکست خورد،
 * caller (lib/weeklyReport/snapshot.ts) باید بدونِ AI هم گزارش رو کامل
 * نشون بده — این تابع صرفاً throw می‌کنه، تصمیمِ fallback مالِ اونجاست.
 */
export async function generateWeeklyReportSummary(input: WeeklyReportAiInput, userId: string): Promise<WeeklyReportAiResult> {
  let lastError: any;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await callWeeklyAiOnce(input, userId);
    } catch (err) {
      lastError = err;
    }
  }
  logError("ai-gateway", `خلاصه‌ی هوشمندِ گزارشِ هفتگی شکست خورد: ${lastError?.message || lastError}`, { context: { feature: "WEEKLY_COACH_REPORT" } });
  throw lastError;
}

// ============================================================================
// نسخه‌ی V2 — عمداً کنارِ V1 (WEEKLY_AI_PROMPT_V1/generateWeeklyReportSummary)
// نگه داشته شده، نه جایگزینش (بندِ ۸۷: پرامپت‌ها versioned‌ان، rollback
// باید ممکن بمونه). تفاوتِ اصلی: ورودی حالا شاملِ خروجیِ قطعیِ
// lib/weeklyReport/patterns.ts هم می‌شه (Trend/Streak/Outlier/Correlation)
// و خروجی یک آرایه‌ی insights هم داره — هرکدوم evidence-based، دقیقاً
// هم‌قاعده‌ی V1.
// ============================================================================

const WEEKLY_AI_PROMPT_V2 = `تو دستیارِ تحلیلِ هفتگیِ Arion هستی. یک خلاصه‌ی آماریِ از‌قبل‌محاسبه‌شده — شاملِ
امتیازها و همچنین الگوهای از‌قبل‌کشف‌شده (روند، استریک، ناهنجاری، همبستگی) — می‌گیری و باید تفسیرِ فارسی بنویسی.

قوانینِ حیاتی:
- فقط از اعداد/الگوهایی که توی ورودی داده شده استفاده کن. هیچ عدد، الگو، یا دستاوردِ جدیدی که توی ورودی نیست نساز.
- اگه داده‌ی کافی برای یک جمع‌بندیِ خاص نداری، چیزی درباره‌ش نگو.
- «correlations» فقط همبستگی‌ان، نه رابطه‌ی علت‌ومعلولی — هیچ‌وقت نگو «X باعثِ Y شد»، بگو «بینِ X و Y همبستگی دیده شد».
- هیچ توصیه‌ی پزشکی، مالی، یا تشخیصی نده.
- لحن: مستقیم، محترمانه، مثلِ یک مربیِ شخصی.
- خلاصه (summary) حداکثر ۵ جمله. حداکثر ۳ پیشنهاد. حداکثر ۳ insight.

فقط و فقط این JSON خام رو برگردون (بدون Markdown fence، بدون متنِ اضافه):
{
  "summary": "خلاصه‌ی ۳ تا ۵ جمله‌ای",
  "recommendations": [ { "title": "...", "description": "...", "priority": "high"|"medium"|"low", "domain": "یکی از keyهای domains ورودی، یا null" } ],
  "insights": [ { "title": "عنوانِ کوتاه", "description": "توضیحِ کوتاه", "evidence": "دلیلِ مبتنی‌بر اعدادِ ورودی", "confidence": "low"|"medium"|"high" } ]
}`;

export type WeeklyReportAiInputV2 = WeeklyReportAiInput & {
  patterns: {
    trends: { domain: string; direction: string }[];
    streaks: { domain: string; days: number }[];
    outliers: { domain: string; weekday: string; value: number; typicalRange: [number, number] }[];
    correlations: { domainA: string; domainB: string; withActiveAvg: number; withoutActiveAvg: number }[];
  };
};
export type WeeklyReportAiInsight = { title: string; description: string; evidence: string; confidence: "low" | "medium" | "high" };
export type WeeklyReportAiResultV2 = WeeklyReportAiResult & { insights: WeeklyReportAiInsight[] };

function normalizeWeeklyAiResultV2(raw: any): WeeklyReportAiResultV2 {
  const base = normalizeWeeklyAiResult(raw);
  const confidences = new Set(["low", "medium", "high"]);
  const insightsRaw = Array.isArray(raw?.insights) ? raw.insights : [];
  const insights: WeeklyReportAiInsight[] = insightsRaw
    .map((i: any) => ({
      title: typeof i?.title === "string" ? i.title.trim() : "",
      description: typeof i?.description === "string" ? i.description.trim() : "",
      evidence: typeof i?.evidence === "string" ? i.evidence.trim() : "",
      confidence: confidences.has(i?.confidence) ? i.confidence : "medium",
    }))
    .filter((i: any) => i.title && i.description && i.evidence)
    .slice(0, 3);
  return { ...base, insights };
}

async function callWeeklyAiV2Once(input: WeeklyReportAiInputV2, userId: string): Promise<WeeklyReportAiResultV2> {
  const { text, usage, durationMs } = await callAiChat(WEEKLY_AI_PROMPT_V2, JSON.stringify(input), 1600, WEEKLY_REPORT_AI_MODEL);
  recordAiUsage(userId, AiFeatureKey.WEEKLY_COACH_REPORT, usage, durationMs, true, WEEKLY_REPORT_AI_MODEL);
  return normalizeWeeklyAiResultV2(parseJsonResponse(text));
}

export async function generateWeeklyReportSummaryV2(input: WeeklyReportAiInputV2, userId: string): Promise<WeeklyReportAiResultV2> {
  let lastError: any;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await callWeeklyAiV2Once(input, userId);
    } catch (err) {
      lastError = err;
    }
  }
  logError("ai-gateway", `خلاصه‌ی هوشمندِ V2 گزارشِ هفتگی شکست خورد: ${lastError?.message || lastError}`, { context: { feature: "WEEKLY_COACH_REPORT" } });
  throw lastError;
}

// ============================================================================
// Ask Arion — سوال‌وجوابِ محدود به Contextِ همون گزارشِ هفتگی (نه یک
// چت‌بات عمومی). Contextِ ورودی همیشه از همون Snapshotِ cache‌شده میاد،
// نه دیتابیسِ خام (بندِ ۳۴). از AiFeatureKey.CORRELATION_INSIGHT استفاده
// می‌کنه — enumِ دومِ ازقبل‌موجودِ بلااستفاده، برای جداکردنِ آمارِ هزینه‌ی
// این مسیر از خلاصه‌ی خودکارِ WEEKLY_COACH_REPORT.
// ============================================================================

const ASK_ARION_SYSTEM_PROMPT = `تو Arion هستی، دستیارِ شخصیِ تحلیلِ هفتگی. کاربر دربارهٔ گزارشِ هفتگیِ خودش سوال می‌پرسه.
فقط از دیتایی که توی Context داده شده جواب بده — اگه جواب توی Context نیست، صادقانه بگو نمی‌دونی، حدس نزن.
هیچ توصیه‌ی پزشکی یا مالیِ قطعی نده. جواب کوتاه باشه (حداکثر ۴-۵ جمله)، فارسی، مستقیم و محترمانه.

فقط و فقط این JSON خام رو برگردون: { "answer": "جوابِ کوتاه" }`;

export type AskArionContext = {
  weekLabel: string;
  overallScore: number | null;
  domains: WeeklyReportAiDomainInput[];
  wins: string[];
  problems: string[];
  insights: WeeklyReportAiInsight[];
};

function normalizeAskArionAnswer(raw: any): string {
  const answer = typeof raw?.answer === "string" ? raw.answer.trim() : "";
  if (!answer) throw new Error("مدل جوابی برنگردوند");
  return answer;
}

export async function answerWeeklyReportQuestion(question: string, context: AskArionContext, userId: string): Promise<string> {
  const userContent = JSON.stringify({ question, context });
  try {
    const { text, usage, durationMs } = await callAiChat(ASK_ARION_SYSTEM_PROMPT, userContent, 700, WEEKLY_REPORT_AI_MODEL);
    recordAiUsage(userId, AiFeatureKey.CORRELATION_INSIGHT, usage, durationMs, true, WEEKLY_REPORT_AI_MODEL);
    return normalizeAskArionAnswer(parseJsonResponse(text));
  } catch (err: any) {
    logError("ai-gateway", `Ask Arion شکست خورد: ${err?.message || err}`, { context: { feature: "CORRELATION_INSIGHT" } });
    throw err;
  }
}
