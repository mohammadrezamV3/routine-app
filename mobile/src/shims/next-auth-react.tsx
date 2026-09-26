// shimِ next-auth/react روی SyncProvider (توکن‌های Bearerِ موبایل).
//
// • وضعیتِ نشست کاملا آفلاین از tokenStore خونده می‌شه (refreshToken ذخیره‌شده
//   = واردشده) — مثلِ وب که بدونِ نشست به صفحه‌های محافظت‌شده راه نمی‌ده.
// • signIn("credentials") → SyncProvider.login، signIn("sms-2fa") → verify2fa،
//   signOut → logout (دیتای محلی پاک نمی‌شه؛ قانونِ مالک در prepareFirstSync).
// • isSuperAdmin فعلا همیشه false — فاز 1b از /api/accountِ کش‌شده پرش می‌کنه.
import { createContext, ReactNode, useContext, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSync } from "@m/sync/SyncProvider";
import { ApiError } from "@m/sync/apiClient";
import type { MobileUser } from "@m/lib/api-contract";
import { currentAuthBridge, setAuthBridge, whenAuthReady } from "./authBridge";
import type { Session } from "./next-auth";

export type SessionStatus = "loading" | "authenticated" | "unauthenticated";
export type SessionContextValue = {
  data: Session | null;
  status: SessionStatus;
  update: (data?: unknown) => Promise<Session | null>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

// نشست تا ۱۸۰ روز (سقفِ refreshِ موبایل) معتبر فرض می‌شه — فقط برای شکلِ
// تایپِ next-auth؛ هیچ کدی از وب expires رو نمی‌خونه.
const FAR_EXPIRY = () => new Date(Date.now() + 180 * 864e5).toISOString();

export function toSession(user: MobileUser | null): Session | null {
  if (!user) return null;
  return {
    user: {
      id: user.id,
      name: user.name ?? user.username ?? null,
      email: null,
      image: null,
      username: user.username,
      isSuperAdmin: false,
    },
    expires: FAR_EXPIRY(),
  };
}

export function SessionProvider({ children }: { children: ReactNode; session?: Session | null; refetchOnWindowFocus?: boolean; refetchInterval?: number; basePath?: string }) {
  const sync = useSync();
  const navigate = useNavigate();
  const userKey = sync.user ? `${sync.user.id}:${sync.user.name ?? ""}:${sync.user.username ?? ""}` : "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const session = useMemo(() => (sync.loggedIn ? toSession(sync.user) : null), [sync.loggedIn, userKey]);
  const status: SessionStatus = !sync.ready ? "loading" : session ? "authenticated" : "unauthenticated";

  // پل همین حالا (نه در effect) به‌روز می‌شه تا getSession ِ بلافاصله بعد از
  // login مقدارِ تازه رو ببینه.
  setAuthBridge({
    ready: sync.ready,
    session,
    login: sync.login,
    verify2fa: sync.verify2fa,
    logout: () => sync.logout({ wipeLocal: false }),
    navigate: (url, replace) => navigate(url, { replace }),
  });

  const value = useMemo<SessionContextValue>(
    () => ({ data: session, status, update: async () => currentAuthBridge()?.session ?? null }),
    [session, status]
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(options?: { required?: boolean; onUnauthenticated?: () => void }): SessionContextValue {
  const ctx = useContext(SessionContext);
  const value = ctx ?? { data: null, status: "loading" as const, update: async () => null };
  const required = options?.required;
  const onUnauth = options?.onUnauthenticated;
  useEffect(() => {
    if (!required || value.status !== "unauthenticated") return;
    if (onUnauth) onUnauth();
    else currentAuthBridge()?.navigate("/auth/login", true);
  }, [required, onUnauth, value.status]);
  return value;
}

export async function getSession(): Promise<Session | null> {
  const b = await whenAuthReady();
  return currentAuthBridge()?.session ?? b.session;
}

export type SignInResponse = { ok: boolean; error: string | null; status: number; url: string | null };

// آخرین «رمز درست ولی کدِ پیامکی لازمه» — signIn("sms-2fa") همون شناسه رو می‌خواد
let pending2fa: { identifier: string; phoneHint: string } | null = null;

export function consumePending2fa(): { identifier: string; phoneHint: string } | null {
  const p = pending2fa;
  pending2fa = null;
  return p;
}

function failure(err: unknown): SignInResponse {
  if (err instanceof ApiError && err.kind === "http") {
    return { ok: false, error: "CredentialsSignin", status: err.status || 401, url: null };
  }
  // شبکه/timeout/پیکربندی‌نشده → مثلِ fetchِ شکست‌خورده‌ی next-auth پرت می‌شه
  throw err;
}

export async function signIn(provider?: string, options: Record<string, unknown> = {}): Promise<SignInResponse | undefined> {
  const b = await whenAuthReady();
  const identifier = String(options.identifier ?? "").trim();
  if (provider === "credentials") {
    try {
      const r = await b.login(identifier, String(options.password ?? ""));
      if (r.status === "2fa") {
        pending2fa = { identifier, phoneHint: r.phoneHint };
        return { ok: false, error: "TwoFactorRequired", status: 401, url: null };
      }
      pending2fa = null;
      return { ok: true, error: null, status: 200, url: null };
    } catch (err) {
      return failure(err);
    }
  }
  if (provider === "sms-2fa") {
    try {
      await b.verify2fa(identifier, String(options.code ?? ""));
      pending2fa = null;
      return { ok: true, error: null, status: 200, url: null };
    } catch (err) {
      return failure(err);
    }
  }
  // گوگل و بقیه در اپ پشتیبانی نمی‌شن (بدونِ کوکی/redirect)
  return { ok: false, error: "OAuthSignin", status: 400, url: null };
}

export async function signOut(options: { callbackUrl?: string; redirect?: boolean } = {}): Promise<void> {
  const b = await whenAuthReady();
  try {
    await b.logout();
  } finally {
    if (options.redirect !== false) b.navigate(options.callbackUrl ?? "/", true);
  }
}
