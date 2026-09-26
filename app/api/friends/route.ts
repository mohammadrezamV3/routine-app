import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listFriends, sendFriendRequest } from "@/lib/mobileSocialFriends";

// منطقِ اصلی در lib/mobileSocialFriends.ts است (مشترک با /api/mobile/social/*).

// GET /api/friends?module=exercise|calorie → لیست دوستان تأییدشده + پیشرفت
// هرکدوم؛ exercise یعنی پیشرفت بدنسازی، calorie یعنی روزهای موفق کالری،
// وگرنه پیشرفت روتین روزانه (پیش‌فرض، برای داشبورد اصلی).
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const friends = await listFriends(userId, req.nextUrl.searchParams.get("module"));
  return NextResponse.json({ friends });
}

// POST /api/friends  { userId } یا { username }  → ارسال درخواست دوستی.
// حالت userId برای نتیجه‌ی جستجوی زنده‌ست (کاربر از قبل با آیدی پیدا شده)؛
// username برای سازگاری با ورودی مستقیم یوزرنیم.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const r = await sendFriendRequest(userId, session!.user!.name, body);
  return NextResponse.json(r.body, { status: r.status });
}
