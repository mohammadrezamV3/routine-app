// مربیِ AI برای «آنالیز هفتگی» — دقیقا هم‌الگویِ خلاصه‌ی هوشمندِ گزارشِ
// هفتگیِ قدیمی (که این‌جا حذف شد): فقط روی اعدادِ از‌قبل‌محاسبه‌شده‌ی
// lib/weeklyAnalysis/compute.ts تفسیر می‌نویسه — هیچ عدد/دستاورد جدیدی حق
// نداره بسازه (محافظت در برابر Hallucination). متنِ آزادِ کاربر (مثلا
// ریفلکشن) عمدا هیچ‌وقت به مدل فرستاده نمی‌شه، فقط اعدادِ تجمیعی.
//
// از همون گیت‌وی/الگوی lib/aiClient.ts استفاده می‌کنه (callAiChat/
// withAiBudget/recordAiUsage/parseJsonResponse صادرشده از همون‌جا) تا
// تایم‌اوت/بودجه/ثبتِ مصرف دوباره تکرار نشه.

import { AiFeatureKey } from "@prisma/client";
import {
  callAiChat,
  withAiBudget,
  recordAiUsage,
  parseJsonResponse,
  WEEKLY_ANALYSIS_AI_MODEL,
} from "@/lib/aiClient";
import { logError } from "@/lib/errorLog";
import { ANALYSIS_DOMAIN_LABELS, AnalysisDomain, AiCoach, WeeklyAnalysis } from "@/lib/weeklyAnalysis/types";

/** ورودیِ کافی برای مربیِ AI — همون WeeklyAnalysis منهایِ چیزهایی که خودِ AI قراره پر کنه. */
export type WeeklyAnalysisForAi = Omit<WeeklyAnalysis, "ai" | "aiAvailable" | "goals" | "nextWeekGoals" | "reflection">;

/** true یعنی گیت‌وی AI تنظیم شده — بدونش این فیچر اصلا فراخوانی نمی‌شه. */
export function isAiAvailable(): boolean {
  return !!process.env.ARVAN_AI_BASE_URL && !!process.env.ARVAN_AI_API_KEY;
}

const SYSTEM_PROMPT = `تو مربیِ آنالیزِ هفتگیِ Arion هستی. یک خلاصه‌ی آماریِ از‌قبل‌محاسبه‌شده از عملکردِ
هفتگیِ کاربر (فقط اعداد/برچسب‌ها، نه متنِ خامِ کاربر) می‌گیری و باید یک تفسیرِ کوتاهِ فارسی و
حداکثر ۴ پیشنهادِ عملی بنویسی.

قوانینِ حیاتی:
- فقط از اعداد/الگوهایی که توی ورودی داده شده استفاده کن. هیچ عدد، درصد، یا دستاوردِ جدیدی که توی ورودی نیست نساز.
- اگه داده‌ی کافی برایِ یک جمع‌بندیِ خاص نداری (hasData=false یا score=null)، چیزی درباره‌ش نگو — حدس نزن.
- هیچ توصیه‌ی پزشکی، مالی، یا تشخیصی نده — فقط بازخوردِ رفتاری/عملکردی بر اساسِ همین اعداد.
- لحن: مستقیم، محترمانه، مثلِ یک مربیِ شخصی — نه ژنریک، نه اغراق‌آمیز.
- خلاصه (summary) حداکثر ۵ جمله؛ باید صریحاً نقطه‌قوت و نقطه‌ضعفِ اصلیِ همین هفته را نام ببرد.
- حداکثر ۴ پیشنهاد (recommendations)، هرکدوم با یک توضیحِ کوتاه و دلیلِ مبتنی‌بر همان اعداد.

فقط و فقط این JSON خام را برگردان (بدونِ Markdown fence، بدونِ متنِ اضافه):
{
  "summary": "خلاصه‌ی ۳ تا ۵ جمله‌ای",
  "recommendations": [
    { "title": "عنوانِ کوتاه", "description": "توضیحِ کوتاه با دلیلِ مبتنی‌بر داده", "priority": "high" | "medium" | "low", "domain": "یکی از keyهایِ domains ورودی، یا null اگه مربوط به یک دامنه‌ی خاص نیست" }
  ]
}`;

type AiInputDomain = { key: AnalysisDomain; label: string; score: number | null; prevScore: number | null; delta: number | null; hasData: boolean };
type AiInput = {
  weekLabel: string;
  offset: number;
  isCurrentWeek: boolean;
  overall: { score: number | null; prevScore: number | null; delta: number | null; grade: string | null; consistency: number | null; activeDays: number };
  domains: AiInputDomain[];
  insights: { title: string; body: string; domain: string | null; tone: string }[];
  prediction: { projectedScore: number; low: number; high: number } | null;
};

function buildInput(analysis: WeeklyAnalysisForAi): AiInput {
  return {
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
    // فقط عنوان/بدنه/دامنه/لحن — این‌ها خودشون خروجیِ قطعیِ compute.ts هستن (evidence-based)، نه متنِ خامِ کاربر
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

async function callOnce(analysis: WeeklyAnalysisForAi, userId: string, timeoutMs: number): Promise<AiCoach> {
  const input = buildInput(analysis);
  const { text, usage, durationMs } = await callAiChat(SYSTEM_PROMPT, JSON.stringify(input), 1400, WEEKLY_ANALYSIS_AI_MODEL, timeoutMs);
  recordAiUsage(userId, AiFeatureKey.WEEKLY_COACH_REPORT, usage, durationMs, true, WEEKLY_ANALYSIS_AI_MODEL);
  return normalizeAiCoach(parseJsonResponse(text), WEEKLY_ANALYSIS_AI_MODEL);
}

/**
 * تا ۲ تلاش، زیرِ همون بودجه‌ی زمانیِ مشترکِ withAiBudget. اگه هردو شکست
 * خورد، صرفا throw می‌کنه — caller (روت API / کرون) تصمیمِ ۵۰۳/۵۰۴ یا
 * fallback بدونِ AI رو خودش می‌گیره.
 */
export async function generateAiCoach(analysis: WeeklyAnalysisForAi, userId: string): Promise<AiCoach> {
  if (!isAiAvailable()) {
    throw new Error("ARVAN_AI تنظیم نشده — مربیِ AI آنالیزِ هفتگی در دسترس نیست");
  }
  try {
    return await withAiBudget((timeoutMs) => callOnce(analysis, userId, timeoutMs));
  } catch (err: any) {
    logError("ai-gateway", `مربیِ AI آنالیزِ هفتگی شکست خورد: ${err?.message || err}`, { context: { feature: "WEEKLY_COACH_REPORT" } });
    throw err;
  }
}
