import { NextRequest, NextResponse } from "next/server";
import { getSessionFast } from "@/lib/serverSession";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { isFeatureEnabled, requireFeature } from "@/lib/featureFlagsServer";
import { checkRateLimit } from "@/lib/rateLimit";
import { tr } from "@/lib/i18n";
import { toCsv } from "@/lib/export/csv";
import { EXPORT_META, EXPORT_MODULES, type ExportModule } from "@/lib/export/modules";
import { parseExportParams } from "@/lib/export/params";
import { buildProfileExtras, buildTable, exportFileName } from "@/lib/export/exportServer";

export const dynamic = "force-dynamic";

// GET /api/export?module=routine|reflections|sleep|exercise|calorie|trade|all
//     &format=csv|json &from=YYYY-MM-DD &to=YYYY-MM-DD [&accountId=]
// خروجی داده‌ی خود کاربر به‌صورت دانلود فایل. ماژول‌های پولی (تمرین، کالری،
// ترید) با requireModule سمت سرور گیت می‌شن؛ روتین/خواب/مرور هفتگی ماژول
// پایه‌ان و خوندن تاریخچه‌شون آزاده (حتی بعد از پایان دوره‌ی آزمایشی، تا
// کاربر همیشه به داده‌ی خودش دسترسی داشته باشه) ولی فلگ قابلیتشون رو رعایت
// می‌کنن. module=all فقط JSON‌ه و هر بخشی که کاربر بهش دسترسی نداره حذف می‌شه.

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 10;

function deny(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

function download(body: string, contentType: string, filename: string) {
  return new Response(body, {
    headers: {
      "Content-Type": `${contentType}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(req: NextRequest) {
  const parsed = parseExportParams(req.nextUrl.searchParams);
  if (!parsed.ok) return deny(400, parsed.error);
  const p = parsed.value;

  // ── احراز هویت و گیت ──────────────────────────────────────────────
  let userId: string;
  let isSuperAdmin = false;
  if (p.target === "all") {
    const session = await getSessionFast();
    const id = (session?.user as any)?.id as string | undefined;
    if (!id) return deny(401, "unauthorized");
    const u = await prisma.user.findUnique({ where: { id }, select: { isBlocked: true } });
    if (u?.isBlocked) return deny(403, tr("حساب کاربری مسدود شده است", "This account is blocked"));
    userId = id;
    isSuperAdmin = !!(session!.user as any).isSuperAdmin;
  } else {
    const meta = EXPORT_META[p.target];
    const guard = meta.moduleKey ? await requireModule(meta.moduleKey) : await requireFeature(meta.feature);
    if (!guard.ok) return guard.response;
    userId = guard.userId;
    if (meta.moduleKey && !(await isFeatureEnabled(meta.feature, userId))) {
      return deny(403, tr("این بخش موقتا غیرفعال است", "This section is temporarily disabled"));
    }
  }

  if (!(await checkRateLimit(`export:${userId}`, MAX_PER_WINDOW, WINDOW_MS))) {
    return deny(429, tr("تعداد خروجی‌های این ساعت به سقف رسیده؛ کمی بعد دوباره تلاش کن", "You have reached the hourly export limit; try again a little later"));
  }

  const q = { from: p.from, to: p.to, accountId: p.accountId };
  const now = new Date();
  const range = { from: p.from?.toISOString().slice(0, 10) ?? null, to: p.to?.toISOString().slice(0, 10) ?? null };

  // ── یک ماژول ───────────────────────────────────────────────────────
  if (p.target !== "all") {
    const table = await buildTable(p.target, userId, q);
    if (p.format === "csv") {
      return download(toCsv(table.columns, table.rows), "text/csv", exportFileName(p.target, "csv", now));
    }
    return download(
      JSON.stringify({ app: "arion", module: p.target, exportedAt: now.toISOString(), range, count: table.rows.length, rows: table.rows }, null, 2),
      "application/json", exportFileName(p.target, "json", now),
    );
  }

  // ── همه‌ی داده‌ها (JSON) ───────────────────────────────────────────
  const access = isSuperAdmin
    ? null
    : await prisma.moduleAccess.findMany({ where: { userId, active: true }, select: { module: true, expiresAt: true } });
  const live = new Set((access ?? []).filter((a) => !a.expiresAt || a.expiresAt.getTime() > now.getTime()).map((a) => a.module as string));
  const allowed: ExportModule[] = [];
  for (const m of EXPORT_MODULES) {
    const meta = EXPORT_META[m];
    if (meta.moduleKey && !isSuperAdmin && !live.has(meta.moduleKey)) continue;
    if (!(await isFeatureEnabled(meta.feature, userId))) continue;
    allowed.push(m);
  }
  const tables = await Promise.all(allowed.map((m) => buildTable(m, userId, q)));
  const extras = await buildProfileExtras(userId, allowed.includes("trade"), allowed.includes("exercise"));
  const modules: Record<string, unknown> = {};
  allowed.forEach((m, i) => { modules[m] = { count: tables[i].rows.length, rows: tables[i].rows }; });

  return download(
    JSON.stringify({
      app: "arion", version: 1, exportedAt: now.toISOString(), range,
      note: "Chart images, passwords, tokens and encrypted mentor chats are not included.",
      ...extras, modules,
    }, null, 2),
    "application/json", exportFileName("all", "json", now),
  );
}
