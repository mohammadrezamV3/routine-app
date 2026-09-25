// Context ِ همگام‌سازی/ورود برای کلِ اپ — به‌علاوه‌ی Providerهای فیچرها که به
// نشست/سینک وابسته‌ان (MoreContext، RoadmapApi).
//
// محرک‌های سینک (فقط وقتی وارد شده و VITE_API_BASE_URL تنظیم شده):
//   • شروعِ اپ   • برگشتِ اینترنت (@capacitor/network)
//   • برگشت به اپ (@capacitor/app — appStateChange)
//   • بعد از هر نوشتنِ محلی در هر ماژول (debounce ۲ ثانیه)   • «همگام‌سازی الان»
// خودِ موتور single-flight است؛ این لایه فقط زمان‌بندی می‌کنه.
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { MobileModuleKey, MobileUser } from "@/lib/api-contract";
import { onLocalWrite } from "@/db/syncHooks";
// عمدا از باطنِ فیچرها (نه از barrel `index.ts`) import می‌کنیم — barrelِ
// `@/features/more` و `@/features/roadmaps` صفحات/مسیرهای سنگین رو هم
// re-export می‌کنن؛ اگه از همون barrel اینجا (که همیشه eager لود می‌شه) وارد
// می‌شد، React.lazy(...) در App.tsx برای همون ماژول‌ها بی‌اثر می‌شد (Rollup
// یک چانک eager می‌ساخت که همه‌چیز از جمله صفحات رو با خودش می‌کشید).
import { MoreProvider, type PlanModule } from "@/features/more/MoreContext";
import { RoadmapApiProvider, RoadmapApiError, type RoadmapApi } from "@/features/roadmaps/api";
import { API_BASE_URL, LOCAL_WRITE_DEBOUNCE_MS, SYNC_ENABLED } from "./config";
import { preferencesKV } from "./kv";
import { TokenStore } from "./tokenStore";
import { ApiClient, ApiError } from "./apiClient";
import { SyncEngine, SyncState, SyncStatus } from "./syncEngine";
import { ALL_CHANNELS } from "./channels";
import { fitnessSyncTables } from "./fitnessAdapter";
import { roadmapSyncTables } from "./roadmapAdapter";
import { tradeSyncTables } from "./tradeAdapter";
import { getDeviceName } from "./deviceName";
import { wipeAllLocalData } from "./localData";
import { refreshCatalog } from "./catalog";
import { formatLastSync } from "./format";

type Services = { tokens: TokenStore; api: ApiClient; engine: SyncEngine };
let services: Services | null = null;

/** سرویس‌های singleton (یک ApiClient ← یک promiseِ refresh برای کلِ اپ) */
export function getSyncServices(): Services {
  if (!services) {
    const kv = preferencesKV();
    const tokens = new TokenStore(kv);
    const api = new ApiClient({ baseUrl: API_BASE_URL, tokens });
    services = { tokens, api, engine: new SyncEngine(api, kv, ALL_CHANNELS) };
  }
  return services;
}

export type LoginResult = { status: "ok" } | { status: "2fa"; phoneHint: string };

export type GatedModule = "EXERCISE" | "CALORIE" | "ROADMAP" | "TRADE";

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
  /** ماژول‌های پولی‌ای که سرور گفته قفلن (فقط برای کاربرِ واردشده؛ مهمان همه‌چیز محلی/باز) */
  lockedModules: string[];
  isModuleLocked: (m: GatedModule) => boolean;
  /** کلاینتِ HTTP مشترک (برای AI/کاتالوگ) — null وقتی سرور تنظیم نشده */
  api: ApiClient | null;
  syncNow: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<LoginResult>;
  verify2fa: (identifier: string, code: string) => Promise<void>;
  logout: (opts?: { wipeLocal?: boolean }) => Promise<void>;
  /** پاک‌کردنِ همه‌ی داده‌های محلی (همه‌ی دیتابیس‌ها). واردشده: بعدش pullِ کامل از سرور */
  clearLocalData: () => Promise<void>;
};

const SyncContext = createContext<SyncContextValue | null>(null);

const MODULE_LABELS: Record<MobileModuleKey, string> = {
  ROUTINE: "روتین",
  SLEEP: "خواب",
  TASKS: "تسک‌ها",
  EXERCISE: "بدنسازی",
  CALORIE: "کالری",
  TRADE: "ترید",
  ROADMAP: "رودمپ",
  AI_INSIGHT: "تحلیلِ هوشمند",
};

const NOTIF_KEY = "arion:notifications";

function readNotifPref(): boolean {
  try {
    return localStorage.getItem(NOTIF_KEY) === "1";
  } catch {
    return false;
  }
}

/** پیاده‌سازیِ واقعیِ RoadmapApi روی apiClientِ مشترک (auth/refresh) */
function makeRoadmapApi(api: ApiClient): RoadmapApi {
  const toRoadmapError = (err: unknown): Error => {
    if (err instanceof RoadmapApiError) return err;
    if (err instanceof ApiError) {
      if (err.kind === "session_expired") return new RoadmapApiError(401, "unauthorized");
      if (err.kind === "http") return new RoadmapApiError(err.status, err.serverMessage ?? "");
      return new RoadmapApiError(0, err.kind);
    }
    return new RoadmapApiError(0, "unknown");
  };
  return {
    async fetchRoadmaps(etag) {
      try {
        if (!api.baseUrl || !api.tokens.isLoggedIn()) throw new RoadmapApiError(401, "unauthorized");
        const res = await api.authedRaw("GET", "/api/mobile/roadmaps", undefined, { headers: etag ? { "If-None-Match": etag } : {} });
        if (res.status === 304) return { status: 304 };
        const body = await ApiClient.readJson(res);
        if (!res.ok) throw new RoadmapApiError(res.status, typeof body?.error === "string" ? body.error : "");
        return { status: 200, etag: res.headers.get("ETag") ?? "", data: Array.isArray(body?.roadmaps) ? body.roadmaps : [] };
      } catch (err) {
        throw toRoadmapError(err);
      }
    },
    async createAi(req) {
      try {
        if (!api.baseUrl || !api.tokens.isLoggedIn()) throw new RoadmapApiError(401, "unauthorized");
        const res = await api.authedRaw("POST", "/api/mobile/ai/roadmap", req, { timeoutMs: 75_000 });
        const body = await ApiClient.readJson(res);
        if (!res.ok || !body?.roadmap) throw new RoadmapApiError(res.status, typeof body?.error === "string" ? body.error : "");
        return body;
      } catch (err) {
        throw toRoadmapError(err);
      }
    },
  };
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { tokens, api, engine } = getSyncServices();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<MobileUser | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>(engine.getState());
  const [notificationsEnabled, setNotificationsEnabled] = useState(readNotifPref);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSync = useCallback(async () => {
    await engine.sync();
    // کاتالوگِ آفلاین (غذا/حرکت) — هر چند ساعت یک‌بار، با ETag
    if (engine.getState().status === "idle" && tokens.isLoggedIn()) void refreshCatalog(api);
  }, [api, engine, tokens]);

  const trigger = useCallback(() => {
    if (!SYNC_ENABLED || !tokens.isLoggedIn()) return;
    void runSync();
  }, [runSync, tokens]);

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

  // نوشتنِ محلی (هر ماژول) → سینک با debounce
  useEffect(() => {
    if (!SYNC_ENABLED) return;
    const off = onLocalWrite(
      () => {
        if (!tokens.isLoggedIn()) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          debounceRef.current = null;
          trigger();
        }, LOCAL_WRITE_DEBOUNCE_MS);
      },
      [...fitnessSyncTables, ...roadmapSyncTables, ...tradeSyncTables()]
    );
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
    await runSync();
  }, [runSync, tokens]);

  const afterLogin = useCallback(async () => {
    setSessionExpired(false);
    // دیتای مهمان/محلی از دست نمی‌ره: همه dirty ← push ← LWW
    await engine.prepareFirstSync();
    void runSync();
  }, [engine, runSync]);

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
      await engine.resetAfterLogout(wipeLocal ? () => wipeAllLocalData() : undefined);
      setSessionExpired(false);
    },
    [api, engine, tokens]
  );

  const clearLocalData = useCallback(async () => {
    await engine.idle();
    await wipeAllLocalData();
    // واردشده: cursorها از صفر تا دیتای سرور دوباره بیاد
    await engine.resetCursors();
    if (tokens.isLoggedIn()) void runSync();
  }, [engine, runSync, tokens]);

  const lockedModules = loggedIn ? syncState.lockedModules : [];
  const isModuleLocked = useCallback((m: GatedModule) => lockedModules.includes(m), [lockedModules]);

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
      lockedModules,
      isModuleLocked,
      api: SYNC_ENABLED ? api : null,
      syncNow,
      login,
      verify2fa,
      logout,
      clearLocalData,
    }),
    [ready, syncState, user, loggedIn, sessionExpired, lockedModules, isModuleLocked, api, syncNow, login, verify2fa, logout, clearLocalData]
  );

  const moreValue = useMemo(() => {
    const modules: PlanModule[] = (user?.modules ?? [])
      .filter((m) => !lockedModules.includes(m))
      .map((m) => ({ key: m, label: MODULE_LABELS[m] ?? m }));
    return {
      userName: user?.name ?? null,
      userPhone: null, // قراردادِ MobileUser شماره نداره
      planName: null, // قراردادِ MobileUser اسمِ پلن نداره
      modules,
      lastSyncTime: loggedIn && syncState.lastSyncAt ? formatLastSync(syncState.lastSyncAt) : null,
      onSync: () => void syncNow(),
      isSyncing: syncState.status === "syncing",
      onClearData: () => void clearLocalData(),
      isLoggedIn: loggedIn,
      onLogout: () => void logout({ wipeLocal: false }),
      notificationsEnabled,
      onNotificationsToggle: (enabled: boolean) => {
        setNotificationsEnabled(enabled);
        try {
          localStorage.setItem(NOTIF_KEY, enabled ? "1" : "0");
        } catch {
          /* noop */
        }
      },
    };
  }, [user, lockedModules, loggedIn, syncState.lastSyncAt, syncState.status, syncNow, clearLocalData, logout, notificationsEnabled]);

  const roadmapApi = useMemo(() => makeRoadmapApi(api), [api]);

  return (
    <SyncContext.Provider value={value}>
      <MoreProvider value={moreValue}>
        <RoadmapApiProvider value={roadmapApi}>{children}</RoadmapApiProvider>
      </MoreProvider>
    </SyncContext.Provider>
  );
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error("useSync must be used inside <SyncProvider>");
  return ctx;
}
