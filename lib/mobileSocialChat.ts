// هسته‌ی مشترکِ چتِ نماد — روت‌های وب (app/api/trade/chat/*) و موبایل
// (app/api/mobile/social/chat/*) هر دو فقط این توابع رو صدا می‌زنن.
//
// اتاقِ هر نماد داده‌ی عمومیه، پس قاعده‌ی `where:{id, userId}` این‌جا به این
// شکل درمیاد:
//   • خواندن و نوشتن هر دو پشتِ ماژولِ TRADE (گیت در خودِ روت‌ها).
//   • نوشتن: بن/غیرفعال‌سازی (بجز سوپریوزر) + سقفِ نرخ `chat:<userId>`
//     (۱۰ در دقیقه، مشترک بینِ وب و موبایل چون کلید یکیه).
//   • حذف فقط برای نویسنده یا ادمین، و «نرم» تا گزارش‌ها خالی نشن.
//   • گزارش: یک‌بار برای هر (پیام، گزارش‌دهنده)، سقفِ ۲۰ در ساعت، پیام
//     همون لحظه حذفِ نرم می‌شه.
import { Prisma, TradeChatReportReason } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { clampText } from "@/lib/validate";
import {
  CHAT_PAGE_SIZE, CHAT_RATE_LIMIT, CHAT_RATE_WINDOW_MS, CHAT_RETENTION_LIMIT, ChatMessageDto,
  ChatViewerModeration, MAX_CHAT_BODY, isChatReportReason, normalizeRoomSymbol,
} from "@/lib/tradeChat";
import { SETTING_KEYS } from "@/lib/userSettingKeys";
import type { CoreResult } from "@/lib/mobileSocialFriends";

const ok = <T>(body: T, status = 200): CoreResult<T> => ({ status, body });
const err = (status: number, error: string): CoreResult<{ error: string }> => ({ status, body: { error } });

export const CHAT_MESSAGE_SELECT = {
  id: true, symbol: true, body: true, createdAt: true, userId: true,
  user: { select: { name: true, username: true } },
} as const;

type MessageRow = Prisma.TradeChatMessageGetPayload<{ select: typeof CHAT_MESSAGE_SELECT }>;

const MODERATION_SELECT = {
  chatBanUntil: true, chatDisabled: true, chatWarnAt: true, chatWarnNote: true, chatWarnSeenAt: true,
} as const;

export function chatModerationState(
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

export function serializeChatMessage(m: MessageRow, viewerId: string, reportedIds: Set<string>): ChatMessageDto {
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

function parseDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

export async function getViewerModeration(userId: string, isSuperAdmin: boolean): Promise<ChatViewerModeration> {
  const viewer = await prisma.user.findUnique({ where: { id: userId }, select: MODERATION_SELECT });
  return chatModerationState(viewer, isSuperAdmin);
}

/**
 * پیام‌های یک اتاق (صعودی). `since` برای پولینگ (فقط جدیدترها)، `before`
 * برای صفحه‌بندیِ رو به عقب. `limit` حداکثر CHAT_PAGE_SIZE.
 */
export async function listChatMessages(
  viewerId: string,
  isSuperAdmin: boolean,
  opts: { symbol: unknown; since?: string | null; before?: string | null; limit?: number }
): Promise<CoreResult<{ error: string } | { symbol: string; messages: ChatMessageDto[]; moderation: ChatViewerModeration; hasMore: boolean }>> {
  const symbol = normalizeRoomSymbol(opts.symbol);
  if (!symbol) return err(400, "نماد نامعتبر است");

  const since = parseDate(opts.since);
  const before = parseDate(opts.before);
  const limit = Math.max(1, Math.min(CHAT_PAGE_SIZE, Math.floor(opts.limit ?? CHAT_PAGE_SIZE) || CHAT_PAGE_SIZE));

  const createdAt: Prisma.DateTimeFilter = {};
  if (since) createdAt.gt = since;
  if (before) createdAt.lt = before;

  const rows = await prisma.tradeChatMessage.findMany({
    where: { symbol, deletedAt: null, ...(since || before ? { createdAt } : {}) },
    // تازه‌ترین‌ها را می‌گیریم و بعد برمی‌گردانیم، چون بدونِ desc در
    // اتاقِ شلوغ همیشه قدیمی‌ترین‌ها را می‌گرفتیم نه آخرین‌ها.
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    select: CHAT_MESSAGE_SELECT,
  });
  const hasMore = rows.length > limit;
  if (hasMore) rows.length = limit;
  rows.reverse();

  // کدام‌یک را همین کاربر قبلاً گزارش کرده — تا دکمه‌ی گزارش دوباره فعال نباشد
  const reported = rows.length
    ? await prisma.tradeChatReport.findMany({
        where: { reporterId: viewerId, messageId: { in: rows.map((r) => r.id) } },
        select: { messageId: true },
      })
    : [];
  const reportedIds = new Set(reported.map((r) => r.messageId));

  return ok({
    symbol,
    messages: rows.map((m) => serializeChatMessage(m, viewerId, reportedIds)),
    moderation: await getViewerModeration(viewerId, isSuperAdmin),
    hasMore,
  });
}

/** ارسالِ پیام: بن/غیرفعال‌سازی → ۴۰۳، سقفِ نرخ → ۴۲۹، بعد نگه‌داریِ ۲۰۰تایی */
export async function sendChatMessage(userId: string, isSuperAdmin: boolean, payload: unknown): Promise<CoreResult> {
  const p = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const symbol = normalizeRoomSymbol(p.symbol);
  if (!symbol) return err(400, "نماد نامعتبر است");

  const body = clampText(String(p.body ?? "").trim(), MAX_CHAT_BODY);
  if (!body) return err(400, "متن پیام خالی است");

  if (!isSuperAdmin) {
    const state = await getViewerModeration(userId, false);
    if (state.disabled) return err(403, "دسترسیِ تو به این گفت‌وگو توسط مدیریت غیرفعال شده است");
    if (state.bannedUntil) {
      const until = new Date(state.bannedUntil).toLocaleString("fa-IR", { timeZone: "Asia/Tehran" });
      return err(403, `به‌دلیل تخلف تا ${until} از ارسال پیام محروم شده‌ای`);
    }
  }

  // سقفِ نرخ روی کاربر است نه IP: کاربر شناخته‌شده است و بستنِ IP در
  // شبکه‌های اشتراکی بی‌گناه‌ها را هم می‌گیرد.
  if (!(await checkRateLimit(`chat:${userId}`, CHAT_RATE_LIMIT, CHAT_RATE_WINDOW_MS))) {
    return err(429, "کمی آرام‌تر — چند لحظه صبر کن و دوباره بفرست");
  }

  const created = await prisma.tradeChatMessage.create({
    data: { symbol, userId, body },
    select: CHAT_MESSAGE_SELECT,
  });

  // نگه‌داری فقط ۲۰۰ پیامِ آخرِ همین اتاق — طبقِ درخواستِ صریح، قدیمی‌ترها
  // نه فقط از نمایش بلکه از دیتابیس هم واقعاً پاک می‌شوند (سیو نمی‌شوند).
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

  return ok({ message: serializeChatMessage(created, userId, new Set()) }, 201);
}

/** حذفِ نرم — نویسنده پیامِ خودش را، ادمین هر پیامی را */
export async function deleteChatMessage(userId: string, isSuperAdmin: boolean, id: unknown): Promise<CoreResult> {
  if (typeof id !== "string" || !id) return err(400, "شناسه پیام لازم است");

  const existing = await prisma.tradeChatMessage.findUnique({
    where: { id },
    select: { userId: true, deletedAt: true },
  });
  if (!existing || existing.deletedAt) return err(404, "پیام پیدا نشد");
  if (existing.userId !== userId && !isSuperAdmin) return err(403, "اجازه‌ی حذف این پیام را نداری");

  await prisma.tradeChatMessage.update({
    where: { id },
    data: { deletedAt: new Date(), deletedBy: userId },
  });
  return ok({ ok: true });
}

/**
 * گزارشِ یک پیام: پیام همان لحظه حذفِ نرم می‌شود و همه‌ی گزارش‌های بازش
 * ACTIONED. توضیحِ کامل در app/api/trade/chat/report/route.ts.
 */
export async function reportChatMessage(userId: string, payload: unknown): Promise<CoreResult> {
  const p = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const messageId = typeof p.messageId === "string" ? p.messageId : "";
  if (!messageId) return err(400, "شناسه پیام لازم است");
  if (!isChatReportReason(p.reason)) return err(400, "دلیل گزارش نامعتبر است");

  // سقفِ نرخ تا کسی نتواند با گزارشِ انبوه صف را غرق کند
  if (!(await checkRateLimit(`chat-report:${userId}`, 20, 60 * 60_000))) {
    return err(429, "تعداد گزارش‌هایت زیاد شده — بعداً دوباره تلاش کن");
  }

  const message = await prisma.tradeChatMessage.findUnique({
    where: { id: messageId },
    select: { id: true, userId: true, deletedAt: true },
  });
  if (!message || message.deletedAt) return err(404, "پیام پیدا نشد");
  if (message.userId === userId) return err(400, "نمی‌توانی پیام خودت را گزارش کنی");

  const note = clampText(String(p.note ?? "").trim(), 500) || null;
  const now = new Date();

  await prisma.$transaction([
    prisma.tradeChatReport.upsert({
      where: { messageId_reporterId: { messageId, reporterId: userId } },
      create: { messageId, reporterId: userId, reason: p.reason as TradeChatReportReason, note },
      update: {},
    }),
    prisma.tradeChatMessage.update({
      where: { id: messageId },
      data: { deletedAt: now, deletedBy: userId },
    }),
    prisma.tradeChatReport.updateMany({
      where: { messageId, status: "OPEN" },
      data: { status: "ACTIONED", reviewedAt: now, reviewedBy: null },
    }),
  ]);

  return ok({ ok: true });
}

/** کاربر اخطارِ فعلی‌اش را دیده */
export async function ackChatWarning(userId: string): Promise<CoreResult> {
  await prisma.user.update({ where: { id: userId }, data: { chatWarnSeenAt: new Date() } });
  return ok({ ok: true });
}

/** همان تنظیمی که SymbolChatPanelِ وب با setSetting می‌نویسد */
export async function getChatRulesAccepted(userId: string): Promise<boolean> {
  const row = await prisma.userSetting.findUnique({
    where: { userId_key: { userId, key: SETTING_KEYS.tradeChatRulesAccepted } },
    select: { value: true },
  });
  return row?.value === true;
}

export async function acceptChatRules(userId: string): Promise<CoreResult> {
  const key = SETTING_KEYS.tradeChatRulesAccepted;
  await prisma.userSetting.upsert({
    where: { userId_key: { userId, key } },
    create: { userId, key, value: true },
    update: { value: true },
  });
  return ok({ ok: true });
}
