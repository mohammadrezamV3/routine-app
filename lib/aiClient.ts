// فراخوانی گیت‌وی هوش‌مصنوعی آروان‌کلود برای همه‌ی جاهایی که این اپ از AI
// استفاده می‌کنه — قبلا مستقیم به Anthropic Messages API وصل بودن، الان
// همه از همین یک تابع مشترک (callAiChat) رد می‌شن که با API سازگار
// OpenAI همین گیت‌وی (endpoint‌ chat/completions) حرف می‌زنه. مدل
// پیش‌فرض GPT-4o-mini است (AI_MODEL_NAME)، ولی هر فراخوانی می‌تونه مدل
// خودش رو صریح بده — گزارش هفتگی مثلا از WEEKLY_REPORT_AI_MODEL استفاده
// می‌کنه، چون کارش تحلیل/استدلاله نه تولید قالبی.
// خروجی همیشه باید فقط JSON خام باشه (بدون توضیح اضافه) — هم با
// response_format:{type:"json_object"} در سطح خود فراخوانی اجباری شده، هم
// توی هر system prompt صریح تکرار شده، تا مستقیم قابل ذخیره/نمایش باشه.

import { AiFeatureKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/errorLog";
import { getAiCostRate, estimateAiCostUsdMicros } from "@/lib/appSettings";

const AI_MODEL_NAME = "gpt-4o-mini";

// گزارش هفتگی عمدا از یک مدل جداگانه استفاده می‌کنه (نه mini مثل بقیه‌ی
// فیچرها) — چون کارش تحلیل/تفسیر الگوهاست (نه تولید قالبی ساده مثل
// رودمپ)، به استدلال قوی‌تری نیاز داره. اسم دقیق مدل روی گیت‌وی هنوز
// تایید نشده، برای همین از env قابل‌عوض‌کردنه — اگه روی گیت‌وی واقعی این
// اسم جواب نداد، بدون نیاز به تغییر کد فقط ARVAN_AI_WEEKLY_MODEL رو ست کن.
export const WEEKLY_REPORT_AI_MODEL = process.env.ARVAN_AI_WEEKLY_MODEL || "gpt-5.4-mini";

type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type ChatUsage = { inputTokens: number; outputTokens: number };
type ChatResult = { text: string; usage: ChatUsage; durationMs: number };

// پنل Owner › مصرف AI — یک ردیف واقعی به‌ازای هر فراخوانی واقعی گیت‌وی.
// success:true یعنی گیت‌وی واقعا پاسخ داد و توکن مصرف شد (حتی اگه بعدا
// اعتبارسنجی ساختار خروجی شکست بخوره — هزینه‌ش واقعا اتفاق افتاده)؛
// success:false یعنی خود فراخوانی (شبکه/HTTP) شکست خورده، پس توکنی مصرف نشده.
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
    // ثبت آمار نباید جلوی مسیر اصلی فیچر رو بگیره
    logError("ai-gateway", `ثبت AiUsageRecord شکست خورد: ${err?.message || err}`, { severity: "WARNING" as any, context: { feature } });
  }
}

// سقف انتظار برای پاسخ گیت‌وی.
//
// همان دلیل lib/zibal.ts و lib/zarinpal.ts: `fetch` در Node تایم‌اوت
// پیش‌فرض ندارد، ولی nginx دارد. بدون این، یک گیت‌وی کند باعث می‌شد nginx
// اتصال را ببندد و یک صفحه‌ی HTML با کد ۵۰۴ بدهد؛ کلاینت روی `r.json()`
// خطا می‌خورد و کاربر پیام گمراه‌کننده‌ی «مشکلی در اتصال به سرور» را
// می‌دید — دقیقا همان چیزی که روی صفحه‌ی گزارش هفتگی گزارش شد.
//
// عددش از درگاه‌های پرداخت بیشتر است چون تولید متن ذاتا کند است؛ در عوض
// روت‌های AI باید در nginx مهلت بیشتری بگیرند (deploy/nginx.conf.example).
const AI_TIMEOUT_MS = 45_000;

// baseUrl و apiKey هر دو از env میان — هیچ‌وقت نباید هاردکد یا کامیت بشن؛
// فقط توی .env سمت سرور (که .gitignore/.dockerignore شده) قرار می‌گیرن.
// نکته‌ی مهم: خود baseUrl فقط آدرس روتینگ گیت‌وی به این مدل خاصه، شامل
// توکن احرازهویت نیست — احرازهویت واقعی با یه Access Key جداست که از
// پنل آروان‌کلود، بخش «ماشین یوزر» (Machine User) ساخته و گرفته می‌شه.
async function callAiChat(system: string, userContent: string | ChatContentPart[], maxTokens: number, model: string = AI_MODEL_NAME): Promise<ChatResult> {
  const baseUrl = process.env.ARVAN_AI_BASE_URL;
  const apiKey = process.env.ARVAN_AI_API_KEY;
  if (!baseUrl) {
    throw new Error("ARVAN_AI_BASE_URL تنظیم نشده — این فیچر بدون آدرس گیت‌وی کار نمی‌کند");
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

// پرامپتِ ساختِ رودمپ.
//
// نسخه‌ی قبلی فقط می‌گفت «۴ تا ۶ مرحله، هرکدام ۳ تا ۵ آیتم، واقع‌بین باش»
// و خروجی‌اش فهرستی از سرفصل‌ها بود — چیزی که کاربر بعد از خواندنش هنوز
// نمی‌دانست *دقیقاً فردا صبح چه کار کند*. این نسخه عمداً سخت‌گیر است:
// هر مرحله باید هدفِ قابل‌سنجش، کارهای عملیِ مشخص، تمرین، معیارِ اتمام و
// زمانِ تقریبی داشته باشد.
const SYSTEM_PROMPT = `تو یک مربیِ حرفه‌ایِ آموزش هستی که سال‌ها آدم‌ها را از صفر تا سطحِ کارِ واقعی برده‌ای.
کاربر یک موضوع می‌دهد به‌همراهِ **زمانی که واقعاً می‌تواند بگذارد**، و تو یک مسیرِ یادگیریِ کامل،
**جلسه‌به‌جلسه** و عملی می‌سازی — به زبان فارسیِ روان و خودمانی.

قواعدِ سخت‌گیرانه:

۱. مسیر از **صفرِ مطلق** شروع شود و به **توانِ انجامِ کارِ واقعی** برسد. فرض کن مخاطب هیچ پیش‌زمینه‌ای ندارد.
۲. هر چیزی که می‌نویسی باید بگوید کاربر **دقیقاً چه کاری انجام دهد**، نه اینکه «چه چیزی یاد بگیرد».
   بد: «مبانی رنگ را یاد بگیر». خوب: «۱۰ عکس از آرشیوت بردار و فقط با تنظیمِ White Balance و Exposure اصلاحشان کن».
۳. **مهم‌ترین قاعده — جلسه‌ها:** کاربر می‌گوید هفته‌ای چند روز و هر بار چند دقیقه وقت دارد.
   مسیر را دقیقاً به همان اندازه جلسه ببُر. هر جلسه باید در همان دقیقه‌های اعلام‌شده **واقعاً تمام شود** —
   نه بیشتر، نه یک سرفصلِ چندهفته‌ای که اسمش را گذاشته‌ای «جلسه».
۴. هر جلسه این‌ها را دارد:
   • هدفِ همان یک جلسه (یک جمله، قابلِ سنجش)
   • قدم‌های اجرایی به‌ترتیب، با زمانِ تقریبیِ هر قدم — جوری که کاربر بنشیند و مو‌به‌مو انجامش دهد
   • «چطور یاد بگیر»: روشِ یادگیریِ همان جلسه (تمرینِ فعال، تکرارِ فاصله‌دار، ساختِ نمونه، …)
   • منابعِ **مشخص و واقعی** برای همان جلسه: نامِ دقیقِ کتاب و فصل، نامِ دوره و شماره‌ی درس، نامِ کانال/مستندات.
     هرگز ننویس «یک ویدیوی خوب پیدا کن».
   • معیارِ اتمامِ همان جلسه: از کجا بفهمد این جلسه را واقعاً بلد شده.
۵. جلسه‌ها زیرِ مرحله‌ها گروه‌بندی می‌شوند. هر مرحله هدف، تمرینِ عملی و معیارِ اتمامِ خودش را دارد.
۶. اشتباهاتِ رایج را بگو — چیزهایی که تازه‌کارها وقتشان را رویش تلف می‌کنند.
۷. هیچ‌چیزِ کلی و بی‌مصرف ننویس. اگر جمله‌ای برای هر موضوعی صادق است، بی‌ارزش است و باید حذف شود.

فقط و فقط یک JSONِ خام برگردان، بدونِ هیچ متنِ اضافه قبل یا بعدش، بدونِ Markdown fences.
دقیقاً با این شکل:

{
  "title": "عنوانِ کوتاه و مشخصِ مسیر",
  "note": "یک تا دو جمله: بعد از تمام‌کردنِ این مسیر دقیقاً چه کاری می‌توانی انجام دهی",
  "level": "از صفر",
  "totalWeeks": 12,
  "stations": [
    {
      "t": "عنوانِ مرحله",
      "goal": "بعد از این مرحله دقیقاً چه کاری می‌توانی بکنی (یک جمله، قابلِ سنجش)",
      "weeks": 2,
      "items": ["کارِ عملیِ ۱ (فعل‌محور و مشخص)", "کارِ عملیِ ۲", "کارِ عملیِ ۳"],
      "practice": "تمرینِ عملیِ این مرحله با خروجیِ مشخص",
      "checkpoint": "از کجا بفهمی این مرحله تمام شده",
      "sessions": [
        {
          "title": "عنوانِ جلسه",
          "goal": "هدفِ همین یک جلسه، در یک جمله",
          "steps": ["۰-۱۰ دقیقه: کارِ مشخص", "۱۰-۳۵ دقیقه: کارِ مشخص", "۳۵-۴۵ دقیقه: کارِ مشخص"],
          "howTo": "روشِ یادگیریِ این جلسه — چطور تمرین کن که واقعاً بماند",
          "refs": ["نامِ دقیقِ منبع + فصل/درسِ مشخص", "منبعِ دومِ مشخص"],
          "checkpoint": "از کجا بفهمی این جلسه را بلد شده‌ای"
        }
      ]
    }
  ],
  "tips": ["نکته‌ی کاربردی ۱", "نکته‌ی کاربردی ۲", "نکته‌ی کاربردی ۳"],
  "mistakes": ["اشتباهِ رایجِ ۱ و چرا وقت‌تلف‌کن است", "اشتباهِ رایجِ ۲"],
  "pro": ["برای رسیدن به سطحِ حرفه‌ای ۱", "برای رسیدن به سطحِ حرفه‌ای ۲"],
  "books": ["نامِ دقیقِ کتاب/دوره/منبعِ واقعی ۱", "نامِ دقیقِ منبعِ ۲"]
}

بینِ ۴ تا ۷ مرحله بساز. مراحل باید به هم وصل باشند: هر مرحله روی مهارتِ مرحله‌ی قبل سوار شود.
مجموعِ جلسه‌ها را از ۱۲ بیشتر و از ۴۰ کمتر نگه دار.`;

/** یک نشستِ واقعی به اندازه‌ی همان دقیقه‌هایی که کاربر اعلام کرده. */
export type GeneratedSession = {
  title: string;
  goal?: string;
  steps: string[];
  howTo?: string;
  refs?: string[];
  checkpoint?: string;
};

export type GeneratedStation = {
  t: string;
  items: string[];
  /** فیلدهای تازه — رودمپ‌های قدیمی ندارندشان، پس همه اختیاری‌اند */
  goal?: string;
  weeks?: number;
  practice?: string;
  checkpoint?: string;
  sessions?: GeneratedSession[];
};

/** آنچه کاربر در گامِ دومِ ویزارد انتخاب می‌کند. */
export type RoadmapSchedule = {
  /** روزهای هفته به سبکِ Date.getDay() — ۰ یکشنبه … ۶ شنبه */
  jsDays: number[];
  minutesPerDay: number;
  /** "HH:MM" ۲۴ساعته */
  startTime: string;
};

export type GeneratedRoadmap = {
  title: string;
  note: string;
  level?: string;
  totalWeeks?: number;
  stations: GeneratedStation[];
  tips: string[];
  mistakes: string[];
  pro: string[];
  books: string[];
};

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === "string" && x.trim().length > 0);
}

/**
 * مدل زبانی گاهی خروجی رو دقیقا طبق شکل خواسته‌شده برنمی‌گردونه (فیلد
 * جاافتاده، station بدون items، و ...). این تابع خروجی رو اعتبارسنجی و
 * نرمال می‌کنه تا هیچ‌وقت داده ناقص/بدشکل به دیتابیس یا UI نرسه — چون
 * صفحه جزئیات رودمپ مستقیم روی این فیلدها .map می‌زنه و با undefined کرش می‌کنه.
 */
function normalizeRoadmap(raw: any): GeneratedRoadmap {
  if (!raw || typeof raw !== "object") {
    throw new Error("خروجی مدل ساختار معتبری نداشت");
  }

  const stationsRaw = Array.isArray(raw.stations) ? raw.stations : [];
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  const normSessions = (v: unknown): GeneratedSession[] | undefined => {
    if (!Array.isArray(v)) return undefined;
    const out = v
      .map((x: any) => ({
        title: typeof x?.title === "string" && x.title.trim() ? x.title.trim() : "",
        goal: str(x?.goal),
        steps: asStringArray(x?.steps),
        howTo: str(x?.howTo),
        refs: asStringArray(x?.refs),
        checkpoint: str(x?.checkpoint),
      }))
      // یک جلسه بدونِ عنوان یا بدونِ قدمِ اجرایی چیزی به کاربر نمی‌دهد
      .filter((x: GeneratedSession) => x.title && x.steps.length > 0);
    return out.length ? out : undefined;
  };

  const stations: GeneratedStation[] = stationsRaw
    .map((s: any) => ({
      t: typeof s?.t === "string" && s.t.trim() ? s.t.trim() : "مرحله بدون عنوان",
      items: asStringArray(s?.items),
      goal: str(s?.goal),
      // مدل گاهی هفته را رشته می‌دهد ("۲ هفته") — فقط عددِ معتبر را می‌پذیریم
      weeks: Number.isFinite(Number(s?.weeks)) && Number(s.weeks) > 0
        ? Math.min(Math.round(Number(s.weeks)), 52)
        : undefined,
      practice: str(s?.practice),
      checkpoint: str(s?.checkpoint),
      sessions: normSessions(s?.sessions),
    }))
    // مرحله‌ای که نه کارِ عملی دارد نه جلسه، چیزی برای نشان‌دادن ندارد
    .filter((s: GeneratedStation) => s.items.length > 0 || (s.sessions?.length ?? 0) > 0);

  if (stations.length === 0) {
    throw new Error("مدل هیچ مرحله‌ی قابل‌استفاده‌ای برنگردوند");
  }

  const totalWeeks = Number.isFinite(Number(raw.totalWeeks)) && Number(raw.totalWeeks) > 0
    ? Math.min(Math.round(Number(raw.totalWeeks)), 260)
    : stations.reduce((sum, st) => sum + (st.weeks || 0), 0) || undefined;

  return {
    title: typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : "مسیر یادگیری",
    note: typeof raw.note === "string" ? raw.note.trim() : "",
    level: typeof raw.level === "string" && raw.level.trim() ? raw.level.trim() : undefined,
    totalWeeks,
    stations,
    tips: asStringArray(raw.tips),
    mistakes: asStringArray(raw.mistakes),
    pro: asStringArray(raw.pro),
    books: asStringArray(raw.books),
  };
}

const FA_DAY_NAMES = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];

/** پیامِ کاربر: موضوع + وقتی که واقعاً دارد. مدل بدونِ این نمی‌تواند
 *  جلسه‌ها را به اندازه‌ی درست ببُرد. */
function roadmapUserMessage(topic: string, schedule?: RoadmapSchedule): string {
  if (!schedule || !schedule.jsDays.length) return `موضوع: ${topic}`;
  const days = schedule.jsDays.map((d) => FA_DAY_NAMES[d] ?? "").filter(Boolean).join("، ");
  const perWeek = schedule.jsDays.length * schedule.minutesPerDay;
  return [
    `موضوع: ${topic}`,
    `روزهای تمرین: ${days} (هفته‌ای ${schedule.jsDays.length} جلسه)`,
    `مدتِ هر جلسه: ${schedule.minutesPerDay} دقیقه`,
    `ساعتِ شروع: ${schedule.startTime}`,
    `مجموعِ وقتِ هفتگی: ${perWeek} دقیقه`,
    `هر جلسه باید دقیقاً در ${schedule.minutesPerDay} دقیقه تمام شود؛ قدم‌های هر جلسه را با همین بودجه‌ی زمانی بنویس.`,
  ].join("\n");
}

async function callRoadmapOnce(topic: string, userId: string, schedule?: RoadmapSchedule): Promise<GeneratedRoadmap> {
  const { text, usage, durationMs } = await callAiChat(SYSTEM_PROMPT, roadmapUserMessage(topic, schedule), 6000);
  // گیت‌وی واقعا پاسخ داد و توکن مصرف شد — صرف‌نظر از اینکه اعتبارسنجی
  // ساختار خروجی پایین‌تر موفق بشه یا نه
  recordAiUsage(userId, AiFeatureKey.ROADMAP_GENERATION, usage, durationMs, true);
  return normalizeRoadmap(parseJsonResponse(text));
}

/**
 * تا ۲ بار امتحان می‌کنه — چون خطای parse/شکل گاهی گذراست (یک تولید بد
 * تصادفی)، نه یک خطای ساختاری همیشگی. اگه هر دو بار شکست خورد، همون خطای
 * تلاش آخر رو برمی‌گردونه.
 */
export async function generateRoadmap(topic: string, userId: string, schedule?: RoadmapSchedule): Promise<GeneratedRoadmap> {
  let lastError: any;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await callRoadmapOnce(topic, userId, schedule);
    } catch (err) {
      lastError = err;
    }
  }
  // هر دو تلاش شکست خورد. اگه یه attempt واقعا از گیت‌وی جواب گرفته بود، همون
  // داخل callRoadmapOnce با success:true ثبت شده (چون هزینه‌ش واقعا افتاده)؛
  // این‌جا فقط شکست نهایی رو برای بخش «خطاها» ثبت می‌کنیم.
  logError("ai-gateway", `ساخت رودمپ شکست خورد: ${lastError?.message || lastError}`, { context: { feature: "ROADMAP_GENERATION" } });
  throw lastError;
}

// ============================================================================
// برنامه‌ی هوشمند ورزش — همون الگوی generateRoadmap (system prompt ثابت،
// پروفایل توی پیام کاربر، پارس/اعتبارسنجی سخت‌گیرانه چون UI مستقیم روی
// خروجی .map می‌زنه). اگه آدرس گیت‌وی نبود یا تماس شکست خورد، فراخوان (route)
// باید به قالب ایستای lib/exercisePlans.ts برگرده — این فایل فقط پرتاب خطا می‌کنه.
// ============================================================================

const EXERCISE_SYSTEM_PROMPT = `تو یک مربی حرفه‌ای بدنسازی و برنامه‌ریزی تمرینی هستی. برای هر کاربر یک برنامه شخصی‌سازی‌شده،
اصولی و قابل اجرا طراحی کن.

ابتدا بر اساس اطلاعات کاربر، هدف، سطح، تعداد روزهای تمرین، تقسیم هفتگی، فرکانس تمرین عضلات، حجم تمرین،
شدت، تکرار، استراحت و ریکاوری را تعیین کن.

اهداف شامل عضله‌سازی، کاهش چربی، قدرت، پاورلیفتینگ/لیفتینگ، تناسب اندام، استقامت و اهداف ترکیبی هستند.

قوانین اصلی:
- برای هر هدف از اصول مناسب همان هدف استفاده کن.
- ابتدا ساختار هفتگی و تقسیم عضلات را مشخص کن، سپس هر جلسه را طراحی کن.
- تعداد حرکات را هرگز ثابت یا از پیش تعیین نکن. تعداد حرکات باید نتیجه حجم تمرینی موردنیاز، عضلات هدف،
  سطح کاربر، هدف، زمان جلسه و ریکاوری باشد.
- اگر یک عضله به حرکات بیشتری نیاز دارد، حرکات کافی اضافه کن؛ اگر حرکت اضافه باعث حجم غیرضروری می‌شود، اضافه نکن.
- هیچ جلسه‌ای را صرفا برای کوتاه کردن خروجی به چند حرکت محدود نکن.
- تمام عضلات و الگوهای حرکتی موردنیاز را پوشش بده.
- حرکات اصلی، چندمفصلی، کمکی و تک‌مفصلی را با ترتیب منطقی استفاده کن.
- از حرکات تکراری و حجم غیرضروری جلوگیری کن.
- حجم هفتگی هر عضله و ریکاوری بین جلسات را در نظر بگیر.
- حجم و شدت را متناسب با سطح کاربر تنظیم کن.
- در برنامه‌های قدرتی و لیفتینگ، حرکات اصلی و پیشرفت قدرت اولویت دارند.
- در عضله‌سازی، حجم مؤثر، انتخاب حرکات و تحریک مناسب عضله اولویت دارند.
- در کاهش چربی، تمرین مقاومتی و حفظ عضله را در اولویت قرار بده و حجم تمرین را بی‌دلیل افزایش نده.
- در استقامت، تکرار، استراحت و ساختار تمرین را متناسب با هدف تنظیم کن.
- تجهیزات، محدودیت‌ها، درد یا آسیب و ترجیحات کاربر را رعایت کن.
- قبل از خروجی، برنامه را از نظر حجم، تعادل عضلانی، شدت، ریکاوری و تناسب با هدف بررسی کن.
- برنامه باید امکان پیشرفت تدریجی داشته باشد.
- هیچ توصیه‌ی پزشکی یا تغذیه‌ای نده.

پیش از طراحی، بررسی کن که درخواست کاربر (با توجه به توضیحی که خودش نوشته، محدودیت جسمی‌اش و روزهایی که
در اختیار داره) از نظر بدنی/تمرینی واقع‌بینانه، بی‌خطر و قابل‌اجراست یا نه.

اگر واقع‌بینانه نبود، فقط همین JSON خام را برگردان (بدون Markdown fence، بدون هیچ متن دیگر):
{ "feasible": false, "message": "یک پیام کوتاه و دوستانه به فارسی، مثل یک مربی که مستقیم با کاربر حرف می‌زند، که توضیح دهد چرا این ممکن نیست و چه پیشنهاد جایگزینی داری" }

اگر واقع‌بینانه بود، فقط همین JSON خام را برگردان (بدون Markdown fence، بدون هیچ متن دیگر) — دقیقا یک
آیتم به‌ازای هر روزی که کاربر گفته باشگاه می‌رود (نه کمتر، نه بیشتر)، و مقدار day باید دقیقا یکی از
همان روزهایی باشد که کاربر داده:
{
  "feasible": true,
  "days": [
    {
      "day": "شنبه",
      "focus": "پایین‌تنه — اسکوات",
      "exercises": [
        { "name": "اسکوات هالتر", "muscle": "چهارسر ران", "sets": 4, "reps": "6-8", "rest": "۳ دقیقه", "note": "زانو هم‌راستای پنجه" }
      ]
    }
  ]
}

قواعد فیلدها:
- day: دقیقا یکی از نام‌های فارسی روزهای هفته (شنبه/یکشنبه/دوشنبه/سه‌شنبه/چهارشنبه/پنجشنبه/جمعه).
- name: نام فارسی رایج حرکت در بدنسازی ایران.
- muscle: عضله‌ی هدف اصلی همان حرکت.
- sets: عدد.
- reps: تعداد تکرار (رشته؛ می‌تواند بازه باشد مثل "8-12")، یا برای حرکات زمان‌محور مدت‌زمان مثل "۳۰ ثانیه".
- rest: زمان استراحت بین ست‌ها.
- note: یک نکته‌ی کوتاه و کاربردی درباره‌ی اجرای همان حرکت (یا رشته‌ی خالی).

خروجی فقط JSON معتبر باشد.`;

export type ExercisePlanProfile = {
  level: "beginner" | "intermediate" | "advanced";
  goalLabel: string; // برچسب فارسی هدف، از قبل توسط caller حل‌شده (چون گزینه‌های هدف سمت UI بیشتر از این تایپ محدودن)
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

// مدل حالا هر حرکت را به‌صورت یک شیء (name/muscle/sets/reps/rest/note) برمی‌گرداند
// تا بتواند واقعا مثل یک مربی برنامه بنویسد. ولی کل اپ (جدول برنامه‌ی روز،
// ردیاب ست‌به‌ست، فرم دستی، برنامه‌ی هفتگی) روی `items: string[]` با فرمت
// «نام حرکت ۴×۸» بنا شده؛ پس همین‌جا به همان رشته تخت می‌شود، به‌جای اینکه
// شکل داده‌ی کل اپ عوض شود. خروجی قدیمی (items به‌صورت رشته) هم هنوز
// پذیرفته می‌شود تا پاسخ‌های در-راه مدل ناگهان بی‌اعتبار نشوند.
function flattenExercise(ex: any): string | null {
  if (typeof ex === "string") return ex.trim() || null;
  if (!ex || typeof ex !== "object") return null;
  const name = typeof ex.name === "string" ? ex.name.trim() : "";
  if (!name) return null;
  const reps = ex.reps === undefined || ex.reps === null ? "" : String(ex.reps).trim();
  const sets = Number(ex.sets);
  // «۳۰ ثانیه»/«۲ دقیقه» → حرکت زمان‌محور؛ عدد خالی/بازه → ست×تکرار
  const isTimed = /ثانیه|دقیقه/.test(reps);
  if (isTimed) return Number.isFinite(sets) && sets > 1 ? `${name} ${toFaDigitsAi(String(sets))}×${toFaDigitsAi(reps)}` : `${name} ${toFaDigitsAi(reps)}`;
  if (!Number.isFinite(sets) || sets < 1 || !reps) return name;
  return `${name} ${toFaDigitsAi(String(sets))}×${toFaDigitsAi(reps)}`;
}

const AI_FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
function toFaDigitsAi(s: string): string {
  return s.replace(/[0-9]/g, (c) => AI_FA_DIGITS[+c]);
}

function normalizeExercisePlan(raw: any, allowedDays: string[]): GeneratedExerciseDay[] {
  if (!Array.isArray(raw)) throw new Error("خروجی مدل ساختار معتبری نداشت");
  const days: GeneratedExerciseDay[] = raw
    .map((d: any) => {
      const source = Array.isArray(d?.exercises) ? d.exercises : d?.items;
      const items = Array.isArray(source)
        ? source.map(flattenExercise).filter((x: string | null): x is string => !!x)
        : asStringArray(source);
      return {
        day: typeof d?.day === "string" ? d.day.trim() : "",
        focus: typeof d?.focus === "string" && d.focus.trim() ? d.focus.trim() : "تمرین",
        items,
      };
    })
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
    profile.hasPhysicalLimitation && profile.limitationDetails ? `توضیح محدودیت جسمی: ${profile.limitationDetails}` : null,
    profile.description ? `توضیح کاربر درباره‌ی برنامه‌ی دلخواهش: ${profile.description}` : null,
  ].filter(Boolean).join("\n");

  const { text, usage, durationMs } = await callAiChat(EXERCISE_SYSTEM_PROMPT, profileText, 4000);
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
      // «feasible: false» یک پاسخ معتبر مدله، نه خطای موقت شبکه/پارس —
      // نباید دوباره تلاش کنیم، همون رد رو مستقیم برگردونیم.
      return result;
    } catch (err) {
      lastError = err;
    }
  }
  logError("ai-gateway", `ساخت برنامه‌ی تمرینی شکست خورد: ${lastError?.message || lastError}`, { context: { feature: "EXERCISE_PLAN_GENERATION" } });
  throw lastError;
}

// ============================================================================
// اسکن عکس غذا با هوش مصنوعی — تنها فراخوانی چندوجهی (multimodal) این فایل؛
// بقیه‌ی فراخوان‌ها فقط متنی‌ان. خروجی شامل کالری + درشت‌مغذی‌هاست، چون
// این تنها راه عملی این اپه که بدون کاتالوگ دستی درشت‌مغذی برای هزاران
// غذا، بخش «ریز درشت‌مغذی‌ها» عدد داشته باشه.
// ============================================================================

const FOOD_SCAN_SYSTEM_PROMPT = `تو یک متخصص تغذیه هستی که با نگاه‌کردن به عکس یک وعده غذا، مقدار کالری و
درشت‌مغذی‌هاش رو تخمین می‌زنی. این یک تخمین بصریه، نه اندازه‌گیری آزمایشگاهی — بر اساس نوع و حجم ظاهری
غذا در عکس بهترین حدس واقع‌بینانه رو بزن.

اگه عکس اصلا غذا/نوشیدنی قابل‌تشخیصی نشون نمی‌ده، فقط همین JSON خام رو برگردون:
{ "recognized": false, "message": "یک جمله‌ی کوتاه و دوستانه به فارسی که بگه غذایی توی عکس تشخیص داده نشد" }

اگه غذا قابل‌تشخیص بود، فقط همین JSON خام رو برگردون (بدون Markdown fence، بدون هیچ متن اضافه):
{
  "recognized": true,
  "name": "نام فارسی کوتاه غذا",
  "estimatedGrams": 250,
  "calories": 480,
  "proteinG": 22,
  "carbsG": 55,
  "fatG": 18
}

قوانین: همه‌ی اعداد بالا باید عدد مثبت باشن (نه رشته)؛ calories باید با estimatedGrams/proteinG/carbsG/fatG
هم‌خوانی تقریبی داشته باشه (پروتئین×۴ + کربوهیدرات×۴ + چربی×۹ ≈ calories)؛ هیچ توصیه‌ی پزشکی یا تشخیصی نده،
فقط تخمین عددی.`;

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
        { type: "text", text: "این عکس غذا رو تحلیل کن." },
        { type: "image_url", image_url: { url: `data:${mediaType};base64,${base64Data}` } },
      ],
      500
    );
  } catch (err: any) {
    logError("ai-gateway", `اسکن عکس غذا شکست خورد: ${err?.message || err}`, { context: { feature: "FOOD_SCAN" } });
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
// خلاصه‌ی هوشمند گزارش هفتگی — برخلاف بقیه‌ی فراخوان‌های این فایل که یک
// چیز از صفر می‌سازن (رودمپ/برنامه‌ی تمرین/تخمین غذا)، این‌جا AI فقط روی
// اعداد از‌قبل‌محاسبه‌شده‌ی lib/weeklyReport/* (Deterministic Analytics)
// تفسیر می‌نویسه — هیچ عدد/دستاورد جدیدی حق نداره بسازه (محافظت در برابر
// Hallucination، بخش ۳۱ اسپک گزارش هفتگی). ورودی فقط همون خلاصه‌ست، نه
// دیتابیس خام کاربر.
// ============================================================================

const WEEKLY_AI_PROMPT_V1 = `تو دستیار تحلیل هفتگی Arion هستی. یک خلاصه‌ی آماری از‌قبل‌محاسبه‌شده از عملکرد
هفتگی کاربر می‌گیری و باید یک تفسیر کوتاه فارسی و ۲ تا ۳ پیشنهاد عملی بنویسی.

قوانین حیاتی:
- فقط از اعدادی که توی ورودی داده شده استفاده کن. هیچ عدد، درصد، یا دستاورد جدیدی که توی ورودی نیست نساز.
- اگه داده‌ی کافی برای یک جمع‌بندی خاص نداری، چیزی درباره‌ش نگو — حدس نزن.
- هیچ توصیه‌ی پزشکی، مالی، یا تشخیصی نده — فقط بازخورد رفتاری/عملکردی بر اساس همین اعداد.
- لحن: مستقیم، محترمانه، مثل یک مربی شخصی — نه ژنریک، نه اغراق‌آمیز.
- خلاصه (summary) حداکثر ۵ جمله.
- حداکثر ۳ پیشنهاد (recommendations)، هرکدوم با یک توضیح کوتاه و دلیل مبتنی‌بر همون اعداد.

فقط و فقط این JSON خام رو برگردون (بدون Markdown fence، بدون متن اضافه):
{
  "summary": "خلاصه‌ی ۳ تا ۵ جمله‌ای",
  "recommendations": [
    { "title": "عنوان کوتاه", "description": "توضیح کوتاه با دلیل مبتنی‌بر داده", "priority": "high" | "medium" | "low", "domain": "یکی از keyهای domains ورودی، یا null اگه مربوط به یک دامنه‌ی خاص نیست" }
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
 * caller (lib/weeklyReport/snapshot.ts) باید بدون AI هم گزارش رو کامل
 * نشون بده — این تابع صرفا throw می‌کنه، تصمیم fallback مال اونجاست.
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
  logError("ai-gateway", `خلاصه‌ی هوشمند گزارش هفتگی شکست خورد: ${lastError?.message || lastError}`, { context: { feature: "WEEKLY_COACH_REPORT" } });
  throw lastError;
}

// ============================================================================
// نسخه‌ی V2 — عمدا کنار V1 (WEEKLY_AI_PROMPT_V1/generateWeeklyReportSummary)
// نگه داشته شده، نه جایگزینش (بند ۸۷: پرامپت‌ها versioned‌ان، rollback
// باید ممکن بمونه). تفاوت اصلی: ورودی حالا شامل خروجی قطعی
// lib/weeklyReport/patterns.ts هم می‌شه (Trend/Streak/Outlier/Correlation)
// و خروجی یک آرایه‌ی insights هم داره — هرکدوم evidence-based، دقیقا
// هم‌قاعده‌ی V1.
// ============================================================================

const WEEKLY_AI_PROMPT_V2 = `تو دستیار تحلیل هفتگی Arion هستی. یک خلاصه‌ی آماری از‌قبل‌محاسبه‌شده — شامل
امتیازها و همچنین الگوهای از‌قبل‌کشف‌شده (روند، استریک، ناهنجاری، همبستگی) — می‌گیری و باید تفسیر فارسی بنویسی.

قوانین حیاتی:
- فقط از اعداد/الگوهایی که توی ورودی داده شده استفاده کن. هیچ عدد، الگو، یا دستاورد جدیدی که توی ورودی نیست نساز.
- اگه داده‌ی کافی برای یک جمع‌بندی خاص نداری، چیزی درباره‌ش نگو.
- «correlations» فقط همبستگی‌ان، نه رابطه‌ی علت‌ومعلولی — هیچ‌وقت نگو «X باعث Y شد»، بگو «بین X و Y همبستگی دیده شد».
- هیچ توصیه‌ی پزشکی، مالی، یا تشخیصی نده.
- لحن: مستقیم، محترمانه، مثل یک مربی شخصی.
- خلاصه (summary) حداکثر ۵ جمله؛ باید صریحاً نقطه‌ی قوت و نقطه‌ی ضعفِ اصلیِ همین هفته را نام ببرد (نه فقط توصیفِ کلی).
- هر پیشنهاد (recommendation) باید بگوید کاربر هفته‌ی بعد دقیقاً روی چه‌چیزی تمرکز کند، با دلیلِ مبتنی‌بر همان اعداد.
- حداکثر ۳ پیشنهاد. حداکثر ۳ insight.

فقط و فقط این JSON خام رو برگردون (بدون Markdown fence، بدون متن اضافه):
{
  "summary": "خلاصه‌ی ۳ تا ۵ جمله‌ای",
  "recommendations": [ { "title": "...", "description": "...", "priority": "high"|"medium"|"low", "domain": "یکی از keyهای domains ورودی، یا null" } ],
  "insights": [ { "title": "عنوان کوتاه", "description": "توضیح کوتاه", "evidence": "دلیل مبتنی‌بر اعداد ورودی", "confidence": "low"|"medium"|"high" } ]
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
  logError("ai-gateway", `خلاصه‌ی هوشمند V2 گزارش هفتگی شکست خورد: ${lastError?.message || lastError}`, { context: { feature: "WEEKLY_COACH_REPORT" } });
  throw lastError;
}

