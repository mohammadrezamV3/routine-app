"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// خواندن داده‌ی صفحات تحلیلی پنل — یک‌جا به‌جای fetch().then(r=>r.json())
// پراکنده که: ۱) res.ok رو چک نمی‌کرد (403/500 → کرش روی فیلدهای نبوده)،
// ۲) درخواست قدیمی‌تر (بازه‌ی قبلی) می‌تونست بعد از جدیدتر برسه و دیتای
// اشتباه نشون بده، ۳) حالت خطا نداشت و «در حال بارگذاری» تا ابد می‌موند.
// داده‌ی قبلی موقع عوض‌شدن بازه نگه داشته می‌شه (بدون پرش) و `loading`
// جدا اعلام می‌شه.
export function useAdminData<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(!!url);
  const [nonce, setNonce] = useState(0);
  const seq = useRef(0);

  useEffect(() => {
    if (!url) return;
    const id = ++seq.current;
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    fetch(url, { signal: ctrl.signal, cache: "no-store" })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok || !body) throw new Error((body as any)?.error || "خطا در دریافت اطلاعات");
        return body as T;
      })
      .then((body) => { if (id === seq.current) setData(body); })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted || id !== seq.current) return;
        setError(e instanceof Error && e.message ? e.message : "خطا در دریافت اطلاعات");
      })
      .finally(() => { if (id === seq.current) setLoading(false); });
    return () => ctrl.abort();
  }, [url, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, error, loading, reload };
}
