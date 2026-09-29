import { NextResponse } from "next/server";
import { getPublicStats } from "@/lib/publicStats";

// آمارِ عمومیِ لندینگ (بدونِ احرازهویت) — فقط چند شمارشِ کل، بدونِ هیچ دادهٔ شخصی.
export const dynamic = "force-dynamic";

export async function GET() {
  const stats = await getPublicStats();
  return NextResponse.json(stats, { headers: { "Cache-Control": "public, max-age=300, s-maxage=600" } });
}
