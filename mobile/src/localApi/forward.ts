// فورواردِ درخواستِ کدِ وب به همون روتِ وب روی سرور (VITE_API_BASE_URL) —
// با ApiClientِ مشترک: Bearer، refreshِ single-flight، یک‌بار تکرار روی 401ِ
// نشست. بدنه دست‌نخورده می‌ره (FormData/Blob/رشته). سقفِ زمان ۲۰ ثانیه، و
// ۹۰ ثانیه برای روت‌های AI. خطاها به پاسخِ HTTP ترجمه می‌شن تا کدِ وب همون
// مسیرِ «res.ok نبود ← data.error» خودش رو بره:
//   شبکه ← 503 {error:"اتصال اینترنت برقرار نیست"} · timeout ← 504
//   نشستِ باطل ← 401 {error:"unauthorized"} (ApiClient خروجِ محلی رو اعلام کرده)
import { ApiError } from "@m/sync/apiClient";
import { AI_REQUEST_TIMEOUT_MS, REQUEST_TIMEOUT_MS } from "@m/sync/config";
import { invalidateCachedPrefix } from "./cache";
import { json, offline, timedOut, unauthorized } from "./respond";
import type { RouteDef } from "./router";
import { services } from "./services";

/** هدرهایی که هرگز از کدِ وب رد نمی‌شن (Bearer رو ApiClient می‌ذاره؛ کوکی در اپ نیست) */
const DROP_HEADERS = new Set(["authorization", "cookie", "host", "origin", "referer", "content-length"]);

export type OutgoingRequest = {
  method: string;
  headers: Record<string, string>;
  body: BodyInit | null;
  signal: AbortSignal | null;
};

/** ورودیِ fetch (string/URL/Request + init) → اجزای درخواستِ خروجی، بدنه دست‌نخورده */
export async function outgoingOf(input: RequestInfo | URL, init: RequestInit | undefined, method: string): Promise<OutgoingRequest> {
  const headers: Record<string, string> = {};
  const add = (h: HeadersInit | undefined) => {
    if (!h) return;
    new Headers(h).forEach((v, k) => {
      if (!DROP_HEADERS.has(k.toLowerCase())) headers[k.toLowerCase()] = v;
    });
  };
  const isReq = typeof Request !== "undefined" && input instanceof Request;
  if (isReq) add((input as Request).headers);
  add(init?.headers);

  let body: BodyInit | null = null;
  if (method !== "GET" && method !== "HEAD") {
    if (init && init.body !== undefined && init.body !== null) {
      // stream تکرارپذیر نیست (retryِ بعد از refresh) ← Blob
      body = typeof ReadableStream !== "undefined" && init.body instanceof ReadableStream ? await new Response(init.body).blob() : init.body;
    } else if (isReq && (input as Request).body) {
      body = await (input as Request).clone().blob();
    }
  }
  const signal = init?.signal ?? (isReq ? (input as Request).signal : null) ?? null;
  return { method, headers, body, signal };
}

export function errorResponse(err: unknown): Response {
  if (err instanceof ApiError) {
    switch (err.kind) {
      case "network":
        return offline();
      case "timeout":
        return timedOut();
      case "session_expired":
        return unauthorized();
      case "not_configured":
        return json({ error: "اتصال به سرور پیکربندی نشده" }, 503);
      default:
        return json({ error: err.serverMessage || "خطای سرور" }, err.status || 500);
    }
  }
  throw err; // AbortErrorِ خودِ کالر و خطاهای پیش‌بینی‌نشده — مثلِ fetch
}

/** "/api/account/avatar" ← "/api/account" (منبعی که mutation کهنه‌اش می‌کنه) */
export function resourcePrefix(pathname: string): string {
  const seg = pathname.split("/").filter(Boolean);
  return "/" + seg.slice(0, 2).join("/");
}

export async function forward(route: Pick<RouteDef, "public" | "ai"> | null, url: URL, req: OutgoingRequest): Promise<Response> {
  const { api } = services();
  try {
    const res = await api.forward(
      url.pathname + url.search,
      { method: req.method, headers: req.headers, body: req.body, signal: req.signal },
      { auth: route?.public ? "none" : "bearer", timeoutMs: route?.ai ? AI_REQUEST_TIMEOUT_MS : REQUEST_TIMEOUT_MS }
    );
    if (res.ok && req.method !== "GET" && req.method !== "HEAD") await invalidateCachedPrefix(resourcePrefix(url.pathname));
    return res;
  } catch (err) {
    return errorResponse(err);
  }
}
