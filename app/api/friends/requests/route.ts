import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listIncomingRequests } from "@/lib/mobileSocialFriends";

// GET /api/friends/requests → درخواست‌های دوستی دریافت‌شده و هنوز تأییدنشده
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  return NextResponse.json({ requests: await listIncomingRequests(userId) });
}
