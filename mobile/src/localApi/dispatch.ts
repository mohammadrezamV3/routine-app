// اجرای یک درخواستِ `/api/*` ِ کدِ وب طبقِ جدولِ router.ts.
import { readCached, REVALIDATE_AFTER_MS, storeCached } from "./cache";
import { withBarrier } from "./barrier";
import { forward, outgoingOf, type OutgoingRequest } from "./forward";
import { guardModule, guardSession } from "./guards";
import { fromStored, json, notAvailable } from "./respond";
import { matchRoute, type RouteDef } from "./router";
import { services } from "./services";

function methodOf(input: RequestInfo | URL, init: RequestInit | undefined): string {
  const m = init?.method ?? (typeof Request !== "undefined" && input instanceof Request ? input.method : "GET");
  return m.toUpperCase();
}

/** Requestِ استاندارد برای هندلرِ محلی (همون ورودیِ روتِ Next) */
function localRequest(url: URL, out: OutgoingRequest): Request {
  return new Request(url.href, { method: out.method, headers: out.headers, body: out.body ?? undefined });
}

// ─── CACHED ─────────────────────────────────────────────────────────────

const revalidating = new Map<string, Promise<Response>>();

/** فوروارد + ذخیره‌ی پاسخِ موفق؛ dedupe روی کلید */
function fetchAndStore(route: RouteDef | null, url: URL, out: OutgoingRequest): Promise<Response> {
  const key = url.pathname + url.search;
  const running = revalidating.get(key);
  if (running) return running.then((r) => r.clone());
  const p = (async () => {
    const run = () => forward(route, url, out);
    const res = route?.barrier ? await withBarrier(run) : await run();
    if (!res.ok) return res;
    const body = await res.text();
    const contentType = res.headers.get("content-type");
    const userId = services().tokens.getUser()?.id;
    if (userId) await storeCached({ key, userId, status: res.status, contentType, body, storedAt: Date.now() });
    return fromStored(res.status, body, contentType);
  })().finally(() => revalidating.delete(key));
  revalidating.set(key, p);
  return p.then((r) => r.clone());
}

async function cachedGet(route: RouteDef, url: URL, out: OutgoingRequest): Promise<Response> {
  const key = url.pathname + url.search;
  const userId = services().tokens.getUser()?.id;
  const row = userId ? await readCached(key, userId) : null;
  if (row) {
    if (Date.now() - row.storedAt > REVALIDATE_AFTER_MS) {
      // تازه‌سازیِ پس‌زمینه بدونِ signalِ کالر (کالر همین الان جوابش رو گرفته)
      void fetchAndStore(route, url, { ...out, signal: null }).catch(() => undefined);
    }
    return fromStored(row.status, row.body, row.contentType, { "X-Arion-Cache": "hit" });
  }
  return fetchAndStore(route, url, out);
}

/**
 * هندلرِ LOCAL که داده‌ی محلیِ لازم رو نداره (مثلا کاتالوگِ عکسِ حرکات هنوز
 * دانلود نشده) ← همون رفتارِ CACHED برای همین GET.
 */
export function cachedFallback(url: URL, req: Request): Promise<Response> {
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => (headers[k] = v));
  const route: RouteDef = { pattern: url.pathname, methods: ["GET"], cls: "CACHED" };
  return cachedGet(route, url, { method: "GET", headers, body: null, signal: req.signal ?? null });
}

/** تازه‌سازیِ اجباریِ یک مسیرِ CACHED (مثلا /api/account در شروع/برگشت به اپ) */
export async function refreshCached(path: string): Promise<void> {
  const url = new URL(path, "http://local");
  const m = matchRoute("GET", url.pathname);
  if (!m || m.route.cls !== "CACHED" || !services().tokens.isLoggedIn()) return;
  try {
    await fetchAndStore(m.route, url, { method: "GET", headers: {}, body: null, signal: null });
  } catch {
    /* noop */
  }
}

// ─── ورودیِ اصلی ───────────────────────────────────────────────────────

export async function dispatch(input: RequestInfo | URL, init: RequestInit | undefined, url: URL): Promise<Response> {
  const method = methodOf(input, init);
  const match = matchRoute(method, url.pathname);
  const route = match?.route ?? null;

  if (route?.cls === "NA") return notAvailable();

  if (!route?.public) {
    const denied = guardSession();
    if (denied) return denied;
  }

  const out = await outgoingOf(input, init, method);

  if (!route) {
    // طبقه‌بندی‌نشده (تستِ classification نباید بذاره به این‌جا برسیم) ← مثلِ وب، آنلاین
    if (import.meta.env?.DEV) console.warn(`[localApi] unclassified ${method} ${url.pathname} → ONLINE`);
    return forward(null, url, out);
  }

  switch (route.cls) {
    case "LOCAL": {
      const locked = guardModule(route.module);
      if (locked) return locked;
      if (!route.handler) return json({ error: "local handler missing" }, 500);
      try {
        return await route.handler({ req: localRequest(url, out), url, params: match!.params });
      } catch (err) {
        console.error(`[localApi] ${method} ${url.pathname} failed`, err);
        return json({ error: "خطای داخلی" }, 500);
      }
    }
    case "CACHED":
      return cachedGet(route, url, out);
    case "ONLINE":
    default: {
      const run = () => forward(route, url, out);
      return route.barrier ? withBarrier(run) : run();
    }
  }
}
