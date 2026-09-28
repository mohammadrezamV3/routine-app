// اطلاعیه‌های سراسریِ اپ — اعتبارسنجیِ مشترکِ روت‌های ادمین + نوعِ پاسخِ عمومی.
// هیچ import سروری این‌جا نیست تا صفحه‌ی ادمین و NotificationPanel هم بتونن
// از همین سقف‌ها استفاده کنن. متن همیشه ساده‌ست و فقط به‌صورت text رندر می‌شه.

export const ANNOUNCEMENT_TITLE_MAX = 120;
export const ANNOUNCEMENT_BODY_MAX = 4000;
/** چندتا اطلاعیه‌ی فعال به کاربر نشون داده بشه */
export const ANNOUNCEMENT_PUBLIC_LIMIT = 20;
/** سقفِ idهای «خوانده‌شده» که در تنظیمِ کاربر نگه داشته می‌شه */
export const ANNOUNCEMENT_READ_KEEP = 100;

export type PublicAnnouncement = { id: string; title: string; body: string; createdAt: string };

export type AnnouncementInput = { title: string; body: string; active: boolean; expiresAt: Date | null };

/**
 * اعتبارسنجیِ ورودیِ ساخت/ویرایش. در حالتِ partial (PATCH) فیلدِ نفرستاده
 * دست نمی‌خوره. expiresAt: null/"" یعنی بدون انقضا.
 */
export function parseAnnouncementInput(
  raw: unknown,
  partial: boolean,
): { ok: true; data: Partial<AnnouncementInput> } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "درخواست نامعتبر است" };
  const b = raw as Record<string, unknown>;
  const data: Partial<AnnouncementInput> = {};

  if (!partial || b.title !== undefined) {
    const t = typeof b.title === "string" ? b.title.trim() : "";
    if (!t) return { ok: false, error: "عنوان لازمه" };
    if (t.length > ANNOUNCEMENT_TITLE_MAX) return { ok: false, error: `عنوان حداکثر ${ANNOUNCEMENT_TITLE_MAX} کاراکتر` };
    data.title = t;
  }
  if (!partial || b.body !== undefined) {
    const t = typeof b.body === "string" ? b.body.trim() : "";
    if (!t) return { ok: false, error: "متن اطلاعیه لازمه" };
    if (t.length > ANNOUNCEMENT_BODY_MAX) return { ok: false, error: `متن حداکثر ${ANNOUNCEMENT_BODY_MAX} کاراکتر` };
    data.body = t;
  }
  if (b.active !== undefined) {
    if (typeof b.active !== "boolean") return { ok: false, error: "وضعیت نامعتبر است" };
    data.active = b.active;
  } else if (!partial) {
    data.active = true;
  }
  if (b.expiresAt !== undefined) {
    if (b.expiresAt === null || b.expiresAt === "") {
      data.expiresAt = null;
    } else if (typeof b.expiresAt === "string") {
      const d = new Date(b.expiresAt);
      if (Number.isNaN(d.getTime())) return { ok: false, error: "تاریخ انقضا معتبر نیست" };
      if (d.getTime() <= Date.now()) return { ok: false, error: "تاریخ انقضا باید در آینده باشد" };
      data.expiresAt = d;
    } else {
      return { ok: false, error: "تاریخ انقضا معتبر نیست" };
    }
  } else if (!partial) {
    data.expiresAt = null;
  }
  return { ok: true, data };
}
