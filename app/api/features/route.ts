import { NextResponse } from "next/server";
import { getSessionFast } from "@/lib/serverSession";
import { resolveFeaturesFor } from "@/lib/featureFlagsServer";

export const dynamic = "force-dynamic";

// GET — کدوم قابلیت‌ها برای کاربر فعلی روشنن (فقط برای مخفی‌کردن UI)
export async function GET() {
  const session = await getSessionFast();
  const features = await resolveFeaturesFor((session?.user as any)?.id);
  return NextResponse.json({ features }, { headers: { "Cache-Control": "no-store" } });
}
