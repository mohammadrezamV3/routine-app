import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestAuth";
import { listFriends, sendFriendRequest } from "@/lib/mobileSocialFriends";

// منطقِ اصلی در lib/mobileSocialFriends.ts است (مشترک با /api/mobile/social/*).

// GET /api/friends?module=exercise|calorie → لیست دوستان تأییدشده + پیشرفت
// هرکدوم؛ exercise یعنی پیشرفت بدنسازی، calorie یعنی روزهای موفق کالری،
// وگرنه پیشرفت روتین روزانه (پیش‌فرض، برای داشبورد اصلی).
export async function GET(req: NextRequest) {
  const auth = await getRequestUser();
  const userId = auth?.userId;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const friends = await listFriends(userId, req.nextUrl.searchParams.get("module"));
  return NextResponse.json({ friends });
}

// POST /api/friends  { userId } یا { username }  → ارسال درخواست دوستی.
// حالت userId برای نتیجه‌ی جستجوی زنده‌ست (کاربر از قبل با آیدی پیدا شده)؛
// username برای سازگاری با ورودی مستقیم یوزرنیم.
export async function POST(req: NextRequest) {
  const auth = await getRequestUser();
  const userId = auth?.userId;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const r = await sendFriendRequest(userId, auth!.name, body);
  return NextResponse.json(r.body, { status: r.status });
}
