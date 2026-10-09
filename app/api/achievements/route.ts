import { tr } from "@/lib/i18n";
import { NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { requireModule } from "@/lib/moduleAccess";
import { checkRateLimit } from "@/lib/rateLimit";
import { computeUserAchievements } from "@/lib/achievementsServer";
import { sessionFeatureBlocked } from "@/lib/featureFlagsServer";

// GET /api/achievements — استریک + همه‌ی اچیومنت‌ها. محاسبه کاملا سمت سرور از
// داده‌ی واقعی (lib/achievementsServer.ts)؛ اچیومنت تازه همین‌جا ثبت می‌شه و
// نام طلایی هم فقط همین‌جا ست می‌شه. بخشی از «روتین من» ـه → ROUTINE.
export async function GET() {
  { const off = await sessionFeatureBlocked("streak"); if (off) return off; }
  const guard = await requireModule(ModuleKey.ROUTINE);
  if (!guard.ok) return guard.response;
  // کل تاریخچه خونده می‌شه — سقف منطقی برای جلوگیری از فشار تکراری
  if (!(await checkRateLimit(`achievements:${guard.userId}`, 30, 60_000))) return NextResponse.json({ error: tr("درخواست زیاد است، کمی بعد دوباره امتحان کن", "Too many requests — try again shortly") }, { status: 429 });
  const data = await computeUserAchievements(guard.userId);
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
