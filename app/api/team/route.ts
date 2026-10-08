import { NextResponse } from "next/server";
import { getTeamMembers } from "@/lib/teamServer";

// خواندن عمومی اعضای تیم برای صفحه‌ی درباره
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ members: await getTeamMembers() }, { headers: { "Cache-Control": "public, max-age=60" } });
}
