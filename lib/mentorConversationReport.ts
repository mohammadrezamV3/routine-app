import { prisma } from "@/lib/prisma";
import { verifyCommitment } from "@/lib/e2ee/core";
import { openAtRest, sealAtRest, verifyServerFrankingTag } from "@/lib/e2ee/server";
import { REPORTED_TEXT_MAX } from "@/lib/e2ee/reportServer";

// «گزارش گفت‌وگو» (مهاجرت 20260928101000_mentor_chat_history).
//
// کلاینت گزارش‌دهنده پیام‌هایی را که انتخاب کرده (پیش‌فرض آخرین‌ها، حداکثر ۵۰)
// با متن و کلید فرانکینگ هر کدام می‌فرستد. هر پیام *جداگانه* دقیقا مثل گزارش
// تکی تایید می‌شود (docs/mentor-e2ee.md §۶): برچسب سرور روی تعهد + HMAC(fk, متن).
// کافی است یکی نخواند تا کل گزارش رد شود — گزارش‌دهنده نمی‌تواند متنی را که
// فرستاده نشده، حتی لای پیام‌های واقعی، به کسی نسبت دهد.
//
// تفاوت با گزارش تکی: پیام‌های خود گزارش‌دهنده هم پذیرفته می‌شوند (برای زمینه)؛
// او هر دو کلید جهت‌دار را دارد و متن خودش را افشا می‌کند. تعهد همان‌قدر
// محکم است، پس متن پیام خودش را هم نمی‌تواند عوض کند.
// پیام قدیمی پیش از رمزگذاری: متن از خود سرور (legacyBody) برداشته می‌شود،
// نه از کلاینت، و «تاییدنشده» علامت می‌خورد.

export const CONVERSATION_REPORT_MAX = 50;

export type ConversationReportItem = { id: string; text?: unknown; frankingKey?: unknown };
export type VerifiedConversationMessage = { messageId: string; senderId: string; text: string; messageAt: Date; verified: boolean };

export function reportMessageAad(reportId: string, messageId: string): string[] {
  return ["MentorReportMessage.text", reportId, messageId];
}

export function sealReportMessage(text: string, reportId: string, messageId: string): string {
  return sealAtRest(text, reportMessageAad(reportId, messageId));
}

export function openReportMessage(v: string | null, reportId: string, messageId: string): string | null {
  return openAtRest(v, reportMessageAad(reportId, messageId));
}

/**
 * پیام‌های پیوست را تایید می‌کند. پیش‌فرض: روت قبلا عضویت گزارش‌دهنده در
 * این رابطه را چک کرده. `visibleAfter` = مهر «پاک‌شده تا»ی گزارش‌دهنده؛
 * پیامی که برای او پاک شده پذیرفته نمی‌شود.
 */
export async function verifyConversationMessages(
  mentorshipId: string,
  input: unknown,
  visibleAfter: Date | null
): Promise<{ ok: true; messages: VerifiedConversationMessage[] } | { ok: false; error: string; messageId?: string }> {
  if (!Array.isArray(input) || input.length === 0) return { ok: false, error: "حداقل یک پیام برای گزارش انتخاب کن" };
  if (input.length > CONVERSATION_REPORT_MAX) return { ok: false, error: `حداکثر ${CONVERSATION_REPORT_MAX} پیام را می‌توانی پیوست کنی` };

  const items = input as ConversationReportItem[];
  const ids: string[] = [];
  for (const it of items) {
    if (!it || typeof it !== "object" || typeof it.id !== "string" || !it.id || it.id.length > 64) {
      return { ok: false, error: "پیام نامعتبر است" };
    }
    if (ids.includes(it.id)) return { ok: false, error: "پیام تکراری است", messageId: it.id };
    ids.push(it.id);
  }

  const rows = await prisma.mentorMessage.findMany({
    where: { id: { in: ids }, mentorshipId, ...(visibleAfter ? { createdAt: { gt: visibleAfter } } : {}) },
    select: { id: true, mentorshipId: true, senderId: true, createdAt: true, legacyBody: true, clientId: true, commitment: true, serverTag: true },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));

  const out: VerifiedConversationMessage[] = [];
  for (const it of items) {
    const msg = byId.get(it.id);
    if (!msg) return { ok: false, error: "پیام پیدا نشد", messageId: it.id };

    if (msg.legacyBody != null) {
      out.push({ messageId: msg.id, senderId: msg.senderId, text: msg.legacyBody.slice(0, REPORTED_TEXT_MAX), messageAt: msg.createdAt, verified: false });
      continue;
    }
    if (typeof it.text !== "string" || typeof it.frankingKey !== "string" || it.text.length > REPORTED_TEXT_MAX * 2) {
      return { ok: false, error: "متن و کلید تایید هر پیام لازم است", messageId: it.id };
    }
    if (!msg.clientId || !msg.commitment) return { ok: false, error: "این پیام قابل تایید نیست", messageId: it.id };
    const ctx = { mentorshipId: msg.mentorshipId, senderId: msg.senderId, clientId: msg.clientId };
    if (!verifyServerFrankingTag(msg.serverTag, { ...ctx, commitment: msg.commitment, createdAt: msg.createdAt })) {
      return { ok: false, error: "این پیام قابل تایید نیست", messageId: it.id };
    }
    if (!(await verifyCommitment(it.frankingKey, msg.commitment, ctx, it.text))) {
      return { ok: false, error: "متن گزارش با پیام ثبت‌شده نمی‌خواند", messageId: it.id };
    }
    out.push({ messageId: msg.id, senderId: msg.senderId, text: it.text, messageAt: msg.createdAt, verified: true });
  }
  // ترتیب زمانی برای ادمین، مستقل از ترتیب ارسال کلاینت
  out.sort((a, b) => a.messageAt.getTime() - b.messageAt.getTime() || (a.messageId < b.messageId ? -1 : 1));
  return { ok: true, messages: out };
}
