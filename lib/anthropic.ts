// فراخوانی Claude API برای تولید رودمپ ساختاریافته از روی یک موضوع دلخواه.
// خروجی باید فقط JSON خام باشه (بدون توضیح اضافه)، طبق الگوی مشخص‌شده در
// system prompt، تا مستقیم قابل ذخیره در مدل Roadmap باشه.

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

async function callClaudeOnce(topic: string): Promise<GeneratedRoadmap> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY تنظیم نشده — این فیچر بدون کلید API کار نمی‌کند");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `موضوع: ${topic}` }],
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`خطا در فراخوانی Claude API: ${response.status} ${text}`);
  }

  const data = await response.json();
  const text: string = (data.content || [])
    .map((block: any) => (block.type === "text" ? block.text : ""))
    .join("");

  const cleaned = text.replace(/```json|```/g, "").trim();
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("پاسخ مدل قابل تبدیل به JSON نبود");
  }

  return normalizeRoadmap(parsed);
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
      return await callClaudeOnce(topic);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

// ============================================================================
// برنامه‌ی هوشمند ورزش — همون الگوی generateRoadmap (system prompt ثابت،
// پروفایل توی پیام کاربر، پارس/اعتبارسنجی سخت‌گیرانه چون UI مستقیم روی
// خروجی .map می‌زنه). اگه کلید API نبود یا تماس شکست خورد، فراخوان (route)
// باید به قالب ایستای lib/exercisePlans.ts برگرده — این فایل فقط پرتاب خطا می‌کنه.
// ============================================================================

const EXERCISE_SYSTEM_PROMPT = `تو یک مربی بدنسازی/تناسب‌اندام حرفه‌ای هستی که طبق اصول شناخته‌شده‌ی
تمرین مقاومتی و هوازی (NSCA/ACSM) برای کاربر یک برنامه‌ی هفتگی واقعی و اجراپذیر می‌سازی — نه یک قالب ژنریک.

فقط و فقط یک JSON خام برگردون (بدون هیچ توضیح اضافه، بدون Markdown fences)، یک آرایه دقیقاً به این شکل —
یک آیتم به‌ازای هر روزی که کاربر گفته باشگاه می‌ره (نه کمتر نه بیشتر، و day‌ها باید دقیقاً همون روزهایی
باشن که کاربر داده):

[
  { "day": "شنبه", "focus": "پایین‌تنه — اسکوات", "items": ["اسکوات هالتر ۴×۸", "لانج دمبل ۳×۱۰ هر پا", "پلانک ۳×۳۰ ثانیه"] }
]

قوانین:
- day دقیقاً یکی از نام‌های فارسی روزهای هفته (شنبه/یکشنبه/دوشنبه/سه‌شنبه/چهارشنبه/پنجشنبه/جمعه).
- هر آیتم: «نام حرکت تعداد‌ست×تکرار» یا برای کاردیو «نام حرکت + مدت‌زمان»، به سبک استاندارد فارسی بدنسازی.
- حجم/شدت متناسب با سطح، هدف، و دوره باشه: فاز حجم (bulk) = حجم تمرین بالاتر با تمرکز مقاومتی؛ فاز کات
  (cut) = مقاومتی حفظ‌عضله + کاردیوی اضافه برای کسری کالری؛ نگهداری یا بدون دوره خاص = متعادل.
- اگه کاربر محدودیت جسمی داره، از حرکات پرفشار/پرضربه (پرش، برپی، دویدن سرعتی) پرهیز کن و معادل ملایم‌تر بذار.
- بین ۲ تا ۵ حرکت برای هر روز؛ بین روزهایی که یک گروه عضلانی مشترک دارن فاصله‌ی ریکاوری منطقی بذار.
- قد/وزن فقط برای کالیبره‌کردن شدت/حجمه؛ هیچ توصیه‌ی پزشکی یا تغذیه‌ای نده.`;

export type ExercisePlanProfile = {
  level: "beginner" | "intermediate" | "advanced";
  goal: "strength" | "hypertrophy" | "cut" | "endurance";
  gymDays: string[]; // نام فارسی روزهای هفته
  heightCm?: number | null;
  weightKg?: number | null;
  trainingPhase: "bulk" | "cut" | "maintenance" | "none";
  hasPhysicalLimitation: boolean;
};

export type GeneratedExerciseDay = { day: string; focus: string; items: string[] };

const VALID_FA_DAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
const LEVEL_LABELS_FA: Record<ExercisePlanProfile["level"], string> = { beginner: "مبتدی", intermediate: "متوسط", advanced: "پیشرفته" };
const GOAL_LABELS_FA: Record<ExercisePlanProfile["goal"], string> = { strength: "قدرت", hypertrophy: "حجم عضلانی", cut: "کاهش چربی", endurance: "استقامت" };
const PHASE_LABELS_FA: Record<ExercisePlanProfile["trainingPhase"], string> = { bulk: "حجم (بالک)", cut: "کات (کاهش چربی)", maintenance: "نگهداری", none: "بدون دوره خاص" };

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

async function callExercisePlanOnce(profile: ExercisePlanProfile): Promise<GeneratedExerciseDay[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY تنظیم نشده — این فیچر بدون کلید API کار نمی‌کند");
  }

  const profileText = [
    `سطح: ${LEVEL_LABELS_FA[profile.level]}`,
    `هدف: ${GOAL_LABELS_FA[profile.goal]}`,
    `روزهای باشگاه: ${profile.gymDays.join("، ")}`,
    profile.heightCm ? `قد: ${profile.heightCm} سانتی‌متر` : null,
    profile.weightKg ? `وزن: ${profile.weightKg} کیلوگرم` : null,
    `دوره: ${PHASE_LABELS_FA[profile.trainingPhase]}`,
    profile.hasPhysicalLimitation ? "محدودیت جسمی داره — از حرکات پرفشار/پرضربه پرهیز کن" : null,
  ].filter(Boolean).join("\n");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 2000,
      system: EXERCISE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: profileText }],
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`خطا در فراخوانی Claude API: ${response.status} ${text}`);
  }

  const data = await response.json();
  const text: string = (data.content || [])
    .map((block: any) => (block.type === "text" ? block.text : ""))
    .join("");

  const cleaned = text.replace(/```json|```/g, "").trim();
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("پاسخ مدل قابل تبدیل به JSON نبود");
  }

  return normalizeExercisePlan(parsed, profile.gymDays);
}

export async function generateExercisePlan(profile: ExercisePlanProfile): Promise<GeneratedExerciseDay[]> {
  let lastError: any;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await callExercisePlanOnce(profile);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

// جایگزینیِ یک حرکت — وقتی باشگاه کاربر تجهیزاتش رو نداره. عمداً یک تماس کوچک
// و جدا از ساخت کل برنامه‌ست، چون این یک ابزار سبک روزمره‌ست نه «برنامه جدید»
// (رو سقف دوهفته‌ای حساب نمی‌شه، فقط با rate-limit جدا محدود می‌شه).
const SUBSTITUTE_SYSTEM_PROMPT = `تو یک مربی بدنسازی هستی. کاربر یک حرکت تمرینی داره که تجهیزاتش رو توی
باشگاهش نداره. یک حرکت جایگزین با تجهیزات متفاوت (یا وزن بدن) پیشنهاد بده که همون گروه عضلانی/هدف رو
پوشش بده، با همون فرمت «نام حرکت تعداد‌ست×تکرار» (یا مدت‌زمان برای کاردیو).

فقط این JSON خام رو برگردون، بدون هیچ توضیح اضافه: { "substitute": "نام حرکت جدید تعداد‌ست×تکرار" }`;

export async function suggestExerciseSubstitute(exerciseItem: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY تنظیم نشده — این فیچر بدون کلید API کار نمی‌کند");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 200,
      system: SUBSTITUTE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: `حرکت: ${exerciseItem}` }],
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`خطا در فراخوانی Claude API: ${response.status} ${text}`);
  }

  const data = await response.json();
  const text: string = (data.content || [])
    .map((block: any) => (block.type === "text" ? block.text : ""))
    .join("");

  const cleaned = text.replace(/```json|```/g, "").trim();
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("پاسخ مدل قابل تبدیل به JSON نبود");
  }

  const substitute = typeof parsed?.substitute === "string" ? parsed.substitute.trim() : "";
  if (!substitute) {
    throw new Error("مدل جایگزین معتبری برنگردوند");
  }
  return substitute;
}
