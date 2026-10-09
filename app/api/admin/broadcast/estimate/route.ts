import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { parseSegment } from "@/lib/broadcast";
import { estimateRecipients } from "@/lib/broadcastServer";
import { tr } from "@/lib/i18n";

// POST { segment } → { total, withPush } — تخمین گیرنده‌ها قبل از ارسال
export async function POST(req: NextRequest) {
  const guard = await requireAdmin("content");
  if (!guard.ok) return guard.response;
  const body = await req.json().catch(() => null);
  const seg = parseSegment(body?.segment);
  if (!seg) return NextResponse.json({ error: tr("مخاطب نامعتبر است", "Invalid audience") }, { status: 400 });
  return NextResponse.json(await estimateRecipients(seg));
}
