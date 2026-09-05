import { NextRequest, NextResponse } from "next/server";
import { ModuleKey, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { checkRateLimit } from "@/lib/rateLimit";
import { clampText } from "@/lib/validate";
import {
  CHAT_PAGE_SIZE, CHAT_RATE_LIMIT, CHAT_RATE_WINDOW_MS, CHAT_RETENTION_LIMIT, ChatMessageDto,
  ChatViewerModeration, MAX_CHAT_BODY, normalizeRoomSymbol,
} from "@/lib/tradeChat";

// اتاقِ گفت‌وگوی هر نماد. برخلافِ بقیه‌ی روت‌های ترید که داده‌ی خصوصیِ یک
// کاربرند، این‌جا داده عمومی است — پس قاعده‌ی `where:{id, userId}` این‌جا
// معنا ندارد و به‌جایش این‌ها را داریم:
//   • خواندن و نوشتن هر دو پشتِ ماژولِ TRADE قفل است.
//   • نوشتن سقفِ نرخ دارد (اسپم).
//   • حذف فقط برای نویسنده یا ادمین، و «نرم» است تا گزارش‌ها خالی نشوند.

const MESSAGE_SELECT = {
  id: true, symbol: true, body: true, createdAt: true, userId: true,
  user: { select: { name: true, username: true } },
} as const;

type MessageRow = Prisma.TradeChatMessageGetPayload<{ select: typeof MESSAGE_SELECT }>;

const MODERATION_SELECT = {
  chatBanUntil: true, chatDisabled: true, chatWarnAt: true, chatWarnNote: true, chatWarnSeenAt: true,
} as const;

function moderationState(
  u: Prisma.UserGetPayload<{ select: typeof MODERATION_SELECT }> | null,
  isSuperAdmin: boolean
): ChatViewerModeration {
  if (!u || isSuperAdmin) return { canSend: true, bannedUntil: null, disabled: false, warning: null };

  const bannedUntil = u.chatBanUntil && u.chatBanUntil.getTime() > Date.now() ? u.chatBanUntil.toISOString() : null;
  const disabled = u.chatDisabled;
  const warning = u.chatWarnAt && (!u.chatWarnSeenAt || u.chatWarnSeenAt < u.chatWarnAt)
    ? { note: u.chatWarnNote, at: u.chatWarnAt.toISOString() }
    : null;

  return { canSend: !bannedUntil && !disabled, bannedUntil, disabled, warning };
}

function serialize(m: MessageRow, viewerId: string, reportedIds: Set<string>): ChatMessageDto {
  return {
    id: m.id,
    symbol: m.symbol,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
    authorId: m.userId,
    // نامِ نمایشی؛ اگر کاربر نام نگذاشته باشد یوزرنیم را نشان می‌دهیم.
    // ایمیل/شماره هیچ‌وقت در پاسخِ عمومی نمی‌آید.
    authorName: m.user.name?.trim() || m.user.username || "کاربر",
    mine: m.userId === viewerId,
    reported: reportedIds.has(m.id),
  };
}

// GET /api/trade/chat?symbol=EURUSD[&since=<iso>]
// `since` برای پولینگ است: فقط پیام‌های جدیدتر برمی‌گردند، نه کلِ اتاق.
export async function GET(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;

  const symbol = normalizeRoomSymbol(req.nextUrl.searchParams.get("symbol"));
  if (!symbol) return NextResponse.json({ error: "نماد نامعتبر است" }, { status: 400 });

  const sinceRaw = req.nextUrl.searchParams.get("since");
  const since = sinceRaw ? new Date(sinceRaw) : null;
  const validSince = since && !isNaN(since.getTime()) ? since : null;

  const rows = await prisma.tradeChatMessage.findMany({
    where: {
      symbol,
      deletedAt: null,
      ...(validSince ? { createdAt: { gt: validSince } } : {}),
    },
    // تازه‌ترین‌ها را می‌گیریم و بعد برمی‌گردانیم، چون بدونِ desc در
    // اتاقِ شلوغ همیشه قدیمی‌ترین‌ها را می‌گرفتیم نه آخرین‌ها.
    orderBy: { createdAt: "desc" },
    take: CHAT_PAGE_SIZE,
    select: MESSAGE_SELECT,
  });
  rows.reverse();

  // کدام‌یک را همین کاربر قبلاً گزارش کرده — تا دکمه‌ی گزارش دوباره فعال نباشد
  const reported = rows.length
    ? await prisma.tradeChatReport.findMany({
        where: { reporterId: guard.userId, messageId: { in: rows.map((r) => r.id) } },
        select: { messageId: true },
      })
    : [];
  const reportedIds = new Set(reported.map((r) => r.messageId));

  const viewer = await prisma.user.findUnique({ where: { id: guard.userId }, select: MODERATION_SELECT });

  return NextResponse.json({
    symbol,
    messages: rows.map((m) => serialize(m, guard.userId, reportedIds)),
    moderation: moderationState(viewer, guard.isSuperAdmin),
  });
}

// POST /api/trade/chat  { symbol, body }
export async function POST(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;

  const payload = await req.json().catch(() => null);
  const symbol = normalizeRoomSymbol(payload?.symbol);
  if (!symbol) return NextResponse.json({ error: "نماد نامعتبر است" }, { status: 400 });

  const body = clampText(String(payload?.body ?? "").trim(), MAX_CHAT_BODY);
  if (!body) return NextResponse.json({ error: "متن پیام خالی است" }, { status: 400 });

  if (!guard.isSuperAdmin) {
    const viewer = await prisma.user.findUnique({ where: { id: guard.userId }, select: MODERATION_SELECT });
    const state = moderationState(viewer, false);
    if (state.disabled) {
      return NextResponse.json({ error: "دسترسیِ تو به این گفت‌وگو توسط مدیریت غیرفعال شده است" }, { status: 403 });
    }
    if (state.bannedUntil) {
      const until = new Date(state.bannedUntil).toLocaleString("fa-IR", { timeZone: "Asia/Tehran" });
      return NextResponse.json({ error: `به‌دلیل تخلف تا ${until} از ارسال پیام محروم شده‌ای` }, { status: 403 });
    }
  }

  // سقفِ نرخ روی کاربر است نه IP: کاربر شناخته‌شده است و بستنِ IP در
  // شبکه‌های اشتراکی بی‌گناه‌ها را هم می‌گیرد.
  if (!(await checkRateLimit(`chat:${guard.userId}`, CHAT_RATE_LIMIT, CHAT_RATE_WINDOW_MS))) {
    return NextResponse.json(
      { error: "کمی آرام‌تر — چند لحظه صبر کن و دوباره بفرست" },
      { status: 429 }
    );
  }

  const created = await prisma.tradeChatMessage.create({
    data: { symbol, userId: guard.userId, body },
    select: MESSAGE_SELECT,
  });

  // نگه‌داری فقط ۲۰۰ پیامِ آخرِ همین اتاق — طبقِ درخواستِ صریح، قدیمی‌ترها
  // نه فقط از نمایش بلکه از دیتابیس هم واقعاً پاک می‌شوند (سیو نمی‌شوند).
  // این کوئری روی هر پیامِ تازه اجرا می‌شود؛ برای حجمِ چتِ یک اتاق (چندتا
  // پیام در دقیقه) این هزینه ناچیز است، پس صف/کرانِ جداگانه لازم نیست.
  const surplus = await prisma.tradeChatMessage.findMany({
    where: { symbol },
    orderBy: { createdAt: "desc" },
    skip: CHAT_RETENTION_LIMIT,
    take: 50,
    select: { id: true },
  });
  if (surplus.length) {
    await prisma.tradeChatMessage.deleteMany({ where: { id: { in: surplus.map((m) => m.id) } } });
  }

  return NextResponse.json({ message: serialize(created, guard.userId, new Set()) }, { status: 201 });
}

// DELETE /api/trade/chat?id=...
// حذفِ نرم. نویسنده پیامِ خودش را، و ادمین هر پیامی را می‌تواند بردارد.
export async function DELETE(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "شناسه پیام لازم است" }, { status: 400 });

  const existing = await prisma.tradeChatMessage.findUnique({
    where: { id },
    select: { userId: true, deletedAt: true },
  });
  if (!existing || existing.deletedAt) {
    return NextResponse.json({ error: "پیام پیدا نشد" }, { status: 404 });
  }
  if (existing.userId !== guard.userId && !guard.isSuperAdmin) {
    return NextResponse.json({ error: "اجازه‌ی حذف این پیام را نداری" }, { status: 403 });
  }

  await prisma.tradeChatMessage.update({
    where: { id },
    data: { deletedAt: new Date(), deletedBy: guard.userId },
  });
  return NextResponse.json({ ok: true });
}
