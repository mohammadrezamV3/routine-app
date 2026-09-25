import { NextRequest, NextResponse } from "next/server";
import { readJsonBody } from "@/lib/validate";
import { getMobileUserId } from "@/lib/mobileAuth";
import { replyToTicket } from "@/lib/mobileSupport";
import type { MobileTicketReplyResponse } from "@/lib/mobileAccountContract";

// POST /api/mobile/support/tickets/:id/messages { message } — تیکت دوباره OPEN می‌شه
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getMobileUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = await readJsonBody(req, 16 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const r = await replyToTicket(userId, params.id, parsed.body ?? {});
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const body: MobileTicketReplyResponse = r.body;
  return NextResponse.json(body, { status: 201 });
}
