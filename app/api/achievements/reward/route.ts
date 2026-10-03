import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { findAchievementReward } from "@/lib/achievementsServer";
import { sessionFeatureBlocked } from "@/lib/featureFlagsServer";

// GET /api/achievements/reward → بزرگ‌ترین پاداش تخفیف اچیومنت باز و مصرف‌نشده
// (فقط پیش‌نمایش برای صفحه‌ی چک‌اوت؛ مبلغ واقعی و قاعده‌ی «فقط یک‌ماهه» همیشه
// سمت سرور در api/subscription/checkout دوباره حساب می‌شه). عمدا پشت گیت
// ROUTINE نیست: کاربری که دوره‌ی آزمایشیش تموم شده هم باید پاداشش رو ببینه.
export async function GET() {
  { const off = await sessionFeatureBlocked("streak"); if (off) return off; }
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await checkRateLimit(`achievement-reward:${userId}`, 30, 60_000))) {
    return NextResponse.json({ error: "درخواست زیاد است، کمی بعد دوباره امتحان کن" }, { status: 429 });
  }
  const reward = await findAchievementReward(userId);
  return NextResponse.json(
    { reward: reward ? { tier: reward.tier, percent: reward.percent } : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
