import { NextRequest, NextResponse } from "next/server";
import { badRequest, forbidden, notFound } from "@/lib/mentorGuard";
import { parseDateRange } from "@/lib/validate";
import { checkRateLimit } from "@/lib/rateLimit";
import { addDaysIso, isoDate, todayIsoForUser } from "@/lib/mentorServer";
import { requireMentorTools, validId } from "@/lib/mentorToolsGuard";
import { EXPORT_MAX_DAYS, buildProgressCsv } from "@/lib/mentorReports";

// GET /api/mentor/export?studentId=&from=YYYY-MM-DD&to=YYYY-MM-DD → CSV پیشرفت یک شاگرد.
// پیش‌فرض ۳۰ روز اخیر؛ حداکثر ۱۲۰ روز. فقط رابطه‌ی ACTIVE همین منتور
// (شاگرد دیگر یا رابطه‌ی بسته → ۴۰۴) و روتین شاگرد فقط تا حد تنظیمات حریم خصوصی.
export async function GET(req: NextRequest) {
  const g = await requireMentorTools();
  if (!g.ok) return g.response;
  if (g.profile.suspendedAt) return forbidden("حساب مربی‌گری تو تعلیق شده");

  const sp = req.nextUrl.searchParams;
  const studentId = sp.get("studentId");
  if (!validId(studentId)) return notFound();

  let from: string;
  let to: string;
  if (sp.get("from") || sp.get("to")) {
    const r = parseDateRange(sp.get("from"), sp.get("to"), EXPORT_MAX_DAYS);
    if ("error" in r) return badRequest(r.error);
    from = isoDate(r.from);
    to = isoDate(r.to);
  } else {
    to = await todayIsoForUser(studentId);
    from = addDaysIso(to, -29);
  }

  if (!(await checkRateLimit(`mentor-export:${g.userId}`, 30, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد خروجی‌ها زیاد بوده؛ کمی بعد دوباره تلاش کن" }, { status: 429 });
  }

  const out = await buildProgressCsv(g.userId, studentId, from, to);
  if (!out) return notFound();
  if (out === "hidden") return forbidden("شاگرد نمایش پیشرفت را برای تو خاموش کرده است");

  const file = `progress-${from}-${to}.csv`;
  return new NextResponse(out.csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
