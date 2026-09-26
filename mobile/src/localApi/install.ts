// نصبِ «روترِ API ِ محلی» روی window.fetch — قبل از اولین رندر (main.tsx).
// کدِ وب (lib/storage.ts، کامپوننت‌ها، صفحه‌ها) همون fetch("/api/...") ِ همیشگی
// رو صدا می‌زنه و نمی‌دونه جواب از Dexie میاد یا از سرور (PORT_PLAN §2).
// فقط URLهای *هم‌مبدأ* با مسیرِ /api/ رهگیری می‌شن — به شکلِ string، URL یا
// Request. هر چیزِ دیگه (ApiClient به VITE_API_BASE_URL، تصویر، CDN) دست‌نخورده
// به fetchِ اصلی می‌ره.
import { dispatch } from "./dispatch";
import { setNativeFetch } from "./nativeFetch";

let installed = false;

/** URLِ هم‌مبدأِ /api/ یا null */
export function sameOriginApiUrl(input: RequestInfo | URL, loc: { href: string; origin: string } = window.location): URL | null {
  let raw: string;
  if (typeof input === "string") raw = input;
  else if (input instanceof URL) raw = input.href;
  else if (typeof Request !== "undefined" && input instanceof Request) raw = input.url;
  else return null;
  let url: URL;
  try {
    url = new URL(raw, loc.href);
  } catch {
    return null;
  }
  if (url.origin !== loc.origin) return null;
  return url.pathname === "/api" || url.pathname.startsWith("/api/") ? url : null;
}

export function installLocalApi(): void {
  if (installed || typeof window === "undefined" || typeof window.fetch !== "function") return;
  installed = true;
  const original = window.fetch.bind(window);
  setNativeFetch(original);
  const patched = function fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = sameOriginApiUrl(input);
    if (!url) return original(input, init);
    return dispatch(input, init, url);
  };
  window.fetch = patched as typeof window.fetch;
}
