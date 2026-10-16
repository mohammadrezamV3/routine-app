"use client";

// دریافت /api/trade/hub — یک درخواست برای همه‌ی کارت‌های هاب ترید.
// stale-while-revalidate (مثل lib/useDashboardData.ts): آخرین پاسخ در حافظه‌ی
// ماژول می‌مونه، پس برگشتن به هاب آنی رندر می‌شه و تازه‌سازی پشت صحنه انجام
// می‌شه. حافظه‌ی ماژول *داخل state اولیه* خونده نمی‌شه (هیدریشن، CLAUDE.md)؛
// mount با null شروع می‌کنه و افکت مقدار کش‌شده رو می‌ذاره.

import { useCallback, useEffect, useRef, useState } from "react";
import { isoLocal } from "./jalali";
import { useLiveRefresh, useVisiblePolling } from "./liveSync";
import type { TradeHubData } from "./tradeHubTypes";

let cache: { key: string; data: TradeHubData; at: number } | null = null;
let inflight: { key: string; p: Promise<TradeHubData | null> } | null = null;
/** داده‌ی تازه‌تر از این موقع mount دوباره گرفته نمی‌شه */
const FRESH_MS = 20_000;

function requestKey() {
  const tz = -new Date().getTimezoneOffset();
  return `/api/trade/hub?date=${isoLocal(new Date())}&tz=${tz}`;
}

function load(force = false): Promise<TradeHubData | null> {
  const key = requestKey();
  if (!force && inflight?.key === key) return inflight.p;
  const p = fetch(key, { credentials: "same-origin" })
    .then((r) => (r.ok ? (r.json() as Promise<TradeHubData>) : null))
    .then((d) => { if (d) cache = { key, data: d, at: Date.now() }; return d; })
    .finally(() => { if (inflight?.p === p) inflight = null; });
  inflight = { key, p };
  return p;
}

const LIVE_KEYS = ["trade", "account"];

export function useTradeHub(enabled: boolean) {
  const [data, setData] = useState<TradeHubData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const refresh = useCallback((force = true) => {
    load(force)
      .then((d) => {
        if (!alive.current) return;
        if (d) { setData(d); setStatus("ready"); }
        else setStatus((s) => (s === "ready" ? s : "error"));
      })
      .catch(() => { if (alive.current) setStatus((s) => (s === "ready" ? s : "error")); });
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (cache && cache.key === requestKey()) {
      setData(cache.data);
      setStatus("ready");
      if (Date.now() - cache.at < FRESH_MS) return;
    }
    refresh(false);
  }, [enabled, refresh]);

  // ثبت/ویرایش/حذف معامله از هرجا (مودال، تب دیگه، همگام‌سازی متاتریدر) → تازه‌سازی
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useLiveRefresh(LIVE_KEYS, () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => refresh(true), 400);
  }, { includeFocus: false, enabled });
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  useVisiblePolling(() => refresh(true), 120_000, { realtimeIntervalMs: 5 * 60_000, enabled });

  return { data, status, refresh };
}
