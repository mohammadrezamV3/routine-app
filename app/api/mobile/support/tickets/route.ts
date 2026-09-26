import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { readJsonBody } from "@/lib/validate";
import { getMobileUserId } from "@/lib/mobileAuth";
import { createTicket, listTickets } from "@/lib/mobileSupport";
import type { MobileTicketCreateResponse, MobileTicketsResponse } from "@/lib/mobileAccountContract";

// GET /api/mobile/support/tickets — تیکت‌های خودِ کاربر، تازه‌ترین اول
export async function GET(req: NextRequest) {
  const userId = await getMobileUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await checkRateLimit(`mobile-support-read:${userId}`, 120, 10 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد درخواست‌ها زیاد بود — کمی بعد دوباره امتحان کن" }, { status: 429 });
  }
  const body: MobileTicketsResponse = { tickets: await listTickets(userId) };
  return NextResponse.json(body, { headers: { "Cache-Control": "private, no-store" } });
}

// POST /api/mobile/support/tickets { subject, message }
export async function POST(req: NextRequest) {
  const userId = await getMobileUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = await readJsonBody(req, 16 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const r = await createTicket(userId, parsed.body ?? {});
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const body: MobileTicketCreateResponse = { ticket: r.body };
  return NextResponse.json(body, { status: 201 });
}
