"use client";

// قلاب مشترک همه‌ی کادرهای جستجوی زنده: debounce، لغو درخواست کهنه با
// AbortController، بدون درخواست برای ورودی کوتاه، و احترام به Retry-After
// (429/503) با یک پیام کوتاه داخل صفحه و یک تلاش خودکار بعد از انتظار — بدون
// طوفان تلاش مجدد (در دوره‌ی انتظار هیچ درخواستی نمی‌ره).
import { useEffect, useRef, useState } from "react";
import { isBackoffStatus, limitNotice, parseRetryAfterSec, shouldSearch } from "@/lib/searchClient";

type Opts<T> = {
  query: string;
  buildUrl: (q: string) => string;
  parse: (json: any) => T;
  minLength?: number;
  debounceMs?: number;
  enabled?: boolean;
};

export function useSearchQuery<T>({ query, buildUrl, parse, minLength = 2, debounceMs = 250, enabled = true }: Opts<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const cooldown = useRef<{ until: number; status: number }>({ until: 0, status: 429 });
  const buildRef = useRef(buildUrl); buildRef.current = buildUrl;
  const parseRef = useRef(parse); parseRef.current = parse;

  useEffect(() => {
    const q = query.trim();
    if (!enabled || !shouldSearch(q, minLength)) { setData(null); setLoading(false); setNotice(null); return; }

    const ac = new AbortController();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let ticker: ReturnType<typeof setInterval> | null = null;
    setLoading(true);

    const run = async () => {
      try {
        const res = await fetch(buildRef.current(q), { signal: ac.signal, cache: "no-store" });
        if (ac.signal.aborted) return;
        if (isBackoffStatus(res.status)) {
          const sec = parseRetryAfterSec(res.headers.get("Retry-After"));
          cooldown.current = { until: Date.now() + sec * 1000, status: res.status };
          waitThenRun();
          return;
        }
        if (!res.ok) { setData(null); setNotice(null); setLoading(false); return; }
        setNotice(null);
        setData(parseRef.current(await res.json()));
        setLoading(false);
      } catch {
        // لغو یا قطع شبکه: بی‌صدا؛ ورودی بعدی دوباره امتحان می‌کنه
        if (!ac.signal.aborted) { setData(null); setLoading(false); }
      }
    };

    const waitThenRun = () => {
      const left = cooldown.current.until - Date.now();
      if (left <= 0) { setNotice(null); void run(); return; }
      const show = () => setNotice(limitNotice(cooldown.current.status, Math.max(1, Math.ceil((cooldown.current.until - Date.now()) / 1000))));
      show();
      setLoading(false);
      ticker = setInterval(show, 1000);
      timer = setTimeout(() => { if (ticker) clearInterval(ticker); setNotice(null); setLoading(true); void run(); }, left);
    };

    // اگه هنوز توی دوره‌ی انتظار هستیم، صبر می‌کنیم؛ وگرنه بعد از debounce
    timer = setTimeout(() => { if (cooldown.current.until > Date.now()) waitThenRun(); else void run(); }, debounceMs);

    return () => { ac.abort(); if (timer) clearTimeout(timer); if (ticker) clearInterval(ticker); };
  }, [query, minLength, debounceMs, enabled]);

  return { data, loading, notice };
}
