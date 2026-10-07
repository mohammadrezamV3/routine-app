import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { adminErrorResponse, sendUserMessage } from "@/lib/adminUsers";

// POST { title, body, url? } — اعلان درون‌برنامه‌ای (زنگوله) به همین کاربر
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin("users.edit");
  if (!guard.ok) return guard.response;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "ورودی نامعتبر است" }, { status: 400 });
  try {
    await sendUserMessage(guard, params.id, body);
    return NextResponse.json({ ok: true });
  } catch (e) { return adminErrorResponse(e); }
}
