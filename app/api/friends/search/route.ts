import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestAuth";
import { getClientIp } from "@/lib/rateLimit";
import { searchUsers } from "@/lib/mobileSocialFriends";

// GET /api/friends/search?q=...  → جستجوی زنده‌ی کاربر با یوزرنیم/اسم، برای
// تایپ‌آهد «افزودن دوست». برای هر نتیجه وضعیت فعلی رابطه رو هم برمی‌گردونه
// تا سمت کلاینت بشه به‌جای دکمه‌ی ارسال، وضعیت «قبلا دوستید»/«در انتظار» رو نشون داد.
// قواعد (discoverable، بلاکِ دوطرفه، سقف نرخ) در lib/mobileSocialFriends.ts.
export async function GET(req: NextRequest) {
  const auth = await getRequestUser();
  const userId = auth?.userId;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const isSuperAdmin = !!auth!.isSuperAdmin;
  const r = await searchUsers(userId, isSuperAdmin, getClientIp(req.headers), req.nextUrl.searchParams.get("q"));
  return NextResponse.json(r.body, { status: r.status });
}
