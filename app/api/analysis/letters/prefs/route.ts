import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { requireModule } from "@/lib/moduleAccess";
import { featureBlocked } from "@/lib/featureFlagsServer";
import { getLetterPrefs, setLetterPrefs } from "@/lib/weeklyLetter/prefs";

// GET/PUT /api/analysis/letters/prefs { email } → { email: boolean }
// ارسال ایمیلی «هفته‌نامه» (پیش‌فرض روشن). اعلان درون‌برنامه‌ای همیشه میاد.

async function gate() {
  const guard = await requireModule(ModuleKey.AI_INSIGHT);
  if (!guard.ok) return { response: guard.response };
  const off = await featureBlocked("weeklyAnalysis", guard.userId);
  if (off) return { response: off };
  return { userId: guard.userId };
}

export async function GET() {
  try {
    const g = await gate();
    if ("response" in g) return g.response;
    return NextResponse.json(await getLetterPrefs(g.userId));
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "خطای غیرمنتظره" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const g = await gate();
    if ("response" in g) return g.response;
    const body = await req.json().catch(() => null);
    if (!body || typeof body.email !== "boolean") {
      return NextResponse.json({ error: "مقدار email باید true یا false باشد" }, { status: 400 });
    }
    return NextResponse.json(await setLetterPrefs(g.userId, { email: body.email }));
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "خطای غیرمنتظره" }, { status: 500 });
  }
}
