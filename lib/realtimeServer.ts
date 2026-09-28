// ─────────────────────────────────────────────────────────────────────────
// سرورِ WebSocket (`/ws`) — روی همون پورت/originِ سایت، داخلِ هر worker.
//
// چرا این‌جا (instrumentation) و نه route handler: روت‌های Next نمی‌تونن
// کانکشن رو upgrade کنن. چرا نه یک server.js سفارشی: خروجیِ standaloneِ نکست
// خودش server.js رو می‌سازه و cluster.js همونو require می‌کنه؛ جایگزین‌کردنش
// یعنی از دست دادنِ رفتارِ دقیقِ start-serverِ نکست (keep-alive، شاتدانِ
// تمیز، …). به‌جاش:
//
//   instrumentation.ts → register() → startRealtimeServer()
//     └ http.Server.prototype.emit یک‌بار وصله می‌شه: فقط رویدادِ 'upgrade'ِ
//       مسیرِ دقیقِ `/ws` این‌جا گرفته می‌شه؛ *هر* upgradeِ دیگه (مثلا
//       `/_next/webpack-hmr`ِ حالتِ dev) عیناً به هندلرِ خودِ نکست می‌رسه.
//
// وصله روی prototype است (نه روی یک نمونه) چون instrumentation *بعد* از
// ساخته‌شدن و listenِ http.Serverِ نکست اجرا می‌شه — ولی emitِ همون نمونه
// هنوز از prototype خونده می‌شه. همین یک مسیر هم در `next start`، هم در
// standalone/cluster.js، هم در `next dev` کار می‌کنه (dev هم instrumentation
// رو در همون پروسه‌ی سرور اجرا می‌کنه) — بدونِ هیچ اسکریپتِ جدا.
//
// fan-out بینِ workerها: Postgres LISTEN/NOTIFY (نگاه کن به lib/realtime.ts).
// ─────────────────────────────────────────────────────────────────────────

import http from "node:http";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer, WebSocket } from "ws";
import { Client } from "pg";
import { decode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { isSessionLive } from "@/lib/deviceSessions";
import {
  REALTIME_CHANNEL,
  allowedOriginHosts,
  isOriginAllowed,
  isRealtimePath,
  parseCookieHeader,
  parseNotifyPayload,
  pickSessionTokens,
  rejectResponse,
  selectRecipients,
} from "@/lib/realtimeProtocol";

const HEARTBEAT_MS = 30_000;
/** هر چند تیکِ heartbeat یک‌بار وضعیتِ کاربر/نشست دوباره از دیتابیس چک می‌شه (~۵ دقیقه) */
const RECHECK_EVERY_TICKS = 10;
const MAX_CLIENT_MSGS_PER_WINDOW = 20;
const CLIENT_MSG_WINDOW_MS = 10_000;

type Conn = WebSocket & {
  userId: string;
  sid: string | null;
  exp: number | null;
  alive: boolean;
  ticks: number;
  msgCount: number;
  msgWindowStart: number;
};

type State = {
  wss: WebSocketServer;
  byUser: Map<string, Set<Conn>>;
  listener: Client | null;
  listenerReady: boolean;
  reconnectDelay: number;
  reconnectTimer: NodeJS.Timeout | null;
};

const GLOBAL_KEY = Symbol.for("arion.realtime.server");
const debug = () => process.env.REALTIME_DEBUG === "1";
const maxPerUser = () => Math.max(1, Number(process.env.REALTIME_MAX_CONN_PER_USER) || 12);

function log(msg: string) {
  console.log(`[realtime ${process.pid}] ${msg}`);
}

/**
 * آدرسِ LISTEN. Prisma پارامترهای مخصوصِ خودش (schema/connection_limit/…) رو
 * توی URL می‌پذیره که pg نمی‌شناسه — حذف می‌شن. پشتِ PgBouncerِ
 * transaction-mode، LISTEN کار نمی‌کنه؛ اون‌وقت REALTIME_DATABASE_URL باید
 * مستقیم به Postgres اشاره کنه.
 */
export function listenConnectionString(env: Record<string, string | undefined> = process.env): string | null {
  const raw = env.REALTIME_DATABASE_URL || env.DATABASE_URL;
  if (!raw) return null;
  try {
    const u = new URL(raw);
    for (const p of ["schema", "connection_limit", "pool_timeout", "pgbouncer", "statement_cache_size", "socket_timeout", "connect_timeout"]) {
      u.searchParams.delete(p);
    }
    return u.toString();
  } catch {
    return raw;
  }
}

// ── LISTEN ──────────────────────────────────────────────────────────────

function scheduleListenerReconnect(st: State) {
  if (st.reconnectTimer) return;
  const delay = st.reconnectDelay;
  st.reconnectDelay = Math.min(30_000, st.reconnectDelay * 2);
  st.reconnectTimer = setTimeout(() => {
    st.reconnectTimer = null;
    void ensureListener(st);
  }, delay);
  st.reconnectTimer.unref?.();
}

function deliver(st: State, raw: string | undefined) {
  const parsed = parseNotifyPayload(raw);
  if (!parsed) return;
  const targets = selectRecipients(st.byUser, parsed.userIds);
  if (!targets.length) return;
  const msg = JSON.stringify(parsed.event);
  for (const ws of targets) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
}

/** بعد از قطعیِ LISTEN ممکنه رویدادی جا افتاده باشه → همه‌ی سوکت‌ها یه «همه‌چیز رو تازه کن» می‌گیرن */
function broadcastResync(st: State) {
  const msg = JSON.stringify({ type: "data.changed", keys: ["*"] });
  for (const set of st.byUser.values()) for (const ws of set) if (ws.readyState === WebSocket.OPEN) ws.send(msg);
}

async function ensureListener(st: State): Promise<void> {
  if (st.listener) return;
  const conn = listenConnectionString();
  if (!conn) {
    log("DATABASE_URL ست نیست — fan-out غیرفعال");
    return;
  }
  const client = new Client({ connectionString: conn, application_name: "arion-realtime" });
  st.listener = client;
  st.listenerReady = false;
  let failed = false;
  const fail = (err: unknown) => {
    if (failed) return;
    failed = true;
    if (st.listener === client) {
      st.listener = null;
      st.listenerReady = false;
    }
    log(`LISTEN connection lost: ${(err as any)?.message || err} — reconnecting`);
    client.end().catch(() => {});
    scheduleListenerReconnect(st);
  };
  client.on("error", fail);
  client.on("end", () => fail(new Error("ended")));
  client.on("notification", (n) => {
    if (n.channel === REALTIME_CHANNEL) deliver(st, n.payload);
  });
  try {
    await client.connect();
    await client.query(`LISTEN ${REALTIME_CHANNEL}`); // نامِ کانال ثابتِ کد است، نه ورودیِ کاربر
    const wasReconnect = st.reconnectDelay > 1000;
    st.listenerReady = true;
    st.reconnectDelay = 1000;
    if (debug()) log(`LISTEN ${REALTIME_CHANNEL} ready`);
    if (wasReconnect) broadcastResync(st);
  } catch (err) {
    fail(err);
  }
}

// ── احراز هویت ─────────────────────────────────────────────────────────

type Authed = { userId: string; sid: string | null; exp: number | null };

async function authenticate(req: IncomingMessage): Promise<Authed | null> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  let token: Record<string, unknown> | null = null;
  for (const raw of pickSessionTokens(parseCookieHeader(req.headers.cookie))) {
    try {
      const t = await decode({ token: raw, secret });
      if (t && typeof (t as any).userId === "string") { token = t as any; break; }
    } catch {
      // امضا/رمزگشایی نامعتبر → کوکیِ بعدی
    }
  }
  if (!token) return null;
  const userId = token.userId as string;
  const exp = typeof token.exp === "number" ? token.exp : null;
  if (exp !== null && exp * 1000 <= Date.now()) return null;
  const sid = typeof token.sid === "string" ? token.sid : null;
  if (!(await userStillAllowed(userId, sid))) return null;
  return { userId, sid, exp };
}

async function userStillAllowed(userId: string, sid: string | null): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isBlocked: true, deletedAt: true } });
  if (!user || user.isBlocked || user.deletedAt) return false;
  if (sid && !(await isSessionLive(sid).catch(() => true))) return false;
  return true;
}

function reject(socket: Duplex, status: 400 | 401 | 403 | 404 | 429 | 503) {
  try {
    socket.write(rejectResponse(status));
  } catch {}
  socket.destroy();
}

// ── مدیریتِ سوکت‌ها ─────────────────────────────────────────────────────

function register(st: State, ws: Conn) {
  let set = st.byUser.get(ws.userId);
  if (!set) {
    set = new Set();
    st.byUser.set(ws.userId, set);
  }
  // سقفِ اتصالِ هر کاربر روی این worker: به‌جای ردِ تبِ تازه، قدیمی‌ترین
  // (معمولا یه تبِ فراموش‌شده) بسته می‌شه.
  while (set.size >= maxPerUser()) {
    const oldest = set.values().next().value as Conn | undefined;
    if (!oldest) break;
    set.delete(oldest);
    oldest.close(4008, "too many connections");
  }
  set.add(ws);
}

function unregister(st: State, ws: Conn) {
  const set = st.byUser.get(ws.userId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) st.byUser.delete(ws.userId);
}

async function handleUpgrade(st: State, req: IncomingMessage, socket: Duplex, head: Buffer) {
  socket.on("error", () => {});
  try {
    if ((req.method || "GET") !== "GET") return reject(socket, 400);
    const origin = req.headers.origin;
    const host = (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0]?.trim() || req.headers.host;
    if (!isOriginAllowed(origin, host, allowedOriginHosts())) {
      if (debug()) log(`rejected origin ${origin} (host ${host})`);
      return reject(socket, 403);
    }
    const auth = await authenticate(req);
    if (!auth) return reject(socket, 401);
    if (socket.destroyed) return;

    st.wss.handleUpgrade(req, socket, head, (raw) => {
      const ws = raw as Conn;
      ws.userId = auth.userId;
      ws.sid = auth.sid;
      ws.exp = auth.exp;
      ws.alive = true;
      ws.ticks = 0;
      ws.msgCount = 0;
      ws.msgWindowStart = Date.now();
      register(st, ws);
      void ensureListener(st);
      if (debug()) {
        log(`connected user=${auth.userId} (sockets on this worker: ${[...st.byUser.values()].reduce((a, s) => a + s.size, 0)})`);
        ws.send(JSON.stringify({ type: "hello", worker: process.pid }));
      } else {
        ws.send(JSON.stringify({ type: "hello" }));
      }

      ws.on("pong", () => { ws.alive = true; });
      // کانال یک‌طرفه‌ست (سرور → کلاینت). پیامِ کلاینت فقط ping-ِ اپلیکیشنیه
      // و نادیده گرفته می‌شه؛ سیلِ پیام = بستنِ اتصال.
      ws.on("message", () => {
        const now = Date.now();
        if (now - ws.msgWindowStart > CLIENT_MSG_WINDOW_MS) {
          ws.msgWindowStart = now;
          ws.msgCount = 0;
        }
        if (++ws.msgCount > MAX_CLIENT_MSGS_PER_WINDOW) ws.close(1008, "rate limit");
        else ws.alive = true;
      });
      ws.on("close", () => unregister(st, ws));
      ws.on("error", () => { try { ws.terminate(); } catch {} });
    });
  } catch (err) {
    log(`upgrade failed: ${(err as any)?.message || err}`);
    reject(socket, 503);
  }
}

function heartbeat(st: State) {
  const nowSec = Date.now() / 1000;
  for (const set of Array.from(st.byUser.values())) {
    for (const ws of Array.from(set)) {
      if (!ws.alive) {
        unregister(st, ws);
        ws.terminate();
        continue;
      }
      if (ws.exp !== null && ws.exp <= nowSec) {
        ws.close(4001, "session expired");
        continue;
      }
      ws.alive = false;
      try { ws.ping(); } catch {}
      if (++ws.ticks % RECHECK_EVERY_TICKS === 0) {
        userStillAllowed(ws.userId, ws.sid)
          .then((ok) => { if (!ok) ws.close(4003, "session revoked"); })
          .catch(() => {});
      }
    }
  }
}

// ── راه‌اندازی ─────────────────────────────────────────────────────────

export function startRealtimeServer(): void {
  if (process.env.REALTIME_DISABLED === "1") return;
  const g = globalThis as any;
  if (g[GLOBAL_KEY]) return; // یک‌بار در هر پروسه (HMR/دوباره‌اجرای instrumentation بی‌اثر)

  const st: State = {
    wss: new WebSocketServer({ noServer: true, maxPayload: 1024, perMessageDeflate: false, clientTracking: false }),
    byUser: new Map(),
    listener: null,
    listenerReady: false,
    reconnectDelay: 1000,
    reconnectTimer: null,
  };
  g[GLOBAL_KEY] = st;

  const proto = http.Server.prototype as any;
  const originalEmit: (...args: any[]) => boolean = proto.emit;
  proto.emit = function patchedEmit(this: http.Server, event: string, ...args: any[]) {
    if (event === "upgrade" && isRealtimePath((args[0] as IncomingMessage)?.url)) {
      void handleUpgrade(st, args[0], args[1], args[2]);
      return true;
    }
    return originalEmit.call(this, event, ...args);
  };

  const hb = setInterval(() => heartbeat(st), HEARTBEAT_MS);
  hb.unref?.();

  // شاتدانِ تمیز (docker stop → cluster.js → SIGTERM به worker): سوکت‌های باز
  // با کدِ 1001 بسته می‌شن تا کلاینت فوری به workerِ/کانتینرِ تازه وصل بشه.
  process.prependListener("SIGTERM", () => {
    for (const set of st.byUser.values()) for (const ws of set) { try { ws.close(1001, "server restart"); } catch {} }
    st.listener?.end().catch(() => {});
  });

  // LISTEN از همون اول (نه با اولین سوکت) تا اولین رویدادِ اولین کاربر جا نیفته
  void ensureListener(st);
  if (debug()) log("WebSocket endpoint ready at /ws");
}

/** برای تست/دیباگ */
export function realtimeStats(): { users: number; sockets: number; listening: boolean } | null {
  const st = (globalThis as any)[GLOBAL_KEY] as State | undefined;
  if (!st) return null;
  let sockets = 0;
  for (const s of st.byUser.values()) sockets += s.size;
  return { users: st.byUser.size, sockets, listening: st.listenerReady };
}
