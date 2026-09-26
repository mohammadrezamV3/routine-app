// تایپ‌های مشترکِ localApi
export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/** ورودیِ هندلرِ محلی — Requestِ استانداردِ وب (همون چیزی که روتِ Next می‌گیره) */
export type LocalCtx = {
  req: Request;
  url: URL;
  /** پارامترهای مسیر (`:key` ← مقدارِ decodeشده، مثلِ params ِ Next) */
  params: Record<string, string>;
};

export type LocalHandler = (ctx: LocalCtx) => Promise<Response>;
