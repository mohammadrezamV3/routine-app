// فراخوانیِ گیت‌وی هوش‌مصنوعیِ آروان‌کلود (GPT-4o-mini) برای همه‌ی جاهایی که
// این اپ از AI استفاده می‌کنه — قبلاً مستقیم به Anthropic Messages API وصل
// بودن، الان همه از همین یک تابعِ مشترک (callAiChat) رد می‌شن که با API
// سازگارِ OpenAIِ همین گیت‌وی (endpoint‌ِ chat/completions) حرف می‌زنه.
// خروجی همیشه باید فقط JSON خام باشه (بدون توضیح اضافه) — هم با
// response_format:{type:"json_object"} در سطحِ خودِ فراخوانی اجباری شده، هم
// توی هر system prompt صریح تکرار شده، تا مستقیم قابلِ ذخیره/نمایش باشه.

type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

// baseUrl و apiKey هر دو از env میان — هیچ‌وقت نباید هاردکد یا کامیت بشن؛
// فقط توی .env سمتِ سرور (که .gitignore/.dockerignore شده) قرار می‌گیرن.
// نکته‌ی مهم: خودِ baseUrl فقط آدرسِ روتینگِ گیت‌وی به این مدلِ خاصه، شاملِ
// توکنِ احرازهویت نیست — احرازهویتِ واقعی با یه Access Key جداست که از
// پنلِ آروان‌کلود، بخشِ «ماشین یوزر» (Machine User) ساخته و گرفته می‌شه.
async function callAiChat(system: string, userContent: string | ChatContentPart[], maxTokens: number): Promise<string> {
  const baseUrl = process.env.ARVAN_AI_BASE_URL;
  const apiKey = process.env.ARVAN_AI_API_KEY;
  if (!baseUrl) {
    throw new Error("ARVAN_AI_BASE_URL تنظیم نشده — این فیچر بدون آدرسِ گیت‌وی کار نمی‌کند");
  }
  if (!apiKey) {
    throw new Error("ARVAN_AI_API_KEY تنظیم نشده — این فیچر بدون کلید دسترسی کار نمی‌کند");
  }

  const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`خطا در فراخوانی گیت‌وی AI: ${response.status} ${text}`);
  }

  const data = await response.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("پاسخ مدل خالی بود");
  return text;
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

async function callRoadmapOnce(topic: string): Promise<GeneratedRoadmap> {
  const text = await callAiChat(SYSTEM_PROMPT, `موضوع: ${topic}`, 2000);
  return normalizeRoadmap(parseJsonResponse(text));
}

/**
 * تا ۲ بار امتحان می‌کنه — چون خطای parse/شکل گاهی گذراست (یک تولید بد
 * تصادفی)، نه یک خطای ساختاری همیشگی. اگه هر دو بار شکست خورد، همون خطای
 * تلاش آخر رو برمی‌گردونه.
 */
export async function generateRoadmap(topic: string): Promise<GeneratedRoadmap> {
  let lastError: any;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await callRoadmapOnce(topic);
    } catch (err) {
      lastError = err;
    }
  }
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

async function callExercisePlanOnce(profile: ExercisePlanProfile): Promise<ExercisePlanResult> {
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

  const text = await callAiChat(EXERCISE_SYSTEM_PROMPT, profileText, 2000);
  const parsed = parseJsonResponse(text);

  if (parsed?.feasible === false) {
    const message = typeof parsed?.message === "string" && parsed.message.trim()
      ? parsed.message.trim()
      : "این برنامه با مشخصاتی که وارد کردی قابل‌اجرا نیست.";
    return { feasible: false, message };
  }

  return { feasible: true, days: normalizeExercisePlan(parsed?.days, profile.gymDays) };
}

export async function generateExercisePlan(profile: ExercisePlanProfile): Promise<ExercisePlanResult> {
  let lastError: any;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await callExercisePlanOnce(profile);
      // «feasible: false» یک پاسخِ معتبرِ مدلِه، نه خطای موقتِ شبکه/پارس —
      // نباید دوباره تلاش کنیم، همون رد رو مستقیم برگردونیم.
      return result;
    } catch (err) {
      lastError = err;
    }
  }
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

export async function analyzeFoodPhoto(base64Data: string, mediaType: "image/jpeg" | "image/png" | "image/webp"): Promise<FoodScanResult> {
  const text = await callAiChat(
    FOOD_SCAN_SYSTEM_PROMPT,
    [
      { type: "text", text: "این عکسِ غذا رو تحلیل کن." },
      { type: "image_url", image_url: { url: `data:${mediaType};base64,${base64Data}` } },
    ],
    500
  );
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
