import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { generateRoadmapQuestions } from "@/lib/aiClient";
import { parseProfile } from "@/lib/roadmapInput";
import { checkRateLimit } from "@/lib/rateLimit";

// مرحله‌ی ۱ از ساختِ رودمپ: سوال‌های مخصوصِ همین موضوع.
//
// چیزی ذخیره نمی‌شود — این فقط یک فراخوانیِ مدل است که خروجی‌اش مستقیم به
// ویزارد می‌رود. خودِ سوال‌ها و جواب‌ها بعداً همراهِ POST /api/roadmaps
// می‌آیند و آن‌جا کنارِ مسیر ذخیره می‌شوند.
export const maxDuration = 60;

// هر فراخوانی هزینه‌ی واقعیِ توکن دارد، پس بدونِ سقف نمی‌شود رهایش کرد.
// عدد سخاوتمندانه است: کاربر ممکن است موضوعش را عوض کند و دوباره بپرسد.
const LIMIT = 10;
const WINDOW_MS = 10 * 60_000;

export async function POST(req: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  if (!(await checkRateLimit(`roadmap-questions:${userId}`, LIMIT, WINDOW_MS))) {
    return NextResponse.json({ error: "تعداد درخواست‌ها زیاد شد — چند دقیقه دیگر دوباره تلاش کن" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = parseProfile(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const result = await generateRoadmapQuestions(parsed.profile, userId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "ساخت سوال‌ها شکست خورد" }, { status: 500 });
  }
}
