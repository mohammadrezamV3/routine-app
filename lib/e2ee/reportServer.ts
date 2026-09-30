import { prisma } from "@/lib/prisma";
import { verifyCommitment } from "./core";
import { openAtRest, sealAtRest, verifyServerFrankingTag } from "./server";

// گزارشِ پیامِ رمزشده با «فرانکینگ» (الگوی Messenger):
//   فرستنده هنگامِ ارسال تعهد = HMAC(fk, زمینه‖متن) را کنارِ متنِ رمزشده می‌فرستد و
//   fk را *داخلِ* متنِ رمزشده می‌گذارد؛ سرور تعهد را با برچسبِ خودش (فرستنده‌ی
//   احرازشده + زمان) مهر می‌کند. گیرنده برای گزارش متن و fk را می‌فرستد؛ سرور
//   (۱) برچسبِ خودش و (۲) تعهد را چک می‌کند. تنها در این صورت متنِ *همان یک پیام*
//   (رمزشده در حالِ سکون) در گزارش ذخیره می‌شود. گزارشِ جعلی (متنی که فرستنده
//   نفرستاده) با احتمالِ ناچیز پذیرفته می‌شود.

export const REPORTED_TEXT_MAX = 2000;

export type MessageReportEvidence = { reportedText: string; reportedMessageAt: Date; reportVerified: boolean };

export function reportedTextAad(messageId: string, reporterId: string): string[] {
  return ["MentorReport.reportedText", messageId, reporterId];
}

/**
 * مدرکِ گزارشِ یک پیام — یا خطا. پیش‌فرض: resolveTargetOwner قبلا تایید کرده
 * که پیام در گفت‌وگوی گزارش‌دهنده است و از طرفِ مقابل آمده.
 */
export async function verifyMessageReport(
  messageId: string,
  reporterId: string,
  franking: unknown
): Promise<{ ok: true; evidence: MessageReportEvidence } | { ok: false; error: string }> {
  const msg = await prisma.mentorMessage.findFirst({
    where: { id: messageId, senderId: { not: reporterId }, mentorship: { OR: [{ mentorId: reporterId }, { studentId: reporterId }] } },
    select: { mentorshipId: true, senderId: true, createdAt: true, legacyBody: true, clientId: true, commitment: true, serverTag: true },
  });
  if (!msg) return { ok: false, error: "پیام پیدا نشد" };

  // پیامِ قدیمیِ پیش از رمزگذاری: متنش روی سرور هست؛ تاییدِ رمزنگاری ندارد
  if (msg.legacyBody != null) {
    return { ok: true, evidence: { reportedText: msg.legacyBody.slice(0, REPORTED_TEXT_MAX), reportedMessageAt: msg.createdAt, reportVerified: false } };
  }

  const f = franking as { text?: unknown; frankingKey?: unknown } | null | undefined;
  if (!f || typeof f.text !== "string" || typeof f.frankingKey !== "string" || f.text.length > REPORTED_TEXT_MAX * 2) {
    return { ok: false, error: "برای گزارش پیام رمزگذاری‌شده، متن و کلید تایید پیام لازم است" };
  }
  if (!msg.clientId || !msg.commitment) return { ok: false, error: "این پیام قابل تایید نیست" };
  const ctx = { mentorshipId: msg.mentorshipId, senderId: msg.senderId, clientId: msg.clientId };
  if (!verifyServerFrankingTag(msg.serverTag, { ...ctx, commitment: msg.commitment, createdAt: msg.createdAt })) {
    return { ok: false, error: "این پیام قابل تایید نیست" };
  }
  if (!(await verifyCommitment(f.frankingKey, msg.commitment, ctx, f.text))) {
    return { ok: false, error: "متن گزارش با پیام ثبت‌شده نمی‌خواند" };
  }
  return { ok: true, evidence: { reportedText: f.text, reportedMessageAt: msg.createdAt, reportVerified: true } };
}

export function sealReportedText(text: string, messageId: string, reporterId: string): string {
  return sealAtRest(text, reportedTextAad(messageId, reporterId));
}

export function openReportedText(v: string | null, messageId: string, reporterId: string): string | null {
  return openAtRest(v, reportedTextAad(messageId, reporterId));
}
