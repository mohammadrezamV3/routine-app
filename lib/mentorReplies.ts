import type { MentorSavedReply } from "@prisma/client";
import { tr } from "@/lib/i18n";

// پاسخ آماده‌ی منتور — اعتبارسنجی و شکل پاسخ. فقط ذخیره‌ی متن است؛ درج در
// گفت‌وگو (و هر رمزنگاری‌ای) سمت کلاینت و بیرون از این ماژول انجام می‌شود.

export const REPLY_TITLE_MAX = 40;
export const REPLY_BODY_MAX = 2000; // هم‌اندازه‌ی سقف پیام گفت‌وگو
export const MAX_REPLIES_PER_MENTOR = 50;

export type SavedReplyRow = { id: string; title: string; body: string; createdAt: Date; updatedAt: Date };

export function toReplyRow(r: MentorSavedReply): SavedReplyRow {
  return { id: r.id, title: r.title, body: r.body, createdAt: r.createdAt, updatedAt: r.updatedAt };
}

export function validateReply(b: any, partial = false): { ok: true; data: { title?: string; body?: string } } | { ok: false; error: string } {
  if (!b || typeof b !== "object") return { ok: false, error: tr("بدنه‌ی درخواست معتبر نیست", "Invalid request") };
  const out: { title?: string; body?: string } = {};
  if (b.title !== undefined || !partial) {
    if (typeof b.title !== "string") return { ok: false, error: tr("عنوان لازم است", "A title is required") };
    const t = b.title.replace(/\s+/g, " ").trim();
    if (!t) return { ok: false, error: tr("عنوان لازم است", "A title is required") };
    if (t.length > REPLY_TITLE_MAX) return { ok: false, error: tr(`عنوان حداکثر ${REPLY_TITLE_MAX} نویسه است`, `Title can be at most ${REPLY_TITLE_MAX} characters`) };
    out.title = t;
  }
  if (b.body !== undefined || !partial) {
    if (typeof b.body !== "string") return { ok: false, error: tr("متن پاسخ لازم است", "Reply text is required") };
    const body = b.body.trim();
    if (!body) return { ok: false, error: tr("متن پاسخ لازم است", "Reply text is required") };
    if (body.length > REPLY_BODY_MAX) return { ok: false, error: tr(`متن پاسخ حداکثر ${REPLY_BODY_MAX} نویسه است`, `Reply text can be at most ${REPLY_BODY_MAX} characters`) };
    out.body = body;
  }
  if (partial && out.title === undefined && out.body === undefined) return { ok: false, error: tr("تغییری فرستاده نشده", "No changes were sent") };
  return { ok: true, data: out };
}
