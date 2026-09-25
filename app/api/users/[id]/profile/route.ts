import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getVisibleProfile } from "@/lib/mobileSocialFriends";

// GET /api/users/:id/profile — پروفایلِ یک کاربر (پاپ‌آپِ کلیک روی اسم).
// برخلافِ نسخه‌ی اولیه (که فقط برای دوستِ تأییدشده باز می‌شد)، طبقِ
// درخواستِ صریح باید توی «افزودن دوست» هم قابل دیدن باشه — یعنی قبل از
// این‌که دوست شوند. پس این‌جا شرط دوستی نیست، شرطِ discoverable/بلاک است
// (پیاده‌سازی در lib/mobileSocialFriends.ts → getVisibleProfile).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const viewerId = (session?.user as any)?.id;
  if (!viewerId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const r = await getVisibleProfile(viewerId, params.id);
  return NextResponse.json(r.body, { status: r.status });
}
