import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { writeAuditLog } from "@/lib/adminAnalytics";
import { validateTeamMembers } from "@/lib/teamMembers";
import { getTeamMembers, setTeamMembers } from "@/lib/teamServer";
import { invalidateAppSettingsCache } from "@/lib/appSettings";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdmin("settings");
  if (!guard.ok) return guard.response;
  invalidateAppSettingsCache();
  return NextResponse.json({ members: await getTeamMembers() });
}

// PUT { members: TeamMember[] } — کل فهرست (به ترتیب نمایش) جایگزین می‌شه
export async function PUT(req: NextRequest) {
  const guard = await requireAdmin("settings");
  if (!guard.ok) return guard.response;
  const body = await req.json().catch(() => null);
  const v = validateTeamMembers(body?.members);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  invalidateAppSettingsCache();
  const before = await getTeamMembers();
  await setTeamMembers(v.members);
  // عکس‌ها داخل لاگ نمی‌رن (حجم)
  const brief = (l: { id: string; name: string; role: string }[]) => l.map((m) => ({ id: m.id, name: m.name, role: m.role }));
  await writeAuditLog(guard.userId, "setting.team_members", "AppSetting", "team_members", { before: brief(before), after: brief(v.members) });
  return NextResponse.json({ members: v.members });
}
