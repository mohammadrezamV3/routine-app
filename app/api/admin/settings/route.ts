import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { getAiCostRate, setAiCostRate, DEFAULT_AI_COST_RATE } from "@/lib/appSettings";
import { writeAuditLog } from "@/lib/adminAnalytics";

export async function GET() {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const aiCostRate = await getAiCostRate();
  return NextResponse.json({ aiCostRate, defaultAiCostRate: DEFAULT_AI_COST_RATE });
}

// PATCH { inputPer1kUsdMicros, outputPer1kUsdMicros } — تنها اهرم واقعی
// قابل‌تنظیم این بخش (نرخ تخمین هزینه‌ی AI)؛ بقیه‌ی «تنظیمات Owner» چیزی
// نیست که این اپ الان یک لیور واقعی براش داشته باشه.
export async function PATCH(req: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => null);
  const inputRate = Number(body?.inputPer1kUsdMicros);
  const outputRate = Number(body?.outputPer1kUsdMicros);
  if (!Number.isFinite(inputRate) || inputRate < 0 || !Number.isFinite(outputRate) || outputRate < 0) {
    return NextResponse.json({ error: "نرخ‌های وارد شده معتبر نیستند" }, { status: 400 });
  }

  const rate = { inputPer1kUsdMicros: Math.round(inputRate), outputPer1kUsdMicros: Math.round(outputRate) };
  await setAiCostRate(rate);
  await writeAuditLog(guard.userId, "setting.ai_cost_rate", "AppSetting", "ai_cost_rate", rate);

  return NextResponse.json({ ok: true, aiCostRate: rate });
}
