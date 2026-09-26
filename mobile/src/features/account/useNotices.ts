import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { MobileNoticesResponse } from "@/lib/account-contract";
import { useNetworkStatus } from "@/lib/useNetworkStatus";
import { useAccountApi, type AccountApi } from "./api";

// کشِ ماژول‌سطحِ اطلاعیه‌ها — بَجِ زنگوله (هدر/تب) و صفحه‌ی اطلاعیه‌ها یک
// منبع دارن؛ «خوندن» توی صفحه فورا بَج رو هم صفر می‌کنه.
let state: MobileNoticesResponse | null = null;
const listeners = new Set<() => void>();
let inflight: Promise<void> | null = null;
let lastFetch = 0;
const MIN_REFRESH_MS = 60_000;

function emit(next: MobileNoticesResponse) {
  state = next;
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function refreshNotices(api: AccountApi, force = false): Promise<void> {
  if (inflight) return inflight;
  if (!force && Date.now() - lastFetch < MIN_REFRESH_MS && state) return Promise.resolve();
  inflight = api
    .listNotices()
    .then((r) => {
      lastFetch = Date.now();
      emit(r);
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export async function markRead(api: AccountApi, input: { ids?: string[]; all?: boolean }): Promise<void> {
  // خوش‌بینانه: بَج همین الان کم می‌شه، بعد جوابِ سرور جایگزین می‌شه
  if (state) {
    const ids = new Set(input.ids ?? []);
    const notices = state.notices.map((n) => (input.all || ids.has(n.id) ? { ...n, read: true } : n));
    emit({ notices, unreadCount: notices.filter((n) => !n.read).length });
  }
  emit(await api.markNoticesRead(input));
}

/** اطلاعیه‌ها + تعدادِ نخونده. با آنلاین شدن/فوکوس دوباره (حداکثر هر ۶۰ ثانیه) تازه می‌شه. */
export function useNotices() {
  const api = useAccountApi();
  const online = useNetworkStatus();
  const data = useSyncExternalStore(subscribe, () => state);

  const refresh = useCallback((force = false) => refreshNotices(api, force), [api]);

  useEffect(() => {
    if (!online) return;
    refresh().catch(() => {});
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [online, refresh]);

  return { data, unreadCount: data?.unreadCount ?? 0, refresh, markRead: (input: { ids?: string[]; all?: boolean }) => markRead(api, input) };
}

/** فقط برای تست */
export function __resetNoticesCache() {
  state = null;
  lastFetch = 0;
  inflight = null;
}
