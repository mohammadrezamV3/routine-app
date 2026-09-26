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
