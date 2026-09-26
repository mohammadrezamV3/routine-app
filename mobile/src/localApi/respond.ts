// ساختِ پاسخ‌های localApi — همون شکلِ NextResponse.json ِ روت‌های وب
// (Content-Type: application/json، بدنه‌ی JSON، status). کدِ وب فقط
// res.ok / res.status / res.json() رو می‌خونه، پس یک Responseِ واقعی کافیه.

export const OFFLINE_ERROR = "اتصال اینترنت برقرار نیست";
export const TIMEOUT_ERROR = "سرور دیر جواب داد — دوباره امتحان کن";
export const MODULE_LOCKED_ERROR = "این بخش نیاز به اشتراک فعال دارد";

export function json(data: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...(extraHeaders ?? {}) },
  });
}

/** همون پاسخِ getRequestUserِ ردشده در روت‌های وب */
export const unauthorized = () => json({ error: "unauthorized" }, 401);

/** همون پاسخِ requireModule برای ماژولِ قفل (lib/moduleAccess.ts) */
export const moduleLocked = () => json({ error: MODULE_LOCKED_ERROR }, 403);

/** فورواردِ آنلاین وقتی شبکه نیست */
export const offline = () => json({ error: OFFLINE_ERROR }, 503);

export const timedOut = () => json({ error: TIMEOUT_ERROR }, 504);

/** مسیری که در اپ معنایی نداره (N/A) — مثلا /api/bootstrap */
export const notAvailable = () => json({ error: "not available in app" }, 404);

/** Response از متن + هدرهای ذخیره‌شده (کش) */
export function fromStored(status: number, body: string, contentType: string | null, extraHeaders?: Record<string, string>): Response {
  const headers: Record<string, string> = { ...(extraHeaders ?? {}) };
  if (contentType) headers["Content-Type"] = contentType;
  return new Response(status === 204 || status === 304 ? null : body, { status, headers });
}
