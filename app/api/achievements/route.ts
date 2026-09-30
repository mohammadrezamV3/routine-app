import { NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { requireModule } from "@/lib/moduleAccess";
import { checkRateLimit } from "@/lib/rateLimit";
import { computeUserAchievements } from "@/lib/achievementsServer";

// GET /api/achievements — استریک + همه‌ی اچیومنت‌ها. محاسبه کاملا سمتِ سرور از
// داده‌ی واقعی (lib/achievementsServer.ts)؛ اچیومنتِ تازه همین‌جا ثبت می‌شه و
// نامِ طلایی هم فقط همین‌جا ست می‌شه. بخشی از «روتین من» ـه → ROUTINE.
export async function GET() {
  const guard = await requireModule(ModuleKey.ROUTINE);
  if (!guard.ok) return guard.response;
  // کلِ تاریخچه خونده می‌شه — سقفِ منطقی برای جلوگیری از فشارِ تکراری
  if (!(await checkRateLimit(`achievements:${guard.userId}`, 30, 60_000))) return NextResponse.json({ error: "درخواست زیاد است، کمی بعد دوباره امتحان کن" }, { status: 429 });
  const data = await computeUserAchievements(guard.userId);
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
