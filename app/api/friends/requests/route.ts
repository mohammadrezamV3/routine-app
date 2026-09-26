import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestAuth";
import { listIncomingRequests } from "@/lib/mobileSocialFriends";

// GET /api/friends/requests → درخواست‌های دوستی دریافت‌شده و هنوز تأییدنشده
export async function GET() {
  const auth = await getRequestUser();
  const userId = auth?.userId;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  return NextResponse.json({ requests: await listIncomingRequests(userId) });
}
