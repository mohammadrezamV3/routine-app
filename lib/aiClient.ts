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
import {
  PLAN_LIMITS, PlanIssue, RoadmapPlan, normalizePlan, validatePlan,
} from "@/lib/roadmapPlan";

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

// بودجه‌ی کلِ همه‌ی تلاش‌ها (نه هر تلاش تنها) — دقیقاً همان باگی که باعث
// می‌شد «رودمپ توی ساخت گیر کند»: هر تلاش تا AI_TIMEOUT_MS (۴۵s) صبر
// می‌کرد و تا ۲ تلاش هم می‌شد، یعنی در بدترین حالت ۹۰ ثانیه — درحالی‌که
// nginx.conf.example برای همین مسیرها فقط ۶۰ ثانیه صبر می‌کند. nginx بعد
// از ۶۰s کانکشن را با یک ۵۰۴ِ HTML می‌بست و کلاینت روی `res.json()` یا
// خطا می‌خورد یا (بسته به مرورگر) تا مدت‌ها بی‌جواب می‌ماند — دقیقاً حسِ
// «گیر کردن». حالا تلاشِ دوم فقط وقتی انجام می‌شود که واقعاً وقتِ کافی
// (حداقل ۸ ثانیه) قبل از این سقف باقی مانده باشد.
const AI_TOTAL_BUDGET_MS = 55_000;
// کف معنادار برای یک تلاش — کمتر از این عملاً وقتی برای گیت‌وی نمی‌ماند
// که ارزشِ یک HTTP round-trip اضافه را داشته باشد.
const AI_MIN_ATTEMPT_MS = 8_000;

/**
 * تا ۲ تلاش، ولی زیرِ یک بودجه‌ی زمانیِ کل (نه هر تلاش جدا) — جایگزینِ
 * الگوی قبلیِ «۲ بار، هر بار ۴۵ثانیه» که می‌توانست تا ۹۰ ثانیه طول بکشد و
 * از nginx.conf.example (۶۰s برای همین مسیرها) رد بزند. تلاشِ دوم فقط
 * وقتی انجام می‌شود که واقعاً وقتِ کافی مانده باشد.
 */
async function withAiBudget<T>(attempt: (timeoutMs: number) => Promise<T>): Promise<T> {
  const startedAt = Date.now();
  let lastError: any;
  for (let i = 0; i < 2; i++) {
    const remaining = AI_TOTAL_BUDGET_MS - (Date.now() - startedAt);
    if (i > 0 && remaining < AI_MIN_ATTEMPT_MS) break;
    try {
      return await attempt(Math.max(AI_MIN_ATTEMPT_MS, Math.min(AI_TIMEOUT_MS, remaining)));
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

// baseUrl و apiKey هر دو از env میان — هیچ‌وقت نباید هاردکد یا کامیت بشن؛
// فقط توی .env سمت سرور (که .gitignore/.dockerignore شده) قرار می‌گیرن.
// نکته‌ی مهم: خود baseUrl فقط آدرس روتینگ گیت‌وی به این مدل خاصه، شامل
// توکن احرازهویت نیست — احرازهویت واقعی با یه Access Key جداست که از
// پنل آروان‌کلود، بخش «ماشین یوزر» (Machine User) ساخته و گرفته می‌شه.
async function callAiChat(
  system: string,
  userContent: string | ChatContentPart[],
  maxTokens: number,
  model: string = AI_MODEL_NAME,
  timeoutMs: number = AI_TIMEOUT_MS
): Promise<ChatResult> {
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
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e: any) {
    if (e?.name === "TimeoutError" || e?.name === "AbortError") {
      throw new Error(`گیت‌وی هوش مصنوعی در ${Math.round(timeoutMs / 1000)} ثانیه پاسخ نداد`);
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

// ============================================================================
// رودمپ (مسیرِ یادگیری)
//
// از کاربر فقط دو چیز پرسیده می‌شود: «چی می‌خوای یاد بگیری؟» و «هدفت چیه؟».
// عمداً همین دوتا: نسخه‌های قبلی هفت گام سوال می‌پرسیدند (سطح، وقت، بودجه،
// سبکِ یادگیری، و بعد چند سوالِ تولیدشده‌ی دیگر) و بیشترِ آن جواب‌ها یا
// حدسی بودند یا مسیر را واقعاً عوض نمی‌کردند — فقط یک فرمِ طولانی بینِ
// کاربر و جوابش بودند.
//
// در عوض خروجی سنگین‌تر شد: مدل باید هم **متنِ کاملِ مسیر** را بنویسد (چه
// چیزهایی باید خوانده شود، با چه ترتیبی، چرا، با چه ابزارهایی، کجا وقت
// تلف نشود) و هم همان را به ۱ تا ۲۰ مرحله‌ی عملی ببُرد. کاربر نمی‌داند
// برای رسیدن به خواسته‌اش چه باید بخواند — تشخیصِ آن دقیقاً کارِ مدل است،
// نه سوالِ دیگری از خودِ کاربر.
// ============================================================================

/** همان دو چیزی که از کاربر پرسیده می‌شود — ورودیِ کاملِ ساختِ مسیر. */
export type RoadmapProfile = {
  topic: string;
  goal?: string;
};

/** حداکثر تلاشِ تعمیر بعد از تولیدِ اول — سقفِ هزینه و زمان. */
const MAX_REPAIR_ATTEMPTS = 2;

export type PlanGenerationMeta = {
  attempts: number;
  repaired: boolean;
  issuesFixed: string[];
  durationMs: number;
};

export type PlanGenerationResult = {
  plan: RoadmapPlan;
  meta: PlanGenerationMeta;
};

const PLAN_SYSTEM_PROMPT = `تو یک مربیِ حرفه‌ای هستی که سال‌ها آدم‌ها را از «هیچی بلد نیستم» تا «دارم با همین کار می‌کنم»
برده‌ای. کاربر فقط دو چیز به تو می‌گوید: چه چیزی می‌خواهد یاد بگیرد، و هدفش از آن چیست.

او **نمی‌داند برای رسیدن به آن هدف اصلاً باید چه چیزهایی بخواند.** کسی که می‌گوید «می‌خواهم امنیت شبکه کار کنم»
نمی‌داند اول باید شبکه و لینوکس بخواند، بعد مبانیِ امنیت، بعد تستِ نفوذ، و مدرکی مثل OSCP کجای مسیر می‌نشیند.
تشخیصِ کاملِ آن مسیر کارِ توست، نه سوالِ بیشتر از او.

هدفِ کاربر مسیر را از ریشه عوض می‌کند: مسیرِ «می‌خواهم استخدام شوم» با مسیرِ «برای سرگرمی» یکی نیست.
اول هدف را تحلیل کن، بعد مسیر را بچین.

باید **هر دو** خروجی را بدهی:

── ۱) guide — متنِ کاملِ مسیر
یک متنِ پیوسته و کامل به فارسی، که خودش به‌تنهایی جوابِ کاربر باشد؛ یعنی اگر کسی فقط همین متن را بخواند
دقیقاً بداند باید چه کند. حداقل ۸۰۰ نویسه، معمولاً خیلی بیشتر. با تیترِ بخش‌ها بنویس (هر تیتر در خطِ خودش،
با ## شروع شود) و زیرِ هر تیتر بندهای واقعی. این بخش‌ها را حتماً پوشش بده:
  • مسیر در یک نگاه: از کجا شروع می‌شود، به کجا می‌رسد، چقدر طول می‌کشد.
  • چه چیزهایی باید یاد بگیری و **با چه ترتیبی** — و مهم‌تر: **چرا این ترتیب**.
  • ابزارها: دقیقاً با چه نرم‌افزار/سرویس/سخت‌افزاری باید کار کنی و هرکدام کجای مسیر لازم می‌شوند.
  • منابع: چه نوع منبعی برای هر بخش (مستندِ رسمی، دوره، کتاب، تمرینِ عملی) و اگر منبعِ نام‌آشنایی هست اسمش را بیاور.
  • مدرک/گواهی اگر در این حوزه معنا دارد: کدام، کِی، و اصلاً لازم است یا نه.
  • چطور ثابت کنی بلدی: چه چیزی بساز/چه کاری انجام بده.
  • اشتباه‌های رایج: کجاها تازه‌کارها وقتشان را تلف می‌کنند.
  • از کجا بفهمی آماده‌ای.
متن باید *مشخص* باشد نه کلی. «تمرین کن» بی‌فایده است؛ «۲۰ ماشینِ TryHackMe مسیرِ Pre-Security را تمام کن» مفید است.

── ۲) stages — همان مسیر، بریده‌شده به مرحله
بینِ ۱ تا ۲۰ مرحله. تعدادِ مرحله‌ها را خودت از روی بزرگیِ موضوع انتخاب کن — یک مهارتِ کوچک شاید ۴ مرحله باشد
و یک تغییرِ شغلیِ کامل ۱۵ تا ۲۰. مرحله‌سازیِ الکی برای پرکردنِ عدد ممنوع.
هر مرحله باید:
  • پشتِ‌سرِ مرحله‌ی قبلی معنا بدهد — چیزی که پیش‌نیازش هنوز نیامده، نباید در این مرحله باشد.
  • ابزارهای همان مرحله را داشته باشد.
  • «چه‌کار کنم»ش عملی و قابلِ انجام باشد، نه توصیه‌ی کلی.
  • معیارِ تمام‌شدن (done) داشته باشد: یک چیزِ قابلِ سنجش، نه «وقتی خوب فهمیدی».

قواعدِ سخت:
۱. همه‌چیز فارسیِ روان و ساده. نامِ فنیِ لاتین (Linux، Wireshark، OSCP) لاتین بماند.
۲. **لینکِ ساختگی ممنوع.** اگر از آدرسِ دقیقِ یک صفحه مطمئن نیستی، فقط نامِ منبع را بنویس و url را نگذار.
   لینکِ ۴۰۴ از نبودنِ لینک بدتر است.
۳. چیزی را که کاربر نخواسته به مسیر اضافه نکن؛ ولی پیش‌نیازِ واقعی را حتماً بیاور، حتی اگر کاربر اسمش را نبرده.
۴. زمان‌ها واقع‌بینانه باشند، نه تبلیغاتی. «در ۷ روز متخصص شو» ننویس.
۵. حداکثر ${PLAN_LIMITS.maxStages} مرحله.

خروجی **فقط** JSONِ خام، بدونِ هیچ متنِ اضافه، دقیقاً با این ساختار:

{
  "title": "عنوانِ کوتاهِ مسیر",
  "summary": "یک پاراگراف: این مسیر چیست و آخرش کجاست",
  "totalDuration": "۶ ماه",
  "tools": ["ابزارهای کلِ مسیر"],
  "guide": "## مسیر در یک نگاه\\n…\\n\\n## چی باید بخونی\\n…",
  "stages": [
    {
      "title": "نامِ مرحله",
      "goal": "بعدِ این مرحله چه کاری می‌توانی بکنی",
      "duration": "۲ هفته",
      "learn": ["چیزهایی که باید بخوانی/بفهمی"],
      "do": ["کارِ عملیِ مشخص با خروجیِ قابلِ دیدن"],
      "tools": ["ابزارهای همین مرحله"],
      "resources": [{ "title": "نامِ دقیقِ منبع", "type": "documentation", "source": "MDN", "url": "https://…" }],
      "done": "معیارِ قابلِ سنجشِ تمام‌شدنِ مرحله"
    }
  ]
}

"type" منبع یکی از این‌هاست: article | documentation | video | course | lab | book | tool`;

function planUserMessage(profile: RoadmapProfile): string {
  const lines = [`موضوع: ${profile.topic}`];
  lines.push(
    profile.goal
      ? `هدفِ کاربر از یادگیریِ این: ${profile.goal}`
      : "کاربر هدفِ مشخصی نگفته — مسیرِ عمومی ولی کاربردی بساز که هم به کارِ واقعی برسد هم برای علاقه‌ی شخصی بی‌ربط نباشد."
  );
  lines.push(
    "",
    "برای همین کاربر، هم متنِ کاملِ مسیر (guide) و هم مرحله‌ها (stages) را بساز.",
    "فقط JSONِ خام برگردان."
  );
  return lines.join("\n");
}

/** پیامِ تعمیر: خروجیِ قبلی + دقیقاً چه چیزی خراب بود. */
function repairMessage(previous: string, issues: PlanIssue[]): string {
  return [
    "این JSONی که دادی ایراد دارد و قابلِ استفاده نیست:",
    "",
    previous.slice(0, 12_000),
    "",
    "ایرادها:",
    ...issues.map((i, n) => `${n + 1}. ${i.message}`),
    "",
    "همین مسیر را با رفعِ این ایرادها دوباره بده — محتوای درست را نگه دار،",
    "فقط چیزی را که ایراد دارد اصلاح کن. باز هم فقط JSONِ خام، بدونِ متنِ اضافه.",
  ].join("\n");
}

type PlanAttempt = { plan: RoadmapPlan; issues: PlanIssue[]; raw: string };

async function callPlanOnce(system: string, user: string, userId: string, timeoutMs: number): Promise<PlanAttempt> {
  // سقفِ توکنِ خروجی بالاست چون guide عمداً یک متنِ بلند است، نه چند جمله.
  const { text, usage, durationMs } = await callAiChat(system, user, 14000, AI_MODEL_NAME, timeoutMs);
  recordAiUsage(userId, AiFeatureKey.ROADMAP_GENERATION, usage, durationMs, true);
  const plan = normalizePlan(parseJsonResponse(text));
  return { plan, issues: validatePlan(plan), raw: text };
}

/**
 * ساختِ مسیر با حلقه‌ی تعمیر.
 *
 * تفاوتش با withAiBudget: آن‌جا تلاشِ دوم فقط وقتی معنا داشت که تلاشِ اول
 * *پرتاب* کرده باشد. این‌جا خروجی می‌تواند JSONِ کاملاً معتبر باشد ولی
 * محتوایش ناقص (متنِ راهنمای دوخطی، مرحله‌ی بدونِ کار) — که خطا پرتاب
 * نمی‌کند. پس خودمان حلقه را می‌زنیم و ایرادها را به مدل پس می‌دهیم.
 */
export async function generateRoadmapPlan(profile: RoadmapProfile, userId: string): Promise<PlanGenerationResult> {
  const startedAt = Date.now();
  const user = planUserMessage(profile);

  let attempts = 0;
  let last: PlanAttempt | null = null;
  const fixed: string[] = [];

  for (let i = 0; i <= MAX_REPAIR_ATTEMPTS; i++) {
    const remaining = AI_TOTAL_BUDGET_MS - (Date.now() - startedAt);
    if (i > 0 && remaining < AI_MIN_ATTEMPT_MS) break;
    const timeoutMs = Math.max(AI_MIN_ATTEMPT_MS, Math.min(AI_TIMEOUT_MS, remaining));

    attempts++;
    try {
      // تلاشِ دوم دو حالت دارد: یا خروجیِ قبلی بود ولی خراب (تعمیرش
      // می‌کنیم)، یا اصلاً خروجی‌ای نبود چون تلاشِ قبلی پرتاب کرد — آن‌وقت
      // همان پرامپتِ اول دوباره فرستاده می‌شود، نه یک پیامِ تعمیرِ تهی.
      const result: PlanAttempt = last
        ? await callPlanOnce(PLAN_SYSTEM_PROMPT, repairMessage(last.raw, last.issues), userId, timeoutMs)
        : await callPlanOnce(PLAN_SYSTEM_PROMPT, user, userId, timeoutMs);

      if (!result.issues.length) {
        return {
          plan: result.plan,
          meta: { attempts, repaired: i > 0, issuesFixed: fixed, durationMs: Date.now() - startedAt },
        };
      }

      if (i === 0 || result.issues.length < (last?.issues.length ?? Infinity)) {
        fixed.push(...result.issues.map((x: PlanIssue) => x.code));
        last = result;
      }
      logError("roadmap-plan", `roadmap_validation_failed (تلاشِ ${attempts})`, {
        severity: "WARNING" as any,
        context: { feature: "ROADMAP_PLAN", issues: result.issues.map((x: PlanIssue) => x.code) },
      });
    } catch (err: any) {
      logError("roadmap-plan", `تلاشِ ${attempts} شکست خورد: ${err?.message || err}`, {
        severity: "WARNING" as any,
        context: { feature: "ROADMAP_PLAN" },
      });
      if (i === MAX_REPAIR_ATTEMPTS) throw err;
    }
  }

  if (!last) throw new Error("ساختِ مسیر انجام نشد — گیت‌وی هوش مصنوعی پاسخِ قابلِ استفاده نداد");

  // بعد از همه‌ی تلاش‌ها هنوز ایراد دارد. یک مسیرِ ناقص بدتر از نساختن است:
  // کاربر بر اساسش وقت می‌گذارد.
  throw new Error(
    `مسیر ساخته شد ولی کامل نبود: ${last.issues.slice(0, 3).map((i) => i.message).join(" | ")}`
  );
}

// ============================================================================
// برنامه‌ی هوشمند ورزش — همون الگوی generateRoadmapPlan (system prompt ثابت،
// پروفایل توی پیام کاربر، پارس/اعتبارسنجی سخت‌گیرانه چون UI مستقیم روی
// خروجی .map می‌زنه). اگه آدرس گیت‌وی نبود یا تماس شکست خورد، فراخوان (route)
// باید به قالب ایستای lib/exercisePlans.ts برگرده — این فایل فقط پرتاب خطا می‌کنه.
// ============================================================================

const EXERCISE_SYSTEM_PROMPT = `تو یک مربی حرفه‌ای بدنسازی و برنامه‌ریزی تمرینی هستی. برای هر کاربر یک برنامه شخصی‌سازی‌شده،
اصولی و قابل اجرا طراحی کن.

هدفِ کاربر با متنِ آزادِ خودش داده می‌شود (نه از یک لیستِ بسته) — ممکن است ترکیبی/غیرمتعارف هم باشد؛
همیشه دقیقا همان چیزی که کاربر خواسته را مبنا بگیر، نه نزدیک‌ترین دسته‌بندیِ رایج.

قدمِ اول، قبل از نوشتنِ هر حرکتی: با توجه به هدف/سطح/تعداد روزهای در دسترسِ کاربر، بررسی کن کدام روشِ
تقسیم‌بندی (مثلا بدن‌کامل، بالاتنه/پایین‌تنه، Push/Pull/Legs، تقسیمِ تک‌عضله‌ای روزانه، یا هر روشِ اصولیِ
دیگری) واقعا برای *همین* کاربر با *همین* امکانات مناسب‌تر است — این تصمیم باید نتیجه‌ی بررسی باشد، نه
همیشه یک الگوی ثابت. بعد از انتخابِ روش، بر اساس اطلاعات کاربر، هدف، سطح، تعداد روزهای تمرین، تقسیم
هفتگی، فرکانس تمرین عضلات، حجم تمرین، شدت، تکرار، استراحت و ریکاوری را تعیین کن.

اهداف شامل عضله‌سازی، کاهش چربی، قدرت، پاورلیفتینگ/لیفتینگ، تناسب اندام، استقامت و اهداف ترکیبی هستند.

قوانین اصلی:
- برای هر هدف از اصول مناسب همان هدف استفاده کن.
- ابتدا ساختار هفتگی و تقسیم عضلات را مشخص کن، سپس هر جلسه را طراحی کن.
- عضلاتِ بدن را واقعا از هم تفکیک کن (مثلا سینه، پشت، شانه، جلوبازو، پشت‌بازو، چهارسر، پشتِ ران، سرینی،
  ساق، شکم — نه یک دسته‌ی کلیِ «بالاتنه»). هر گروهِ عضلانیِ مستقل روی روزِ خودش برنامه‌ریزی شود؛ دو گروهِ
  جداگانه (مثلا جلوبازو و پشت‌بازو) را در یک روز با هم نیاور، مگر این‌که خودِ کاربر صریحا در هدفش خواسته
  باشد آن‌ها با هم ترکیب شوند.
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
  goalLabel: string; // متنِ آزادِ هدف، دقیقا همان چیزی که کاربر خودش نوشته (نه یک گزینه‌ی از پیش‌تعیین‌شده)
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

/** فقط رشته‌های ناتهیِ یک آرایه — خروجیِ مدل پر از null/عدد/شیء هم می‌تواند باشد. */
function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean);
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

async function callExercisePlanOnce(profile: ExercisePlanProfile, userId: string, timeoutMs: number): Promise<ExercisePlanResult> {
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

  const { text, usage, durationMs } = await callAiChat(EXERCISE_SYSTEM_PROMPT, profileText, 4000, AI_MODEL_NAME, timeoutMs);
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
  try {
    // «feasible: false» یک پاسخ معتبر مدله (return می‌شه، throw نه) — پس
    // withAiBudget خودش بدون retry اضافه همون رو برمی‌گردونه.
    return await withAiBudget((timeoutMs) => callExercisePlanOnce(profile, userId, timeoutMs));
  } catch (err: any) {
    logError("ai-gateway", `ساخت برنامه‌ی تمرینی شکست خورد: ${err?.message || err}`, { context: { feature: "EXERCISE_PLAN_GENERATION" } });
    throw err;
  }
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

async function callWeeklyAiOnce(input: WeeklyReportAiInput, userId: string, timeoutMs: number): Promise<WeeklyReportAiResult> {
  const userContent = JSON.stringify(input);
  const { text, usage, durationMs } = await callAiChat(WEEKLY_AI_PROMPT_V1, userContent, 1200, WEEKLY_REPORT_AI_MODEL, timeoutMs);
  recordAiUsage(userId, AiFeatureKey.WEEKLY_COACH_REPORT, usage, durationMs, true, WEEKLY_REPORT_AI_MODEL);
  return normalizeWeeklyAiResult(parseJsonResponse(text));
}

/**
 * تا ۲ بار امتحان می‌کنه (هم‌الگوی generateRoadmap)، زیرِ همون بودجه‌ی
 * زمانیِ کل. اگه هردو شکست خورد، caller (lib/weeklyReport/snapshot.ts)
 * باید بدون AI هم گزارش رو کامل نشون بده — این تابع صرفا throw می‌کنه،
 * تصمیم fallback مال اونجاست.
 */
export async function generateWeeklyReportSummary(input: WeeklyReportAiInput, userId: string): Promise<WeeklyReportAiResult> {
  try {
    return await withAiBudget((timeoutMs) => callWeeklyAiOnce(input, userId, timeoutMs));
  } catch (err: any) {
    logError("ai-gateway", `خلاصه‌ی هوشمند گزارش هفتگی شکست خورد: ${err?.message || err}`, { context: { feature: "WEEKLY_COACH_REPORT" } });
    throw err;
  }
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

async function callWeeklyAiV2Once(input: WeeklyReportAiInputV2, userId: string, timeoutMs: number): Promise<WeeklyReportAiResultV2> {
  const { text, usage, durationMs } = await callAiChat(WEEKLY_AI_PROMPT_V2, JSON.stringify(input), 1600, WEEKLY_REPORT_AI_MODEL, timeoutMs);
  recordAiUsage(userId, AiFeatureKey.WEEKLY_COACH_REPORT, usage, durationMs, true, WEEKLY_REPORT_AI_MODEL);
  return normalizeWeeklyAiResultV2(parseJsonResponse(text));
}

export async function generateWeeklyReportSummaryV2(input: WeeklyReportAiInputV2, userId: string): Promise<WeeklyReportAiResultV2> {
  try {
    return await withAiBudget((timeoutMs) => callWeeklyAiV2Once(input, userId, timeoutMs));
  } catch (err: any) {
    logError("ai-gateway", `خلاصه‌ی هوشمند V2 گزارش هفتگی شکست خورد: ${err?.message || err}`, { context: { feature: "WEEKLY_COACH_REPORT" } });
    throw err;
  }
}


// ============================================================================
// مدیرِ برنامه (دستیارِ روتین) — دایره‌ی گوشه‌ی صفحه‌ی «روتین من»
//
// برخلاف بقیه‌ی فراخوان‌های این فایل که یک خروجیِ محتوایی می‌سازند، این یکی
// یک *نقشه‌ی تغییر* برمی‌گرداند: چه چیزی اضافه/جابه‌جا/حذف شود. خودِ تغییر
// را مدل انجام نمی‌دهد — `lib/routineAssistant.ts` نقشه را اعتبارسنجی و
// اعمال می‌کند. پس هر ادعایی که مدل بکند (ساعتِ آزاد است، برنامه وجود دارد)
// دوباره سمتِ سرور سنجیده می‌شود.
// ============================================================================

const ROUTINE_ASSISTANT_PROMPT = `تو «مدیرِ برنامه»ی اپلیکیشن آریون هستی: یک برنامه‌ریزِ شخصیِ واقعی، نه یک
فرمِ دستوری. کارِ اصلی‌ات مدیریتِ برنامه‌ی هفتگیِ کاربر است — افزودن، تغییرِ
ساعت، جابه‌جایی بینِ روزها، حذف — ولی درباره‌ی *خودِ برنامه‌ریزی* هم آزادانه
مشورت می‌دهی: چطور یک هدف را به برنامه تبدیل کند، چقدر برای هر کار وقت
بگذارد، ترتیبِ منطقیِ کارهای یک روز چه باشد، چطور یک عادت را نگه دارد.

کاربر با زبانِ طبیعی حرف می‌زند و هیچ گزینه‌ای انتخاب نمی‌کند. تو باید از
جمله‌اش بفهمی چه می‌خواهد و آن را به عملیات ترجمه کنی. مثل یک مدیربرنامه‌ی
واقعی فکر کن: اگر کاربر گفت «صبح‌ها وقتِ ورزش ندارم، بندازش عصر»، خودت
ساعتِ مناسب را انتخاب کن و جابه‌جا کن.

## «دوره» و هر کارِ چندجلسه‌ای
وقتی کاربر از یک *دوره* حرف می‌زند («دوره‌ی زبان دارم»، «یه دوره‌ی سه‌ماهه‌ی
ریاضی می‌خوام»، «کلاسِ فلان هفته‌ای دو جلسه‌ست»)، این یک درخواستِ کاملا
معتبرِ برنامه‌ریزی‌ست، نه چیزی خارج از موضوع. خودت تبدیلش کن به یک برنامه‌ی
تکرارشونده روی روزهای مناسب و ساعتِ معقول، و اگر طولِ دوره را گفت همان را
در reply توضیح بده. برای «هفته‌ای چند جلسه» خودت روزها را پخش کن، سوال
نپرس.

## روزهای هفته (عدد را عیناً استفاده کن)
شنبه=6، یکشنبه=0، دوشنبه=1، سه‌شنبه=2، چهارشنبه=3، پنجشنبه=4، جمعه=5

## خروجی — فقط JSON، بدونِ هیچ متنِ اضافه

{
  "offTopic": false,
  "reply": "یک جمله‌ی کوتاهِ فارسی",
  "ops": []
}

### وقتی پیام ربطی به برنامه‌ریزی ندارد
offTopic را **سخت‌گیرانه و به‌ندرت** استفاده کن — فقط برای چیزی که هیچ
ربطی به وقت، برنامه، عادت، درس، تمرین یا هدفِ کاربر ندارد: کدنویسی،
ترجمه‌ی متن، اخبار، تشخیص/تجویزِ پزشکی، سیاست.
{ "offTopic": true }

این‌ها offTopic **نیستند** و باید جوابِ واقعی بگیرند (با ops یا فقط reply):
- سلام‌وعلیک و احوال‌پرسی
- «چطور برای کنکور برنامه بریزم؟»، «روزی چند ساعت مطالعه کافیه؟»
- «دوره‌ی زبانم رو چطور بچینم؟»، «برای این هدف از کجا شروع کنم؟»
- «چرا نمی‌تونم به برنامه‌ام برسم؟»، «چطور عادتم رو نگه دارم؟»
- نظرخواهی درباره‌ی چیدمانِ فعلیِ برنامه‌اش
در این حالت‌ها با ops خالی یک جوابِ مفید بده و اگر جا داشت پیشنهادِ عملی
هم بکن («می‌خوای همین رو بچینم برات؟»).

### وقتی فقط سوال پرسیده (بدونِ درخواستِ تغییر)
مثلِ «شنبه چی دارم؟» یا «این هفته چقدر پرم؟» — با ops خالی جواب بده:
{ "offTopic": false, "reply": "شنبه دو برنامه داری: …", "ops": [] }

### وقتی واقعا نمی‌توانی تصمیم بگیری — سوال بپرس و گزینه بده
فقط برای ابهامِ واقعی، نه برای چیزی که خودت می‌توانی انتخاب کنی (ساعت را
همیشه خودت انتخاب کن). نمونه: کاربر دو برنامه با اسمِ مشابه دارد، یا معلوم
نیست منظورش «همین هفته» است یا «هر هفته».

{ "offTopic": false, "ops": [],
  "ask": { "question": "کدام «مطالعه» را می‌گویی؟",
           "options": ["مطالعه‌ی شنبه ۰۸:۰۰", "مطالعه‌ی دوشنبه ۲۰:۰۰"] } }

- options حداکثر چهار تا، هرکدام کوتاه و به‌شکلِ چیزی که کاربر می‌تواند
  همان را بفرستد (نه «گزینه ۱»).
- وقتی ask می‌دهی، ops باید خالی باشد.

### عملیاتِ مجاز

۱) افزودن:
{ "op": "add", "name": "نامِ برنامه", "days": [6,1], "start": "08:00", "end": "09:30",
  "importance": "medium", "tag": "درس" }
- days همیشه آرایه است، حتی برای یک روز.
- **start و end هر دو اختیاری‌اند.** خیلی از برنامه‌ها اصلا ساعت ندارند
  («امروز ورزش دارم»، «فردا خرید دارم»). اگر کاربر ساعت نگفت، start و end
  را **اصلا ننویس** — برنامه بی‌ساعت ثبت می‌شود و ته برنامه‌های همان روز
  می‌نشیند. هیچ‌وقت به‌خاطرِ نگفتنِ ساعت سوال نپرس، حدس هم نزن.
- importance یکی از low/medium/high/veryHigh (پیش‌فرض medium). tag اختیاری.

**تکرارِ درون‌روزی** — وقتی کاربر یک الگوی «هر X دقیقه/ساعت یک‌بار» در
همان روز می‌خواهد (نه یک برنامه‌ی تکی)، مثلا «هر یک ساعت یک‌بار به مدتِ ۵
دقیقه برام برنامه‌ی ترید بچین»، دو فیلدِ اختیاریِ زیر را به همان add اضافه
کن — **خودت این را می‌فهمی و مستقیم اجرا می‌کنی، دوباره از کاربر سوال
نمی‌پرسی که «هر چند دقیقه؟» یا «تا کِی؟» اگر خودش گفته بود:**
{ "op": "add", "name": "ترید", "days": [6], "start": "08:00", "end": "08:05",
  "repeatEveryMin": 60, "repeatUntil": "22:00" }
- repeatEveryMin = فاصله‌ی بینِ شروعِ هر تکرار، به دقیقه («هر یک ساعت» یعنی
  ۶۰، «هر ۹۰ دقیقه» یعنی ۹۰).
- start/end طولِ *هر* تکرار را می‌سازد («به مدتِ ۵ دقیقه» یعنی end پنج
  دقیقه بعدِ start). اگر کاربر طول را نگفت، start را بگذار و end را ننویس؛
  خودِ سیستم ۵ دقیقه در نظر می‌گیرد.
- repeatUntil اختیاری است (آخرین ساعتِ مجاز برای *شروعِ* یک تکرار). اگر
  کاربر نگفت تا کِی، اصلا ننویس — سیستم خودش تا آخرِ ساعتِ بیداریِ کاربر
  ادامه می‌دهد.
- اگر کاربر ساعتِ شروع هم نگفت («هر ساعت یه‌بار ترید بچین»)، start را هم
  ننویس — سیستم از اولِ بیداری شروع می‌کند. باز هم سوال نپرس.
- این با addِ چندروزه فرق دارد: repeatEveryMin تکرار *در همان روز* است،
  نه تکرار در چند روزِ هفته (آن با آرایه‌ی days انجام می‌شود، نه اینجا).

۲) تغییرِ ساعت (همان روز می‌ماند):
{ "op": "retime", "ref": 3, "start": "10:00", "end": "11:00" }
- برای *برداشتنِ* ساعت («ساعتش رو بردار»، «بی‌ساعت باشه») همان retime را
  بدونِ start و end بده: { "op": "retime", "ref": 3 }

۳) جابه‌جایی به روزِ دیگر:
{ "op": "move", "ref": 3, "toDay": 4 }
- اگر ساعت هم باید عوض شود، start و end را هم بده؛ وگرنه ساعتِ فعلی می‌ماند.

۴) حذف:
{ "op": "delete", "ref": 3 }

### ref چیست
فهرستِ برنامه‌های کاربر با شماره‌ی «#n» به تو داده می‌شود. برای هر عملیاتی
که روی یک برنامه‌ی موجود است، همان عددِ n را در ref بگذار. هیچ‌وقت عددی
بساز که در فهرست نیست.

### قواعدِ سخت
- ساعت‌ها را در قالبِ 24ساعته و با رقمِ لاتین بده: "08:00"، "19:30".
- اگر کاربر یک برنامه را روی چند روز می‌خواهد، یک opِ add با چند day بده،
  نه چند op.
- اگر کاربر یک برنامه‌ی موجود را روی چند روز جابه‌جا می‌کند، برای هر روز یک
  opِ جدا بده.
- ساعتِ پایان باید بعد از ساعتِ شروع باشد.
- «امروز» و «فردا» را با تاریخِ امروز که بالای پیام آمده حساب کن و به عددِ
  روز تبدیل کن.
- اگر کاربر ساعت نگفت، فیلدِ start را ننویس — نه سوال بپرس، نه حدس بزن.
  برنامه‌ی بی‌ساعت کاملا معتبر است.
- اگر منظورِ کاربر واقعا مبهم است، از ask استفاده کن (نه reply خالی).
- در reply هیچ‌وقت ادعا نکن که کاری «انجام شد» — فقط بگو چه قصدی داری.
  گزارشِ نهایی را خودِ برنامه به کاربر می‌دهد.
- reply همیشه فارسی و بدونِ اعراب. وقتی فقط داری یک تغییر را تأیید می‌کنی
  یک جمله بس است؛ ولی وقتی کاربر مشورت یا توضیح خواسته، تا حدودِ چهار
  جمله (یا یک لیستِ کوتاه) آزادی — سوالِ واقعیِ کاربر را نصفه جواب نده.
  چیزی که کاربر خودش گفت را تکرار نکن.`;

export type RoutineAssistantPlan = {
  offTopic: boolean;
  reply: string;
  ops: any[];
  /** سوالِ مدل وقتی خودش نمی‌تواند تصمیم بگیرد، همراهِ گزینه‌های آماده */
  ask: { question: string; options: string[] } | null;
};

export type RoutineChatTurn = { role: "user" | "assistant"; text: string };

/**
 * پیامِ کاربر + وضعیتِ فعلیِ برنامه‌ها را می‌دهد و یک نقشه‌ی تغییر می‌گیرد.
 * هیچ اعتبارسنجیِ معنایی این‌جا نیست جز شکلِ کلی — آن کارِ routineAssistant است.
 */
export async function planRoutineChange(
  message: string,
  scheduleText: string,
  todayLabel: string,
  userId: string,
  history: RoutineChatTurn[] = []
): Promise<RoutineAssistantPlan> {
  // تاریخچه لازم است چون کاربر روی گزینه‌ها کلیک می‌کند و جوابِ کوتاه
  // می‌دهد («همون»، «۹:۳۰»)؛ بدونِ چند پیامِ قبلی این‌ها بی‌معنی‌اند.
  const historyText = history.length
    ? ["گفت‌وگوی قبلی (تازه‌ترین در انتها):",
       ...history.map((t) => `${t.role === "user" ? "کاربر" : "تو"}: ${t.text}`), ""].join("\n")
    : "";

  const userContent = [
    `امروز: ${todayLabel}`,
    "",
    historyText,
    "برنامه‌های فعلیِ کاربر:",
    scheduleText,
    "",
    `پیامِ کاربر: ${message}`,
  ].filter((x) => x !== "").join("\n");

  const { text, usage, durationMs } = await callAiChat(ROUTINE_ASSISTANT_PROMPT, userContent, 2000);
  recordAiUsage(userId, AiFeatureKey.ROUTINE_ASSISTANT, usage, durationMs, true);
  const parsed = parseJsonResponse(text);

  const rawAsk = parsed?.ask;
  const ask =
    rawAsk && typeof rawAsk.question === "string" && rawAsk.question.trim()
      ? {
          question: rawAsk.question.trim().slice(0, 300),
          options: (Array.isArray(rawAsk.options) ? rawAsk.options : [])
            .filter((o: unknown): o is string => typeof o === "string" && !!o.trim())
            .slice(0, 4)
            .map((o: string) => o.trim().slice(0, 80)),
        }
      : null;

  return {
    offTopic: parsed?.offTopic === true,
    reply: typeof parsed?.reply === "string" ? parsed.reply.trim().slice(0, 400) : "",
    ops: Array.isArray(parsed?.ops) ? parsed.ops : [],
    ask,
  };
}
