// ─────────────────────────────────────────────────────────────────────────
// قرارداد مشترک WebSocket (بخش خالص — بدون Prisma/ws/pg، پس هم سرور و هم
// تست‌ها مستقیم importش می‌کنن).
//
// اصل امنیتی: رویدادها فقط «متادیتا»ن — نوع + شناسه/کلید. هیچ محتوای خصوصی
// (متن پیام، عنوان اعلان، …) از WS رد نمی‌شه؛ کلاینت با گرفتن رویداد همون
// API مجاز و احراز‌هویت‌شده‌ی قبلی رو دوباره می‌خونه. یعنی WS هیچ سطح
// دسترسی تازه‌ای باز نمی‌کنه — بدترین حالت نشت، «یه چیزی عوض شد»ـه.
// ─────────────────────────────────────────────────────────────────────────

/** کانال LISTEN/NOTIFY Postgres */
export const REALTIME_CHANNEL = "arion_rt";
/** مسیر upgrade روی همون origin/پورت سایت */
export const REALTIME_PATH = "/ws";
/** سقف payload pg_notify ۸۰۰۰ بایته؛ با حاشیه‌ی امن */
export const MAX_NOTIFY_BYTES = 7500;
/** حداکثر گیرنده در یک NOTIFY — بیشتر از این تکه‌تکه فرستاده می‌شه */
export const MAX_USERS_PER_NOTIFY = 150;

export type ServerEventType =
  | "data.changed"
  | "notification.new"
  | "notification.read"
  | "mentor.message"
  | "mentor.mentorship"
  | "mentor.program";

/**
 * شکل رویداد روی سیم — همونی که کلاینت به‌صورت
 * `CustomEvent("arion:server-event", { detail })` پخش می‌کنه (lib/liveSync.ts).
 *  • keys: دامنه‌های LIVE_DOMAINS (مثلا "trade"، "daily:2026-09-27"، "wakeSleepTimes")
 *  • data: فقط شناسه‌ها (mentorshipId/id)، هرگز محتوا
 *  • src:  شناسه‌ی تب نویسنده (هدر x-arion-client) تا همون تب اکوی خودش رو نادیده بگیره
 */
export type ServerEvent = {
  type: ServerEventType;
  keys?: string[];
  data?: Record<string, string | number | boolean>;
  src?: string;
};

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const KEY_RE = /^[A-Za-z0-9_:.*-]{1,80}$/;
const EVENT_TYPES: ReadonlySet<string> = new Set<ServerEventType>([
  "data.changed",
  "notification.new",
  "notification.read",
  "mentor.message",
  "mentor.mentorship",
  "mentor.program",
]);

export function isValidUserId(id: unknown): id is string {
  return typeof id === "string" && ID_RE.test(id);
}

/** رویداد رو تمیز می‌کنه: نوع مجاز، کلیدهای کوتاه، data فقط مقادیر ساده و کوتاه */
export function sanitizeEvent(e: unknown): ServerEvent | null {
  if (!e || typeof e !== "object") return null;
  const src = e as Record<string, unknown>;
  if (typeof src.type !== "string" || !EVENT_TYPES.has(src.type)) return null;
  const out: ServerEvent = { type: src.type as ServerEventType };
  if (Array.isArray(src.keys)) {
    const keys = Array.from(new Set(src.keys.filter((k): k is string => typeof k === "string" && KEY_RE.test(k)))).slice(0, 20);
    if (keys.length) out.keys = keys;
  }
  if (src.data && typeof src.data === "object") {
    const data: Record<string, string | number | boolean> = {};
    let n = 0;
    for (const [k, v] of Object.entries(src.data as Record<string, unknown>)) {
      if (n >= 8 || !/^[A-Za-z]{1,32}$/.test(k)) continue;
      if (typeof v === "string" && v.length <= 64) data[k] = v;
      else if (typeof v === "number" && Number.isFinite(v)) data[k] = v;
      else if (typeof v === "boolean") data[k] = v;
      else continue;
      n++;
    }
    if (n) out.data = data;
  }
  if (typeof src.src === "string" && ID_RE.test(src.src)) out.src = src.src;
  return out;
}

function byteLength(s: string): number {
  return Buffer.byteLength(s, "utf8");
}

/**
 * payload(های) NOTIFY رو می‌سازه: `{u:[userIds], e:event}`. اگه تعداد گیرنده‌ها
 * زیاد باشه یا payload از سقف رد بشه، گیرنده‌ها تکه‌تکه می‌شن — هیچ‌وقت یک
 * NOTIFY بزرگ‌تر از ۸KB (که Postgres ردش می‌کنه) ساخته نمی‌شه.
 */
export function buildNotifyPayloads(userIds: readonly string[], event: ServerEvent): string[] {
  const clean = sanitizeEvent(event);
  if (!clean) return [];
  const ids = Array.from(new Set(userIds.filter(isValidUserId)));
  if (!ids.length) return [];
  const out: string[] = [];
  let chunk: string[] = [];
  const encode = (u: string[]) => JSON.stringify({ u, e: clean });
  if (byteLength(encode([ids[0]])) > MAX_NOTIFY_BYTES) return []; // خود رویداد بیش‌ازحد بزرگه
  for (const id of ids) {
    const next = [...chunk, id];
    if (next.length > MAX_USERS_PER_NOTIFY || byteLength(encode(next)) > MAX_NOTIFY_BYTES) {
      out.push(encode(chunk));
      chunk = [id];
    } else {
      chunk = next;
    }
  }
  if (chunk.length) out.push(encode(chunk));
  return out;
}

/** payload رسیده از LISTEN رو پارس و اعتبارسنجی می‌کنه (هرچی بدشکل → null) */
export function parseNotifyPayload(raw: string | undefined | null): { userIds: string[]; event: ServerEvent } | null {
  if (!raw || raw.length > 8000) return null;
  let obj: unknown;
  try { obj = JSON.parse(raw); } catch { return null; }
  if (!obj || typeof obj !== "object") return null;
  const { u, e } = obj as { u?: unknown; e?: unknown };
  if (!Array.isArray(u)) return null;
  const userIds = u.filter(isValidUserId);
  const event = sanitizeEvent(e);
  if (!userIds.length || !event) return null;
  return { userIds, event };
}

/**
 * fan-out محلی: از بین سوکت‌های همین worker فقط مال userIdهای مقصد.
 * جدا نگه داشته شده تا قابل تست باشه — «به کس دیگه نرسه» مهم‌ترین تضمینه.
 */
export function selectRecipients<S>(socketsByUser: Map<string, Set<S>>, userIds: readonly string[]): S[] {
  const out: S[] = [];
  for (const id of new Set(userIds)) {
    const set = socketsByUser.get(id);
    if (set) for (const s of set) out.push(s);
  }
  return out;
}

// ── احراز هویت/Origin روی upgrade ──────────────────────────────────────

export function parseCookieHeader(header: string | undefined | null): Map<string, string> {
  const out = new Map<string, string>();
  if (!header) return out;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    let v = part.slice(i + 1).trim();
    if (!k) continue;
    try { v = decodeURIComponent(v); } catch {}
    if (!out.has(k)) out.set(k, v);
  }
  return out;
}

export const SESSION_COOKIE_NAMES = ["__Secure-next-auth.session-token", "next-auth.session-token"] as const;

/**
 * توکن نشست next-auth رو از کوکی‌ها درمیاره — شامل حالت تکه‌شده
 * (`name.0`, `name.1`, … وقتی JWT از ۴KB بزرگ‌تر بشه). هر دو اسم (با/بی
 * پیشوند __Secure-) امتحان می‌شن چون useSecureCookies این اپ به
 * AUTH_COOKIE_SECURE/NODE_ENV بستگی داره، نه فقط NEXTAUTH_URL.
 */
export function pickSessionTokens(cookies: Map<string, string>): string[] {
  const found: string[] = [];
  for (const name of SESSION_COOKIE_NAMES) {
    const whole = cookies.get(name);
    if (whole) { found.push(whole); continue; }
    const chunks: string[] = [];
    for (let i = 0; i < 20; i++) {
      const c = cookies.get(`${name}.${i}`);
      if (c === undefined) break;
      chunks.push(c);
    }
    if (chunks.length) found.push(chunks.join(""));
  }
  return found;
}

function hostOf(u: string | undefined | null): string | null {
  if (!u) return null;
  try { return new URL(u).host.toLowerCase(); } catch { return null; }
}

/** hostهای مجاز از env: NEXTAUTH_URL، NEXT_PUBLIC_SITE_URL، REALTIME_ALLOWED_ORIGINS (کاما) */
export function allowedOriginHosts(env: Record<string, string | undefined> = process.env): Set<string> {
  const hosts = new Set<string>();
  const add = (u?: string) => {
    const h = hostOf(u);
    if (!h) return;
    hosts.add(h);
    // www و بدون www یک سایت‌ان
    if (h.startsWith("www.")) hosts.add(h.slice(4));
    else if (h.includes(".") && !/^[\d.]+(:\d+)?$/.test(h)) hosts.add(`www.${h}`);
  };
  add(env.NEXTAUTH_URL);
  add(env.NEXT_PUBLIC_SITE_URL);
  for (const o of (env.REALTIME_ALLOWED_ORIGINS || "").split(",")) add(o.trim());
  return hosts;
}

/**
 * ضد Cross-Site WebSocket Hijacking: مرورگر روی WS کوکی رو خودکار می‌فرسته،
 * پس بدون این چک هر سایتی می‌تونست به‌جای کاربر وصل بشه. Origin (که
 * جاوااسکریپت نمی‌تونه جعلش کنه) باید یا با Host خود درخواست یکی باشه
 * (همون origin — nginx با `Host $host` پاسش می‌ده) یا توی لیست مجاز env.
 * نبود Origin = رد (مرورگرها روی WS همیشه می‌فرستن).
 */
export function isOriginAllowed(
  origin: string | undefined | null,
  requestHost: string | undefined | null,
  allowed: Set<string> = allowedOriginHosts(),
): boolean {
  const oh = hostOf(origin);
  if (!oh) return false;
  const proto = (() => { try { return new URL(origin!).protocol; } catch { return ""; } })();
  if (proto !== "https:" && proto !== "http:") return false;
  if (requestHost && oh === requestHost.toLowerCase()) return true;
  return allowed.has(oh);
}

/** پیام upgrade رد‌شده — پاسخ HTTP خام روی سوکت، بعد بستن */
export function rejectResponse(status: 400 | 401 | 403 | 404 | 429 | 503): string {
  const text: Record<number, string> = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    429: "Too Many Requests",
    503: "Service Unavailable",
  };
  return `HTTP/1.1 ${status} ${text[status]}\r\nConnection: close\r\nContent-Type: text/plain\r\nContent-Length: 0\r\n\r\n`;
}

/** فقط `/ws` (با query دلخواه) — هرچیز دیگه (مثلا HMR نکست) دست‌نخورده رد می‌شه */
export function isRealtimePath(url: string | undefined | null): boolean {
  if (!url) return false;
  const path = url.split("?")[0];
  return path === REALTIME_PATH || path === `${REALTIME_PATH}/`;
}
