import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getClientIp } from "@/lib/rateLimit";
import { searchUsers } from "@/lib/mobileSocialFriends";

// GET /api/friends/search?q=...  → جستجوی زنده‌ی کاربر با یوزرنیم/اسم، برای
// تایپ‌آهد «افزودن دوست». برای هر نتیجه وضعیت فعلی رابطه رو هم برمی‌گردونه
// تا سمت کلاینت بشه به‌جای دکمه‌ی ارسال، وضعیت «قبلا دوستید»/«در انتظار» رو نشون داد.
// قواعد (discoverable، بلاکِ دوطرفه، سقف نرخ) در lib/mobileSocialFriends.ts.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const isSuperAdmin = !!(session!.user as any).isSuperAdmin;
  const r = await searchUsers(userId, isSuperAdmin, getClientIp(req.headers), req.nextUrl.searchParams.get("q"));
  return NextResponse.json(r.body, { status: r.status });
}
