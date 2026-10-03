import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { writeAuditLog } from "@/lib/adminAnalytics";
import { invalidateAppSettingsCache } from "@/lib/appSettings";
import { EVENT_THEMES, eventThemeById } from "@/lib/eventThemes";
import { EVENT_THEME_KEY, buildReleaseState, eventTimeline, resolveActiveEventTheme } from "@/lib/eventThemeState";
import { getEventThemeState, setEventThemeState } from "@/lib/eventThemeServer";

export const dynamic = "force-dynamic";

async function snapshot() {
  const now = new Date();
  const state = await getEventThemeState();
  return {
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
  return NextResponse.json(await snapshot());
}

// POST { action: "release", id } | { action: "reset" }
export async function POST(req: NextRequest) {
  const guard = await requireAdmin("settings");
  if (!guard.ok) return guard.response;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "ورودی نامعتبر است" }, { status: 400 });

  invalidateAppSettingsCache();
  const before = await getEventThemeState();

  if (body.action === "release") {
    const theme = eventThemeById(typeof body.id === "string" ? body.id : null);
    if (!theme) return NextResponse.json({ error: "تم پیدا نشد" }, { status: 404 });
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
    return NextResponse.json({ error: "ورودی نامعتبر است" }, { status: 400 });
  }

  invalidateAppSettingsCache();
  return NextResponse.json({ ok: true, ...(await snapshot()) });
}
