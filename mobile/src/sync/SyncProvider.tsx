// Context ِ همگام‌سازی/ورود برای کلِ اپ.
//
// محرک‌های سینک (فقط وقتی وارد شده و VITE_API_BASE_URL تنظیم شده):
//   • شروعِ اپ   • برگشتِ اینترنت (@capacitor/network)
//   • برگشت به اپ (@capacitor/app — appStateChange)
//   • بعد از هر نوشتنِ محلی (debounce ۲ ثانیه)   • «همگام‌سازی الان» (syncNow)
// خودِ موتور single-flight است؛ این لایه فقط زمان‌بندی می‌کنه.
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { MobileUser } from "@/lib/api-contract";
import { onLocalWrite } from "@/db/syncHooks";
import { API_BASE_URL, LOCAL_WRITE_DEBOUNCE_MS, SYNC_ENABLED } from "./config";
import { preferencesKV } from "./kv";
import { TokenStore } from "./tokenStore";
import { ApiClient } from "./apiClient";
import { SyncEngine, SyncState, SyncStatus } from "./syncEngine";
import { getDeviceName } from "./deviceName";

type Services = { tokens: TokenStore; api: ApiClient; engine: SyncEngine };
let services: Services | null = null;

/** سرویس‌های singleton (یک ApiClient ← یک promiseِ refresh برای کلِ اپ) */
export function getSyncServices(): Services {
  if (!services) {
    const kv = preferencesKV();
    const tokens = new TokenStore(kv);
    const api = new ApiClient({ baseUrl: API_BASE_URL, tokens });
    services = { tokens, api, engine: new SyncEngine(api, kv) };
  }
  return services;
}

export type LoginResult = { status: "ok" } | { status: "2fa"; phoneHint: string };

export type SyncContextValue = {
  /** آیا آدرسِ سرور تنظیم شده (وگرنه اپ فقط محلیه) */
  enabled: boolean;
  /** تا وقتی نشستِ ذخیره‌شده خونده نشده false */
  ready: boolean;
  status: SyncStatus;
  lastSyncAt: string | null;
  error: string | null;
  rejectedCount: number;
  user: MobileUser | null;
  loggedIn: boolean;
  /** نشست سمتِ سرور باطل شد و خروجِ خودکار انجام شد */
  sessionExpired: boolean;
  syncNow: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<LoginResult>;
  verify2fa: (identifier: string, code: string) => Promise<void>;
  logout: (opts?: { wipeLocal?: boolean }) => Promise<void>;
};

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { tokens, api, engine } = getSyncServices();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<MobileUser | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>(engine.getState());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trigger = useCallback(() => {
    if (!SYNC_ENABLED || !tokens.isLoggedIn()) return;
    void engine.sync();
  }, [engine, tokens]);

  // شروع: خوندنِ نشستِ ذخیره‌شده + اولین سینک
  useEffect(() => {
    let cancelled = false;
    const unsubState = engine.subscribe(setSyncState);
    const unsubAuth = api.onAuthEvent((e) => {
      if (e.type === "expired") {
        setLoggedIn(false);
        setUser(null);
        setSessionExpired(true);
      } else if (e.type === "logout") {
        setLoggedIn(false);
        setUser(null);
      } else {
        setLoggedIn(true);
        setUser(e.user);
        if (e.type === "login") setSessionExpired(false);
      }
    });
    (async () => {
      try {
        await Promise.all([tokens.load(), engine.init()]);
      } catch {
        /* Preferences در دسترس نیست — مهمان */
      }
      if (cancelled) return;
      setUser(tokens.getUser());
      setLoggedIn(tokens.isLoggedIn());
      setReady(true);
      trigger();
    })();
    return () => {
      cancelled = true;
      unsubState();
      unsubAuth();
    };
  }, [api, engine, tokens, trigger]);

  // نوشتنِ محلی → سینک با debounce
  useEffect(() => {
    if (!SYNC_ENABLED) return;
    const off = onLocalWrite(() => {
      if (!tokens.isLoggedIn()) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        trigger();
      }, LOCAL_WRITE_DEBOUNCE_MS);
    });
    return () => {
      off();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [tokens, trigger]);

  // شبکه + برگشت به اپ
  useEffect(() => {
    let cancelled = false;
    const cleanups: (() => void)[] = [];
    (async () => {
      try {
        const { Network } = await import("@capacitor/network");
        const st = await Network.getStatus();
        if (cancelled) return;
        engine.setOnline(st.connected);
        const h = await Network.addListener("networkStatusChange", (s) => {
          engine.setOnline(s.connected);
          if (s.connected) trigger();
        });
        if (cancelled) void h.remove();
        else cleanups.push(() => void h.remove());
      } catch {
        /* پلاگین در دسترس نیست — فرض: آنلاین */
      }
      try {
        const { App } = await import("@capacitor/app");
        const h = await App.addListener("appStateChange", (s) => {
          if (s.isActive) trigger();
        });
        if (cancelled) void h.remove();
        else cleanups.push(() => void h.remove());
      } catch {
        /* noop */
      }
    })();
    return () => {
      cancelled = true;
      cleanups.forEach((c) => c());
    };
  }, [engine, trigger]);

  const syncNow = useCallback(async () => {
    if (!SYNC_ENABLED || !tokens.isLoggedIn()) return;
    await engine.sync();
  }, [engine, tokens]);

  const afterLogin = useCallback(async () => {
    setSessionExpired(false);
    // دیتای مهمان/محلی از دست نمی‌ره: همه dirty ← push ← LWW
    await engine.prepareFirstSync();
    void engine.sync();
  }, [engine]);

  const login = useCallback(
    async (identifier: string, password: string): Promise<LoginResult> => {
      const r = await api.login({ identifier: identifier.trim(), password, deviceName: getDeviceName() });
      if ("requires2fa" in r) return { status: "2fa", phoneHint: r.phoneHint };
      await afterLogin();
      return { status: "ok" };
    },
    [api, afterLogin]
  );

  const verify2fa = useCallback(
    async (identifier: string, code: string) => {
      await api.verify2fa({ identifier: identifier.trim(), code: code.trim(), deviceName: getDeviceName() });
      await afterLogin();
    },
    [api, afterLogin]
  );

  const logout = useCallback(
    async (opts: { wipeLocal?: boolean } = {}) => {
      const wipeLocal = opts.wipeLocal === true;
      // قبل از پاک‌کردن، آخرین تغییرها رو (اگه بشه) بفرست
      if (wipeLocal && tokens.isLoggedIn()) await engine.sync();
      await engine.idle();
      await api.logout();
      await engine.resetAfterLogout(wipeLocal);
      setSessionExpired(false);
    },
    [api, engine, tokens]
  );

  const value = useMemo<SyncContextValue>(
    () => ({
      enabled: SYNC_ENABLED,
      ready,
      status: syncState.status,
      lastSyncAt: syncState.lastSyncAt,
      error: syncState.error,
      rejectedCount: syncState.rejectedCount,
      user,
      loggedIn,
      sessionExpired,
      syncNow,
      login,
      verify2fa,
      logout,
    }),
    [ready, syncState, user, loggedIn, sessionExpired, syncNow, login, verify2fa, logout]
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error("useSync must be used inside <SyncProvider>");
  return ctx;
}
