"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "./ThemeProvider";
import { tradingViewSymbol } from "@/lib/tradingView";

// اگر تا این مدت iframe سیگنالِ لود ندهد، خودمان دوباره تلاش می‌کنیم.
const ATTEMPT_TIMEOUT_MS = 7_000;
const MAX_ATTEMPTS = 4;

/**
 * چارتِ تریدینگ‌ویو.
 *
 * تصمیمِ امنیتی: به‌جای اسکریپتِ رسمیِ `tv.js` از embedِ مستقیمِ iframe
 * استفاده می‌کنیم. `tv.js` باید داخلِ **originِ خودمان** اجرا شود (یعنی
 * `script-src` باید به تریدینگ‌ویو باز شود و آن اسکریپت به DOM و کوکی‌های
 * ما دسترسی دارد)، ولی iframe در originِ خودش جدا می‌ماند و فقط
 * `frame-src` باز می‌شود.
 *
 * چرا چارت بالا نمی‌آمد (باگِ قبلی): نمایشِ چارت به پروبی گره خورده بود
 * که **میزبانِ دیگری** را چک می‌کرد — یک تصویر از `s3.tradingview.com`،
 * درحالی‌که چیزی که واقعاً جاسازی می‌شود روی `s.tradingview.com` است. اگر
 * آن یکی زیردامنه در دسترس نبود (یا آن مسیر اصلاً تصویری برنمی‌گرداند، یا
 * یک افزونه‌ی مسدودکننده جلویش را می‌گرفت)، `reachable` غلط می‌شد و
 * **چارتِ کاملاً سالم هم مخفی می‌ماند**.
 *
 * حالا پروب دقیقاً همان چیزی را می‌زند که جاسازی می‌شود: یک
 * `fetch(..., {mode:"no-cors"})` به همان URLِ ویجت. پاسخِ opaque یعنی
 * «به سرور رسیدیم» (حتی اگر ۴۰۴ باشد) و rejectشدن یعنی «شبکه نرسید» —
 * یعنی دقیقاً همان چیزی که می‌خواهیم بدانیم، بدونِ حدس‌زدنِ میزبان.
 * برای همین `connect-src` در `next.config.js` به این میزبان باز شده است.
 *
 * و قاعده‌ی نمایش برعکسِ قبل شد: چارت **پیش‌فرض دیده می‌شود** و فقط وقتی
 * پنهان می‌ماند که مطمئن باشیم دسترسی برقرار نیست. حالتِ «هنوز نمی‌دانم»
 * دیگر چارت را مخفی نمی‌کند.
 */
export function TradingViewChart({ symbol }: { symbol: string }) {
  const { theme } = useTheme();
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [exhausted, setExhausted] = useState(false);
  // null = هنوز نمی‌دانیم. فقط مقدارِ صریحِ false چارت را کنار می‌زند.
  const [reachable, setReachable] = useState<boolean | null>(null);
  const attemptRef = useRef(0);

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

  const restart = useCallback(() => {
    attemptRef.current = 0;
    setAttempt(0);
    setLoaded(false);
    setExhausted(false);
  }, []);

  // با هر عوض‌شدنِ نماد/تم از نو شروع کن
  useEffect(() => { restart(); }, [tvSymbol, theme, restart]);

  // تا وقتی iframe لود نشده، خودش دوباره تلاش می‌کند.
  useEffect(() => {
    if (loaded || exhausted) return;
    const t = setTimeout(retry, ATTEMPT_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [loaded, exhausted, attempt, retry]);

  // آیا اصلاً به میزبانِ خودِ ویجت می‌رسیم؟ `no-cors` یعنی پاسخ را
  // نمی‌خوانیم (و لازم هم نداریم) — فقط resolve/reject برایمان مهم است:
  // resolve = شبکه رسید، reject = مسدود/در دسترس نیست.
  useEffect(() => {
    let alive = true;
    setReachable(null);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8_000);
    fetch(src, { mode: "no-cors", cache: "no-store", signal: ctrl.signal })
      .then(() => { if (alive) setReachable(true); })
      .catch(() => { if (alive) setReachable(false); })
      .finally(() => clearTimeout(t));
    return () => { alive = false; clearTimeout(t); ctrl.abort(); };
  }, [src]);

  // وقتی مطمئنیم دسترسی نیست، همان لحظه پیام می‌دهیم — نه بعد از چهار
  // تلاشِ بی‌فایده و نه با یک کادرِ سفیدِ بی‌توضیح (که همان صفحه‌ی خطای
  // خودِ مرورگر داخلِ iframe است).
  const blocked = reachable === false;

  if (exhausted || blocked) {
    return (
      <div className="tv-chart-frame">
        <div className="tv-chart-loading">
          <span style={{ maxWidth: 340, textAlign: "center", lineHeight: 1.9 }}>
            {blocked
              ? "دسترسی به سرورهای تریدینگ‌ویو از این اینترنت برقرار نشد — معمولاً یعنی دامنه‌شان مسدود است."
              : "چارت در چند تلاش بالا نیامد — ممکن است سرویس کند باشد."}
          </span>
          <button type="button" className="trade-ghost-btn" style={{ marginTop: 10 }} onClick={restart}>
            تلاش دوباره
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tv-chart-frame">
      {!loaded && (
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
        // sandbox عمداً نگه داشته شده ولی فقط برای یک چیز: جلوگیری از
        // `allow-top-navigation` — یعنی این iframe نمی‌تواند کلِ صفحه‌ی ما
        // را به جای دیگری ببرد. بقیه‌ی مجوزها باز شده‌اند چون هرکدامشان یک
        // راهِ دیگر برای «چارت بی‌صدا بالا نیامد» بودند: بدونِ
        // allow-same-origin به استوریجِ خودش دسترسی ندارد، و بدونِ
        // storage-access روی مرورگرهایی که کوکیِ شخصِ ثالث را می‌بندند
        // نیمه‌کاره می‌ماند. این‌ها همه به originِ **تریدینگ‌ویو** برمی‌گردند،
        // نه ما.
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-downloads allow-modals allow-storage-access-by-user-activation"
        style={{ opacity: loaded ? 1 : 0 }}
      />
    </div>
  );
}
