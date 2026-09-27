import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { getAiCostRate, setAiCostRate, DEFAULT_AI_COST_RATE } from "@/lib/appSettings";
import { writeAuditLog } from "@/lib/adminAnalytics";

export async function GET() {
  const guard = await requireAdmin("settings");
  if (!guard.ok) return guard.response;

  const aiCostRate = await getAiCostRate();
  return NextResponse.json({ aiCostRate, defaultAiCostRate: DEFAULT_AI_COST_RATE });
}

// PATCH { inputPer1kUsdMicros, outputPer1kUsdMicros } — تنها اهرم واقعی
// قابل‌تنظیم این بخش (نرخ تخمین هزینه‌ی AI)؛ بقیه‌ی «تنظیمات Owner» چیزی
// نیست که این اپ الان یک لیور واقعی براش داشته باشه.
export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin("settings");
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => null);
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
