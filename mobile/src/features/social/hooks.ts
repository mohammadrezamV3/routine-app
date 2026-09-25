import { useCallback, useEffect, useRef, useState } from "react";
import { useNetworkStatus } from "@/lib/useNetworkStatus";
import { readCache, writeCache } from "./db";
import { describeSocialError, isModuleLocked, isOffline } from "./errors";

export type CachedResource<T> = {
  data: T | null;
  /** زمانِ ذخیره‌ی کش وقتی داده‌ی نمایشی از کشه (آفلاین/خطا) */
  staleSince: string | null;
  loading: boolean;
  error: string | null;
  locked: boolean;
  online: boolean;
  reload: () => Promise<void>;
  /** به‌روزرسانیِ محلی (بعد از یک عملیاتِ موفق) — کش هم بازنویسی می‌شه */
  mutate: (fn: (prev: T | null) => T | null) => void;
};

/**
 * «اول کش، بعد شبکه»: آخرین داده‌ی ذخیره‌شده فورا نمایش داده می‌شه، و اگه
 * آنلاین باشیم از سرور تازه می‌شه و کش بازنویسی می‌شه. آفلاین → فقط کش.
 */
export function useCachedResource<T>(key: string | null, fetcher: () => Promise<T>): CachedResource<T> {
  const online = useNetworkStatus();
  const [data, setData] = useState<T | null>(null);
  const [staleSince, setStaleSince] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const keyRef = useRef(key);
  keyRef.current = key;

  const reload = useCallback(async () => {
    const k = keyRef.current;
    if (!k) return;
    if (!online) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const fresh = await fetcherRef.current();
      if (keyRef.current !== k) return;
      setData(fresh);
      setStaleSince(null);
      setError(null);
      setLocked(false);
      await writeCache(k, fresh);
    } catch (err) {
      if (keyRef.current !== k) return;
      if (isModuleLocked(err)) setLocked(true);
      else if (!isOffline(err)) setError(describeSocialError(err));
    } finally {
      if (keyRef.current === k) setLoading(false);
    }
  }, [online]);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setStaleSince(null);
    setError(null);
    setLocked(false);
    setLoading(true);
    if (!key) return;
    void (async () => {
      const cached = await readCache<T>(key);
      if (cancelled) return;
      if (cached) {
        setData((cur) => cur ?? cached.value);
        setStaleSince(cached.savedAt);
      }
      await reload();
    })();
    return () => {
      cancelled = true;
    };
  }, [key, reload]);

  const mutate = useCallback((fn: (prev: T | null) => T | null) => {
    setData((prev) => {
      const next = fn(prev);
      const k = keyRef.current;
      if (k && next != null) void writeCache(k, next);
      return next;
    });
  }, []);

  return { data, staleSince, loading, error, locked, online, reload, mutate };
}

/** آیا صفحه/اپ الان دیده می‌شه (برای توقفِ پولینگ در پس‌زمینه) */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(() => typeof document === "undefined" || !document.hidden);
  useEffect(() => {
    const onChange = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);
  return visible;
}
