import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { writeAuditLog } from "@/lib/adminAnalytics";
import { checkRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { parseBroadcastInput, canCancelBroadcast } from "@/lib/broadcast";
import { cancelBroadcast, createBroadcast, estimateRecipients, readBroadcasts, runBroadcast } from "@/lib/broadcastServer";

// دسترسی: «content» (کلید موجود برای اطلاعیه‌ها). متن پیام هیچ‌وقت در AuditLog ذخیره نمی‌شه، فقط شناسه/مخاطب/کانال.

export async function GET() {
  const guard = await requireAdmin("content");
  if (!guard.ok) return guard.response;
  const list = await readBroadcasts();
  return NextResponse.json({ broadcasts: list.map(({ cursor, leaseUntil, runs, ...pub }) => pub) });
}

// POST { title, body, url?, channels, segment, sendAt? }
export async function POST(req: NextRequest) {
  const guard = await requireAdmin("content");
  if (!guard.ok) return guard.response;
  if (!(await checkRateLimit(`broadcast:${guard.userId}`, 10, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد ارسال در یک ساعت از سقف گذشت؛ کمی بعد دوباره امتحان کن" }, { status: 429 });
  }
  const parsed = parseBroadcastInput(await req.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const me = await prisma.user.findUnique({ where: { id: guard.userId }, select: { name: true, lastName: true, username: true } });
  const name = me ? [me.name, me.lastName].filter(Boolean).join(" ").trim() || me.username || null : null;
  const rec = await createBroadcast(parsed.value, { id: guard.userId, name });
  const est = await estimateRecipients(rec.segment).catch(() => null);
  await writeAuditLog(guard.userId, "broadcast.create", "Broadcast", rec.id, {
    segment: rec.segment, channels: rec.channels, scheduled: !!parsed.value.sendAt, estimate: est?.total ?? null,
  });
  // ارسال فوری: تا سقف زمانی همین‌جا؛ باقی (کاربران زیاد) را زمان‌بند ادامه می‌دهد
  const after = parsed.value.sendAt ? rec : (await runBroadcast(rec.id, 20_000)) ?? rec;
  const { cursor, leaseUntil, runs, ...pub } = after;
  return NextResponse.json({ ok: true, broadcast: pub });
}

// DELETE ?id= — لغو پیام زمان‌بندی‌شده
export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin("content");
  if (!guard.ok) return guard.response;
  const id = new URL(req.url).searchParams.get("id") || "";
  const rec = (await readBroadcasts()).find((b) => b.id === id);
  if (!rec) return NextResponse.json({ error: "پیدا نشد" }, { status: 404 });
  if (!canCancelBroadcast(rec) || !(await cancelBroadcast(id))) {
    return NextResponse.json({ error: "فقط پیام‌های زمان‌بندی‌شده قابل لغو هستند" }, { status: 409 });
  }
  await writeAuditLog(guard.userId, "broadcast.cancel", "Broadcast", id);
  return NextResponse.json({ ok: true });
}
