"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "./ThemeProvider";
import { tradingViewSymbol } from "@/lib/tradingView";

// اگر تا این مدت iframe سیگنالِ لود ندهد، خودمان دوباره تلاش می‌کنیم.
const ATTEMPT_TIMEOUT_MS = 6_000;
const MAX_ATTEMPTS = 6;

/**
 * چارتِ تریدینگ‌ویو.
 *
 * تصمیمِ امنیتی: به‌جای اسکریپتِ رسمیِ `tv.js` از embedِ مستقیمِ iframe
 * استفاده می‌کنیم. `tv.js` باید داخلِ **originِ خودمان** اجرا شود (یعنی
 * `script-src` باید به تریدینگ‌ویو باز شود و آن اسکریپت به DOM و کوکی‌های
 * ما دسترسی دارد)، ولی iframe در originِ خودش جدا می‌ماند و فقط
 * `frame-src` باز می‌شود.
 *
 * بارِ اول چرا بالا نمی‌آمد: `loading="lazy"` بود و کنارِ آن یک لایه‌ی
 * خطا که با مهلتِ زمانی ظاهر می‌شد. حالا:
 *   • `loading="eager"` — بلافاصله شروع می‌کند.
 *   • اگر تا مهلت لود نشد، **خودش دوباره تلاش می‌کند** (تا شش بار) به‌جای
 *     اینکه پیامِ خطا نشان دهد. تا وقتی تلاش‌ها تمام نشده، کاربر فقط
 *     حالتِ بارگذاری را می‌بیند و نه چیزِ دیگری.
 */
export function TradingViewChart({ symbol }: { symbol: string }) {
  const { theme } = useTheme();
  const [loaded, setLoaded] = useState(false);
  const [reachable, setReachable] = useState<boolean | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [exhausted, setExhausted] = useState(false);
  const attemptRef = useRef(0);

  // وقتی درخواستِ iframe شکست می‌خورد، مرورگر باز هم `onLoad` را صدا
  // می‌زند (روی صفحه‌ی خطای خودش) — یعنی فقط با `onLoad` نمی‌شود فهمید
  // چارت واقعاً آمده یا یک صفحه‌ی خطای سفید نشسته آن‌جا. این پروبِ سبک
  // (یک تصویرِ کوچک از خودِ تریدینگ‌ویو، که با `img-src https:`ِ موجود
  // کار می‌کند) تفاوت را مشخص می‌کند و تلاشِ دوباره را راه می‌اندازد.
  useEffect(() => {
    let done = false;
    setReachable(null);
    const img = new Image();
    const finish = (ok: boolean) => { if (!done) { done = true; setReachable(ok); } };
    const t = setTimeout(() => finish(false), 5_000);
    img.onload = () => { clearTimeout(t); finish(true); };
    img.onerror = () => { clearTimeout(t); finish(false); };
    img.src = `https://s3.tradingview.com/favicon.ico?p=${attempt}-${Date.now()}`;
    return () => { done = true; clearTimeout(t); img.onload = null; img.onerror = null; };
  }, [attempt]);

  const tvSymbol = tradingViewSymbol(symbol);

  const src = useMemo(() => {
    const params = new URLSearchParams({
      symbol: tvSymbol,
      interval: "60",
      theme: theme === "light" ? "light" : "dark",
      style: "1", // کندل‌استیک
      locale: "fa_IR",
      timezone: "Asia/Tehran",
      // ابزارهای رسم (خط روند، فیبوناچی، …) — نوارِ کناری باید باز باشد
      hide_side_toolbar: "0",
      // نوارِ بالاییِ خودِ تریدینگ‌ویو تایم‌فریم را دارد، پس ما جدا نمی‌سازیم
      hide_top_toolbar: "0",
      withdateranges: "1",
      allow_symbol_change: "0",
      save_image: "1",
      details: "0",
      hide_legend: "0",
      // نسخه‌ی کش‌شکن: هر تلاشِ دوباره یک URLِ تازه می‌خواهد وگرنه مرورگر
      // همان پاسخِ شکست‌خورده‌ی قبلی را برمی‌گرداند.
      _t: String(attempt),
    });
    return `https://s.tradingview.com/widgetembed/?${params.toString()}`;
  }, [tvSymbol, theme, attempt]);

  const retry = useCallback(() => {
    if (attemptRef.current >= MAX_ATTEMPTS) { setExhausted(true); return; }
    attemptRef.current += 1;
    setAttempt(attemptRef.current);
  }, []);

  // با هر عوض‌شدنِ نماد/تم از نو شروع کن
  useEffect(() => {
    attemptRef.current = 0;
    setAttempt(0);
    setLoaded(false);
    setExhausted(false);
  }, [tvSymbol, theme]);


  // «آماده» یعنی هم iframe لود شده، هم دامنه واقعاً در دسترس است
  const ready = loaded && reachable === true;

  // تا وقتی آماده نشده، خودش دوباره تلاش می‌کند — کاربر فقط حالتِ
  // بارگذاری را می‌بیند و نه هیچ پیام یا دکمه‌ی دیگری.
  useEffect(() => {
    if (ready || exhausted) return;
    const t = setTimeout(retry, ATTEMPT_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [ready, exhausted, attempt, retry]);

  // قبلاً وقتی هر ۶ تلاش شکست می‌خورد (مثلاً چون s.tradingview.com از
  // اینترنتِ کاربر در دسترس نیست)، `exhausted` ست می‌شد ولی هیچ‌جا رندر
  // نمی‌شد — کاربر تا ابد فقط «در حال بارگذاری…» می‌دید، انگار چارت
  // اصلاً بالا نمی‌آید، بدونِ هیچ توضیحی. حالا یک پیامِ روشن + دکمه‌ی
  // تلاشِ دوباره نشون داده می‌شه.
  if (exhausted) {
    return (
      <div className="tv-chart-frame">
        <div className="tv-chart-loading">
          <span style={{ maxWidth: 320, textAlign: "center", lineHeight: 1.9 }}>
            چارت لود نشد — ممکنه دسترسی به سرویسِ تریدینگ‌ویو از اینترنتِ فعلی مسدود یا کند باشه.
          </span>
          <button
            type="button"
            className="trade-ghost-btn"
            style={{ marginTop: 10 }}
            onClick={() => { attemptRef.current = 0; setAttempt(0); setLoaded(false); setExhausted(false); }}
          >
            تلاش دوباره
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tv-chart-frame">
      {!ready && (
        <div className="tv-chart-loading">
          <span className="tv-chart-spinner" aria-hidden="true" />
          <span>در حال بارگذاری چارت…</span>
        </div>
      )}
      <iframe
        key={src}
        src={src}
        title="چارت تریدینگ‌ویو"
        onLoad={() => setLoaded(true)}
        loading="eager"
        referrerPolicy="origin"
        // بدونِ allow-same-origin خودِ تریدینگ‌ویو به استوریجِ خودش دسترسی
        // ندارد و چارت اصلاً بالا نمی‌آید. این‌جا به originِ **تریدینگ‌ویو**
        // برمی‌گردد نه ما، پس دسترسی‌ای به صفحه‌ی ما نمی‌دهد.
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads"
        style={{ opacity: ready ? 1 : 0 }}
      />
    </div>
  );
}
