import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { getAiCostRate, setAiCostRate, setAppSetting, DEFAULT_AI_COST_RATE } from "@/lib/appSettings";
import { getTrialAiLimits } from "@/lib/aiQuota";
import {
  DEFAULT_TRIAL_AI_LIMITS, MAX_TRIAL_AI_LIMIT, TRIAL_AI_FEATURES, TRIAL_AI_LIMITS_SETTING_KEY, type TrialAiLimits,
} from "@/lib/trial";
import { writeAuditLog } from "@/lib/adminAnalytics";

export async function GET() {
  const guard = await requireAdmin("settings");
  if (!guard.ok) return guard.response;

  const [aiCostRate, trialAiLimits] = await Promise.all([getAiCostRate(), getTrialAiLimits()]);
  return NextResponse.json({
    aiCostRate, defaultAiCostRate: DEFAULT_AI_COST_RATE,
    trialAiLimits, defaultTrialAiLimits: DEFAULT_TRIAL_AI_LIMITS,
  });
}

// PATCH { inputPer1kUsdMicros, outputPer1kUsdMicros } — تنها اهرم واقعی
// قابل‌تنظیم این بخش (نرخ تخمین هزینه‌ی AI)؛ بقیه‌ی «تنظیمات Owner» چیزی
// نیست که این اپ الان یک لیور واقعی براش داشته باشه.
export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin("settings");
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => null);

  // { trialAiLimits: { FEATURE: n } } — سقفِ کلِ استفاده از هر فیچرِ AI در
  // دوره‌ی آزمایشیِ حسابِ تازه (lib/trial.ts). جدا از نرخ هزینه ذخیره می‌شه.
  if (body && typeof body === "object" && "trialAiLimits" in body) {
    const raw = (body as any).trialAiLimits;
    if (!raw || typeof raw !== "object") {
      return NextResponse.json({ error: "سقف‌های دوره‌ی آزمایشی معتبر نیستند" }, { status: 400 });
    }
    const limits = {} as TrialAiLimits;
    for (const f of TRIAL_AI_FEATURES) {
      const v = raw[f];
      const n = v === null || v === undefined || (typeof v === "string" && !v.trim()) ? NaN : Number(v);
      if (!Number.isInteger(n) || n < 0 || n > MAX_TRIAL_AI_LIMIT) {
        return NextResponse.json({ error: `هر سقف باید عدد صحیحی بین 0 تا ${MAX_TRIAL_AI_LIMIT} باشد` }, { status: 400 });
      }
      limits[f] = n;
    }
    await setAppSetting(TRIAL_AI_LIMITS_SETTING_KEY, limits);
    await writeAuditLog(guard.userId, "setting.trial_ai_limits", "AppSetting", TRIAL_AI_LIMITS_SETTING_KEY, limits);
    return NextResponse.json({ ok: true, trialAiLimits: limits });
  }

  // Number(null)/Number("") صفره — بدون این چک یه فیلدِ خالی بی‌صدا نرخ رو صفر می‌کرد
  const parse = (v: unknown) => (v === null || v === undefined || (typeof v === "string" && !v.trim()) ? NaN : Number(v));
  const inputRate = parse(body?.inputPer1kUsdMicros);
  const outputRate = parse(body?.outputPer1kUsdMicros);
  const MAX_RATE = 100_000_000; // ۱۰۰ دلار به‌ازای هر ۱۰۰۰ توکن — سقفِ منطقی برای جلوگیری از اشتباهِ تایپی
  const valid = (n: number) => Number.isFinite(n) && n >= 0 && n <= MAX_RATE;
  if (!valid(inputRate) || !valid(outputRate)) {
    return NextResponse.json({ error: "نرخ‌های وارد شده معتبر نیستند" }, { status: 400 });
  }

  const rate = { inputPer1kUsdMicros: Math.round(inputRate), outputPer1kUsdMicros: Math.round(outputRate) };
  await setAiCostRate(rate);
  await writeAuditLog(guard.userId, "setting.ai_cost_rate", "AppSetting", "ai_cost_rate", rate);

  return NextResponse.json({ ok: true, aiCostRate: rate });
}
