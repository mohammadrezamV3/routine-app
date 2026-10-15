import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { writeAuditLog } from "@/lib/adminAnalytics";
import { invalidateAppSettingsCache } from "@/lib/appSettings";
import { EVENT_THEMES, eventThemeById } from "@/lib/eventThemes";
import { EVENT_THEME_KEY, buildReleaseState, eventTimeline, resolveActiveEventTheme } from "@/lib/eventThemeState";
import { getEventThemeState, setEventThemeState } from "@/lib/eventThemeServer";
import { prisma } from "@/lib/prisma";
import { EVENT_DISCOUNT_KEY, eventDiscountSchedule } from "@/lib/eventDiscount";
import { ensureEventDiscounts, getEventDiscountState, setEventDiscountState } from "@/lib/eventDiscountServer";
import { tr } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type DiscountStatus = "pending" | "active" | "stopped" | "expired" | "deleted";

// برنامه‌ی کدهای مناسبت‌ها + وضعیت هر کد در دیتابیس
async function discountSnapshot(now: Date) {
  const ds = await getEventDiscountState();
  const items = eventDiscountSchedule(ds, EVENT_THEMES, now, 8);
  const codes = items.map((i) => i.generatedCode).filter((c): c is string => !!c);
  const rows = codes.length
    ? await prisma.discountCode.findMany({ where: { code: { in: codes } }, select: { code: true, active: true, expiresAt: true } })
    : [];
  const byCode = new Map(rows.map((r) => [r.code, r]));
  const schedule = items.map((i) => {
    let status: DiscountStatus = "pending";
    if (i.generatedCode) {
      const row = byCode.get(i.generatedCode);
      if (!row) status = "deleted";
      else if (row.expiresAt && row.expiresAt <= now) status = "expired";
      else status = row.active ? "active" : "stopped";
    }
    return { ...i, status };
  });
  return { enabled: ds.enabled, percent: ds.percent, schedule };
}

async function snapshot() {
  const now = new Date();
  const state = await getEventThemeState();
  return {
    discount: await discountSnapshot(now),
    state,
    activeId: resolveActiveEventTheme(state, now, EVENT_THEMES),
    catalog: EVENT_THEMES,
    timeline: eventTimeline(EVENT_THEMES, now, 24),
  };
}

export async function GET() {
  const guard = await requireAdmin("settings");
  if (!guard.ok) return guard.response;
  invalidateAppSettingsCache();
  await ensureEventDiscounts({ force: true });
  return NextResponse.json(await snapshot());
}

// POST { action: "release", id } | { action: "reset" } | { action: "discount_enabled", enabled }
// | { action: "discount_set_active", key, active } | { action: "discount_delete", key }
export async function POST(req: NextRequest) {
  const guard = await requireAdmin("settings");
  if (!guard.ok) return guard.response;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: tr("ورودی نامعتبر است", "Invalid input") }, { status: 400 });

  invalidateAppSettingsCache();
  const before = await getEventThemeState();

  if (body.action === "discount_enabled") {
    if (typeof body.enabled !== "boolean") return NextResponse.json({ error: tr("ورودی نامعتبر است", "Invalid input") }, { status: 400 });
    const ds = await getEventDiscountState();
    await setEventDiscountState({ ...ds, enabled: body.enabled });
    await writeAuditLog(guard.userId, "setting.event_discount", "AppSetting", EVENT_DISCOUNT_KEY, {
      action: "enabled", from: ds.enabled, to: body.enabled,
    });
    if (body.enabled) await ensureEventDiscounts({ force: true });
  } else if (body.action === "discount_set_active" || body.action === "discount_delete") {
    // دست‌زدن به خود کد، علاوه بر تنظیمات به دسترسی «کدهای تخفیف» هم نیاز داره
    const dGuard = await requireAdmin("discounts");
    if (!dGuard.ok) return dGuard.response;
    const key = typeof body.key === "string" ? body.key : "";
    const ds = await getEventDiscountState();
    const code = Object.prototype.hasOwnProperty.call(ds.generated, key) ? ds.generated[key] : null;
    if (!code) return NextResponse.json({ error: tr("کد این مناسبت پیدا نشد", "No code found for this event") }, { status: 404 });
    const row = await prisma.discountCode.findUnique({ where: { code }, select: { id: true } });
    if (body.action === "discount_set_active") {
      if (typeof body.active !== "boolean") return NextResponse.json({ error: tr("ورودی نامعتبر است", "Invalid input") }, { status: 400 });
      if (!row) return NextResponse.json({ error: tr("کد پیدا نشد (قبلا حذف شده)", "Code not found (already deleted)") }, { status: 404 });
      await prisma.discountCode.update({ where: { id: row.id }, data: { active: body.active } });
      await writeAuditLog(guard.userId, "setting.event_discount", "DiscountCode", row.id, { action: "set_active", key, code, active: body.active });
    } else {
      // کلید از generated پاک نمی‌شه تا این وقوع دیگه هیچ‌وقت دوباره ساخته نشه
      if (row) {
        await prisma.$transaction([
          prisma.discountCodeUsage.deleteMany({ where: { discountCodeId: row.id } }),
          prisma.discountCode.delete({ where: { id: row.id } }),
        ]);
      }
      await writeAuditLog(guard.userId, "setting.event_discount", "DiscountCode", row?.id ?? key, { action: "delete", key, code });
    }
  } else if (body.action === "release") {
    const theme = eventThemeById(typeof body.id === "string" ? body.id : null);
    if (!theme) return NextResponse.json({ error: tr("تم پیدا نشد", "Theme not found") }, { status: 404 });
    const next = buildReleaseState(theme, new Date());
    await setEventThemeState(next);
    await writeAuditLog(guard.userId, "setting.event_theme", "AppSetting", EVENT_THEME_KEY, {
      action: "release", id: theme.id, from: before.active?.id ?? null, endsAt: next.active?.endsAt ?? null,
    });
  } else if (body.action === "reset") {
    await setEventThemeState({ active: null });
    await writeAuditLog(guard.userId, "setting.event_theme", "AppSetting", EVENT_THEME_KEY, {
      action: "reset", from: before.active?.id ?? null,
    });
  } else {
    return NextResponse.json({ error: tr("ورودی نامعتبر است", "Invalid input") }, { status: 400 });
  }

  invalidateAppSettingsCache();
  return NextResponse.json({ ok: true, ...(await snapshot()) });
}
