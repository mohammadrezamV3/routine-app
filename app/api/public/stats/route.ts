import { NextResponse } from "next/server";
import { getPublicUserCount } from "@/lib/publicStats";

// آمارِ عمومیِ لندینگ (بدونِ احرازهویت) — فقط یک عدد، بدونِ هیچ دادهٔ شخصی.
export const dynamic = "force-dynamic";

export async function GET() {
  const users = await getPublicUserCount();
  return NextResponse.json({ users }, { headers: { "Cache-Control": "public, max-age=300, s-maxage=600" } });
}
