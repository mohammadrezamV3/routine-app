// مربی AI برای «آنالیز هفتگی» — دقیقا هم‌الگوی خلاصه‌ی هوشمند گزارش
// هفتگی قدیمی (که این‌جا حذف شد): فقط روی اعداد از‌قبل‌محاسبه‌شده‌ی
// lib/weeklyAnalysis/compute.ts تفسیر می‌نویسه — هیچ عدد/دستاورد جدیدی حق
// نداره بسازه (محافظت در برابر Hallucination). متن آزاد کاربر (مثلا
// ریفلکشن) عمدا هیچ‌وقت به مدل فرستاده نمی‌شه، فقط اعداد تجمیعی.
//
// از همون گیت‌وی/الگوی lib/aiClient.ts استفاده می‌کنه (callAiChat/
// withAiBudget/recordAiUsage/parseJsonResponse صادرشده از همون‌جا) تا
// تایم‌اوت/بودجه/ثبت مصرف دوباره تکرار نشه.

import { AiFeatureKey } from "@prisma/client";
import {
  callAiChat,
  withAiBudget,
  recordAiUsage,
  parseJsonResponse,
  WEEKLY_ANALYSIS_AI_MODEL,
} from "@/lib/aiClient";
import { isEn } from "@/lib/i18n";
import { logError } from "@/lib/errorLog";
import { ANALYSIS_DOMAIN_LABELS, AnalysisDomain, AiCoach } from "@/lib/weeklyAnalysis/types";
import type { WeeklyAnalysisBase } from "@/lib/weeklyAnalysis/compute";
import type { TradeCoachInput } from "@/lib/weeklyLetter/tradeWeekText";
import type { FitAiSummary } from "@/lib/weeklyLetter/fitWeekText";

/** ورودی کافی برای مربی AI — همون WeeklyAnalysis منهای چیزهایی که خود AI قراره پر کنه. */
export type WeeklyAnalysisForAi = WeeklyAnalysisBase;

/** true یعنی گیت‌وی AI تنظیم شده — بدونش این فیچر اصلا فراخوانی نمی‌شه. */
export function isAiAvailable(): boolean {
  return !!process.env.ARVAN_AI_BASE_URL && !!process.env.ARVAN_AI_API_KEY;
}

const SYSTEM_PROMPT = `تو مربی آنالیز هفتگی Arion هستی. یک خلاصه‌ی آماری از‌قبل‌محاسبه‌شده از عملکرد
هفتگی کاربر (فقط اعداد/برچسب‌ها، نه متن خام کاربر) می‌گیری و باید یک تفسیر کوتاه فارسی و
حداکثر 4 پیشنهاد عملی بنویسی.

قوانین حیاتی:
- فقط از اعداد/الگوهایی که توی ورودی داده شده استفاده کن. هیچ عدد، درصد، یا دستاورد جدیدی که توی ورودی نیست نساز.
- اگه داده‌ی کافی برای یک جمع‌بندی خاص نداری (hasData=false یا score=null)، چیزی درباره‌ش نگو — حدس نزن.
- هیچ توصیه‌ی پزشکی، مالی، یا تشخیصی نده — فقط بازخورد رفتاری/عملکردی بر اساس همین اعداد.
- لحن: محاوره‌ای، گرم و صمیمی — مثل یک دوست باتجربه که واقعا پیشرفت کاربر براش مهمه، نه
  یک گزارش رسمی یا یک مربی سخت‌گیر. از جمله‌های خشک و قالبی («عملکرد شما نشان می‌دهد») پرهیز
  کن؛ مستقیم با خود کاربر حرف بزن. نقطه‌قوت را با ذوق و صمیمیت بگو، نقطه‌ضعف را با همدلی و
  بدون سرزنش — هیچ‌وقت نه ژنریک، نه اغراق‌آمیز، نه رباتی.
- خلاصه (summary) حداکثر 5 جمله؛ باید صریحا نقطه‌قوت و نقطه‌ضعف اصلی همین هفته را نام ببرد.
- حداکثر 4 پیشنهاد (recommendations)، هرکدوم با یک توضیح کوتاه و دلیل مبتنی‌بر همان اعداد.

فقط و فقط این JSON خام را برگردان (بدون Markdown fence، بدون متن اضافه):
{
  "summary": "خلاصه‌ی 3 تا 5 جمله‌ای",
  "recommendations": [
    { "title": "عنوان کوتاه", "description": "توضیح کوتاه با دلیل مبتنی‌بر داده", "priority": "high" | "medium" | "low", "domain": "یکی از keyهای domains ورودی، یا null اگه مربوط به یک دامنه‌ی خاص نیست" }
  ]
}`;

// انگلیسی: همون قوانین، فقط زبان خروجی عوض می‌شه (ورودی/کلیدهای JSON دست‌نخورده)
const EN_SUFFIX = `

LANGUAGE OVERRIDE: write the "summary" and every recommendation "title" and "description" in natural, warm, conversational English instead of Persian (second person, "you"). Keep the JSON keys, "priority" and "domain" values exactly as specified. Never use Persian text in the output.`;
// بخش ترید: مربی معامله‌گر. ورودی شامل کلید trade با عددهای از‌قبل‌محاسبه‌شده‌ی معامله‌های هفته‌ست
const TRADE_SUFFIX = `

حالت مربی ترید: ورودی کلید "trade" دارد (آمار معامله‌های همین هفته: سود و زیان خالص، نرخ برد، ضریب سود، امید ریاضی، افت، انضباط، هزینه‌ی قانون‌شکنی، رفتار بعد از ضرر، بهترین/بدترین جلسه و نماد، خرید در برابر فروش). تو یک مربی معامله‌گری هستی که روی «فرایند» و انضباط تمرکز دارد، نه پیش‌بینی بازار.
- هیچ سیگنال، پیش‌بینی قیمت، توصیه‌ی خرید/فروش یا مشاوره‌ی سرمایه‌گذاری نده؛ فقط درباره‌ی رفتار معاملاتی کاربر بر اساس همین اعداد حرف بزن.
- خلاصه باید سود/زیان و نرخ برد را کنار انضباط (طبق پلن، حدضرر، معامله‌ی هیجانی) تفسیر کند و اگر قانون‌شکنی یا معامله‌ی سریع بعد از ضرر هزینه داشته، صریح و همدلانه بگوید.
- پیشنهادها را به رفتار قابل‌اندازه‌گیری برای هفته‌ی بعد تبدیل کن (مثلا «بعد از ضرر 2 ساعت صبر»، «حدضرر روی همه‌ی معامله‌ها»). domain همه‌ی پیشنهادها "trading" است.
- ارزها را همان‌طور که در currency آمده بخوان؛ هیچ مبلغ جدیدی نساز.`;
const TRADE_EN = `

LANGUAGE OVERRIDE (trade mode): write in natural English as above. You are a trading-process coach: never give signals, price predictions or buy/sell advice; only comment on the user's behaviour using the numbers in "trade".`;
// بخش ورزش: مربی تمرین و تغذیه. ورودی کلید fit با عددهای از‌قبل‌محاسبه‌شده‌ی تمرین و تغذیه‌ی هفته داره
const FIT_SUFFIX = `

حالت مربی تمرین و تغذیه: ورودی کلید "fit" دارد (جلسه‌های انجام‌شده و برنامه‌ریزی‌شده، پایبندی، عضله‌های کارشده و جاافتاده، کالری و درشت‌مغذی‌ها در برابر هدف، تراز انرژی هفته، روز تمرین در برابر روز استراحت و خواب قبل از جلسه‌ها). تو یک مربی بدنسازی و تغذیه‌ی ورزشی هستی که روی ثبات و عادت‌ها تمرکز دارد.
- خلاصه باید جلسه‌های تمرین و تغذیه را کنار هم تفسیر کند (مثلا پروتئین روزهای تمرین، کالری در برابر هدف کات/حجم/ثبات)، نه خواب‌محور باشد.
- ورودی ستون وزنه، ست و تکرار ندارد: هیچ حجم تمرین، رکورد یا افزایش وزنه نساز.
- تراز انرژی و تغییر وزن فقط تخمین است؛ هیچ توصیه‌ی پزشکی یا رژیم افراطی نده و عددی خارج از ورودی نساز.
- پیشنهادها را به هدف قابل‌اندازه‌گیری برای هفته‌ی بعد تبدیل کن (تعداد جلسه، گرم پروتئین، بازه‌ی کالری) و domain را "fitness" یا "nutrition" بگذار.`;
const FIT_EN = `

LANGUAGE OVERRIDE (training and nutrition mode): write in natural English as above. You are a strength and nutrition coach: read the "fit" numbers, never invent sets, reps, volume or personal records, and treat weight change as an estimate only.`;
const systemPrompt = (trade?: TradeCoachInput | null, fit?: FitAiSummary | null) => {
  const base = SYSTEM_PROMPT + (trade ? TRADE_SUFFIX : "") + (fit ? FIT_SUFFIX : "");
  return isEn() ? base + EN_SUFFIX + (trade ? TRADE_EN : "") + (fit ? FIT_EN : "") : base;
};

type AiInputDomain = { key: AnalysisDomain; label: string; score: number | null; prevScore: number | null; delta: number | null; hasData: boolean };
type AiInput = {
  weekLabel: string;
  offset: number;
  isCurrentWeek: boolean;
  overall: { score: number | null; prevScore: number | null; delta: number | null; grade: string | null; consistency: number | null; activeDays: number };
  domains: AiInputDomain[];
  insights: { title: string; body: string; domain: string | null; tone: string }[];
  prediction: { projectedScore: number; low: number; high: number } | null;
  /** فقط بخش ترید: خلاصه‌ی عددی معامله‌های هفته (بدون هیچ متن آزاد) */
  trade?: TradeCoachInput;
  /** فقط بخش ورزش: خلاصه‌ی عددی تمرین و تغذیه‌ی هفته (بدون هیچ متن آزاد) */
  fit?: FitAiSummary;
};

function buildInput(analysis: WeeklyAnalysisForAi, trade?: TradeCoachInput | null, fit?: FitAiSummary | null): AiInput {
  return {
    ...(trade ? { trade } : {}),
    ...(fit ? { fit } : {}),
    weekLabel: analysis.weekLabel,
    offset: analysis.offset,
    isCurrentWeek: analysis.isCurrentWeek,
    overall: {
      score: analysis.overall.score,
      prevScore: analysis.overall.prevScore,
      delta: analysis.overall.delta,
      grade: analysis.overall.grade,
      consistency: analysis.overall.consistency,
      activeDays: analysis.overall.activeDays,
    },
    domains: analysis.domains.map((d) => ({
      key: d.domain,
      label: ANALYSIS_DOMAIN_LABELS[d.domain],
      score: d.score,
      prevScore: d.prevScore,
      delta: d.delta,
      hasData: d.hasData,
    })),
    // فقط عنوان/بدنه/دامنه/لحن — این‌ها خودشون خروجی قطعی compute.ts هستن (evidence-based)، نه متن خام کاربر
    insights: analysis.insights.map((i) => ({ title: i.title, body: i.body, domain: i.domain ?? null, tone: i.tone })),
    prediction: analysis.prediction
      ? { projectedScore: analysis.prediction.projectedScore, low: analysis.prediction.low, high: analysis.prediction.high }
      : null,
  };
}

const VALID_DOMAIN_KEYS = new Set<string>(Object.keys(ANALYSIS_DOMAIN_LABELS));
const VALID_PRIORITIES = new Set(["high", "medium", "low"]);

function normalizeAiCoach(raw: any, model: string): AiCoach {
  const summary = typeof raw?.summary === "string" ? raw.summary.trim() : "";
  if (!summary) throw new Error("مدل خلاصه‌ای برنگردوند");

  const recsRaw = Array.isArray(raw?.recommendations) ? raw.recommendations : [];
  const recommendations = recsRaw
    .map((r: any) => ({
      title: typeof r?.title === "string" ? r.title.trim().slice(0, 120) : "",
      description: typeof r?.description === "string" ? r.description.trim().slice(0, 500) : "",
      priority: (VALID_PRIORITIES.has(r?.priority) ? r.priority : "medium") as "high" | "medium" | "low",
      domain: typeof r?.domain === "string" && VALID_DOMAIN_KEYS.has(r.domain) ? (r.domain as AnalysisDomain) : null,
    }))
    .filter((r: any) => r.title && r.description)
    .slice(0, 4);

  return { summary: summary.slice(0, 1200), recommendations, generatedAt: new Date().toISOString(), model };
}

async function callOnce(analysis: WeeklyAnalysisForAi, userId: string, timeoutMs: number, trade?: TradeCoachInput | null, fit?: FitAiSummary | null): Promise<AiCoach> {
  const input = buildInput(analysis, trade, fit);
  // temperature کمی بالاتر از پیش‌فرض فقط برای لحن متن آزاد (summary/description)؛
  // ساختار JSON و اعدادش دست‌نخورده می‌مانند چون normalizeAiCoach هرچیز نامعتبر را رد می‌کند.
  const { text, usage, durationMs } = await callAiChat(systemPrompt(trade, fit), JSON.stringify(input), 1400, WEEKLY_ANALYSIS_AI_MODEL, timeoutMs, 0.8);
  recordAiUsage(userId, AiFeatureKey.WEEKLY_COACH_REPORT, usage, durationMs, true, WEEKLY_ANALYSIS_AI_MODEL);
  return normalizeAiCoach(parseJsonResponse(text), WEEKLY_ANALYSIS_AI_MODEL);
}

/**
 * تا ۲ تلاش، زیر همون بودجه‌ی زمانی مشترک withAiBudget. اگه هردو شکست
 * خورد، صرفا throw می‌کنه — caller (روت API / کرون) تصمیم ۵۰۳/۵۰۴ یا
 * fallback بدون AI رو خودش می‌گیره.
 */
export async function generateAiCoach(analysis: WeeklyAnalysisForAi, userId: string, extra?: { trade?: TradeCoachInput | null; fit?: FitAiSummary | null }): Promise<AiCoach> {
  if (!isAiAvailable()) {
    throw new Error("ARVAN_AI تنظیم نشده — مربی AI آنالیز هفتگی در دسترس نیست");
  }
  try {
    return await withAiBudget((timeoutMs) => callOnce(analysis, userId, timeoutMs, extra?.trade, extra?.fit));
  } catch (err: any) {
    logError("ai-gateway", `مربی AI آنالیز هفتگی شکست خورد: ${err?.message || err}`, { context: { feature: "WEEKLY_COACH_REPORT" } });
    throw err;
  }
}
