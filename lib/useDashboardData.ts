"use client";

// دریافتِ /api/dashboard — یک درخواست برای همه‌ی بخش‌ها (نه ده فچِ جدا).
// stale-while-revalidate: آخرین پاسخ در حافظه‌ی ماژول می‌مونه، پس برگشتن به
// داشبورد از هر صفحه‌ی دیگه آنی رندر می‌شه و تازه‌سازی پشتِ صحنه انجام می‌شه.
// تازه‌سازی: رویدادهای زنده‌ی هر ماژول (lib/liveSync.ts) + پولینگِ آرام فقط
// وقتی تب دیده می‌شه.

import { useCallback, useEffect, useRef, useState } from "react";
import { isoLocal } from "./jalali";
import { useLiveRefresh, useVisiblePolling } from "./liveSync";
import type { DashboardData } from "./dashboardTypes";

let cache: { key: string; data: DashboardData } | null = null;
let inflight: { key: string; p: Promise<DashboardData | null> } | null = null;

function requestKey() {
  const tz = -new Date().getTimezoneOffset();
  return `/api/dashboard?date=${isoLocal(new Date())}&tz=${tz}`;
}

function load(force = false): Promise<DashboardData | null> {
  const key = requestKey();
  if (!force && inflight?.key === key) return inflight.p;
  const p = fetch(key, { credentials: "same-origin" })
    .then(async (r) => {
      if (r.status === 403 || r.status === 401) throw Object.assign(new Error("forbidden"), { status: r.status });
      return r.ok ? ((await r.json()) as DashboardData) : null;
    })
    .then((d) => { if (d) cache = { key, data: d }; return d; })
    .finally(() => { if (inflight?.p === p) inflight = null; });
  inflight = { key, p };
  return p;
}

/** شروعِ زودهنگامِ درخواست (قبل از mount) — از DashboardClient موقعِ import صدا زده می‌شه */
export function prefetchDashboard() {
  if (typeof window === "undefined") return;
  load().catch(() => {});
}

const LIVE_KEYS = ["exercise", "calorie", "trade", "roadmaps", "notifications", "mentor:mentorship", "mentor:messages", "account"];

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(cache?.data ?? null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "forbidden">(cache ? "ready" : "loading");
  const alive = useRef(true);
  // StrictMode (dev) افکت رو mount→unmount→mount می‌کنه؛ بدونِ ست‌کردنِ دوباره، همه‌ی پاسخ‌ها دور ریخته می‌شد
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const refresh = useCallback((force = true) => {
    load(force)
      .then((d) => {
        if (!alive.current) return;
        if (d) { setData(d); setStatus("ready"); }
        else setStatus((s) => (s === "ready" ? s : "error"));
      })
      .catch((e) => {
        if (!alive.current) return;
        setStatus(e?.status === 403 || e?.status === 401 ? "forbidden" : "error");
      });
  }, []);

  useEffect(() => { refresh(false); }, [refresh]);

  // تغییرِ هر ماژول (از همین تب یا دستگاهِ دیگه) → یک تازه‌سازیِ تجمیعی.
  // debounce: چند رویدادِ پشتِ‌سرهم (مثلا ثبتِ چند غذا) فقط یک درخواست.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useLiveRefresh(LIVE_KEYS, () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => refresh(true), 400);
  }, { includeFocus: false });
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  useVisiblePolling(() => refresh(true), 90_000, { realtimeIntervalMs: 5 * 60_000 });

  return { data, status, refresh };
}
