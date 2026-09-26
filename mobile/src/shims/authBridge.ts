// پل بینِ shimِ next-auth/react (توابعِ ماژولیِ signIn/signOut/getSession)
// و SyncProvider (که داخلِ درختِ React زندگی می‌کنه). SessionProvider ِ shim
// روی هر رندر این پل رو با مقدارِ تازه‌ی useSync() پر می‌کنه.
import type { Session } from "./next-auth";

export type AuthBridge = {
  ready: boolean;
  session: Session | null;
  login(identifier: string, password: string): Promise<{ status: "ok" } | { status: "2fa"; phoneHint: string }>;
  verify2fa(identifier: string, code: string): Promise<void>;
  logout(): Promise<void>;
  navigate(url: string, replace?: boolean): void;
};

let bridge: AuthBridge | null = null;
let waiters: ((b: AuthBridge) => void)[] = [];

export function setAuthBridge(b: AuthBridge): void {
  bridge = b;
  if (!b.ready) return;
  const w = waiters;
  waiters = [];
  w.forEach((fn) => fn(b));
}

/** پل، وقتی SyncProvider نشستِ ذخیره‌شده رو خونده (ready) */
export function whenAuthReady(): Promise<AuthBridge> {
  if (bridge?.ready) return Promise.resolve(bridge);
  return new Promise((resolve) => waiters.push(resolve));
}

export function currentAuthBridge(): AuthBridge | null {
  return bridge;
}

// ─── نتیجه‌ی «پیش‌ورودِ» /api/auth/2fa/start ───────────────────────────────
// صفحه‌ی ورودِ وب اول POST /api/auth/2fa/start می‌زنه و اگه دومرحله‌ای لازم
// نبود، signIn("credentials") رو با همون شناسه/رمز صدا می‌زنه. در اپ هر دو
// مرحله یک درخواست‌اند (POST /api/mobile/auth/login)، پس shimِ 2fa/start خودش
// وارد می‌شه و نتیجه رو این‌جا می‌ذاره تا signIn همون رو مصرف کنه — نه یک
// ورودِ دوم (که یک نشستِ اضافه روی سرور می‌ساخت). فقط در حافظه، یک‌بارمصرف،
// حداکثر ۶۰ ثانیه، و فقط برای *همون* شناسه و رمز.
export type PreLoginOutcome = { ok: true } | { ok: false; error: unknown };
type PreLogin = { identifier: string; password: string; outcome: PreLoginOutcome; at: number };
const PRE_LOGIN_TTL_MS = 60_000;
let preLogin: PreLogin | null = null;

export function recordPreLogin(identifier: string, password: string, outcome: PreLoginOutcome): void {
  preLogin = { identifier, password, outcome, at: Date.now() };
}

export function takePreLogin(identifier: string, password: string): PreLoginOutcome | null {
  const p = preLogin;
  preLogin = null;
  if (!p || Date.now() - p.at > PRE_LOGIN_TTL_MS) return null;
  if (p.identifier !== identifier || p.password !== password) return null;
  return p.outcome;
}
