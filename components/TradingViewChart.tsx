"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, RefreshCw, X } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { ChartInterval, tradingViewSymbol } from "@/lib/tradingView";

// اگر تا این مدت iframe سیگنالِ لود ندهد، یعنی عملاً بالا نمی‌آید.
const LOAD_TIMEOUT_MS = 9_000;
const PROBE_TIMEOUT_MS = 6_000;

/**
 * چارتِ تریدینگ‌ویو.
 *
 * تصمیمِ امنیتیِ مهم: به‌جای اسکریپتِ رسمیِ `tv.js` از embedِ مستقیمِ iframe
 * استفاده می‌کنیم. تفاوتش این است که `tv.js` باید داخلِ **originِ خودمان**
 * اجرا شود (یعنی `script-src` باید به تریدینگ‌ویو باز شود و آن اسکریپت به
 * DOM و کوکی‌های ما دسترسی دارد)، ولی iframe در originِ خودش جدا اجرا
 * می‌شود و فقط `frame-src` باز می‌شود. با یک ویجتِ شخصِ ثالث، جداسازی
 * ارزشِ چند خط کدِ اضافه را دارد.
 *
 * `sandbox` عمداً `allow-same-origin` دارد: بدونش خودِ تریدینگ‌ویو نمی‌تواند
 * به استوریجِ خودش دسترسی داشته باشد و چارت اصلاً بالا نمی‌آید. چون
 * `allow-same-origin` این‌جا به originِ **تریدینگ‌ویو** برمی‌گردد نه ما،
 * دسترسی‌ای به صفحه‌ی ما نمی‌دهد.
 *
 * تشخیصِ «بالا نیامد» چرا دو سیگنال دارد: وقتی درخواستِ iframe شکست
 * می‌خورد، مرورگر باز هم `onLoad` را صدا می‌زند (روی صفحه‌ی خطای خودش).
 * یعنی فقط با مهلتِ زمانی نمی‌شود فهمید — و کاربر یک قابِ خاکستریِ خالی
 * می‌بیند بدونِ هیچ توضیحی. برای همین یک پروبِ سبک هم می‌زنیم: یک تصویرِ
 * کوچک از خودِ تریدینگ‌ویو. اگر آن هم نیامد، یعنی دامنه در دسترس نیست
 * (شبکه، تحریمِ جغرافیایی، یا افزونه‌ی مسدودکننده).
 */
export function TradingViewChart({
  symbol,
  interval,
  height = 420,
}: {
  symbol: string;
  interval: ChartInterval;
  height?: number;
}) {
  const { theme } = useTheme();
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [reachable, setReachable] = useState<boolean | null>(null);
  // کاربر می‌تواند پیام را ببندد — اگر پروب اشتباه کرده باشد نباید در بن‌بست بماند
  const [dismissed, setDismissed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const src = useMemo(() => {
    const params = new URLSearchParams({
      symbol: tradingViewSymbol(symbol),
      interval,
      theme: theme === "light" ? "light" : "dark",
      style: "1", // کندل‌استیک
      locale: "fa_IR",
      timezone: "Asia/Tehran",
      withdateranges: "1",
      hide_side_toolbar: "1",
      allow_symbol_change: "0",
      save_image: "0",
      hide_volume: "0",
    });
    return `https://s.tradingview.com/widgetembed/?${params.toString()}`;
  }, [symbol, interval, theme]);

  // لینکِ خروجی برای وقتی embed بالا نمی‌آید
  const pageUrl = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tradingViewSymbol(symbol))}`;

  // با هر تغییرِ نماد/تایم‌فریم/تم، iframe دوباره لود می‌شود — پس اسکلتِ
  // لودینگ باید برگردد، وگرنه کاربر یک چارتِ کهنه می‌بیند و فکر می‌کند
  // تغییرش اثر نکرده.
  useEffect(() => {
    setLoaded(false);
    setTimedOut(false);
  }, [src, attempt]);

  useEffect(() => {
    if (loaded) return;
    const t = setTimeout(() => setTimedOut(true), LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [loaded, src, attempt]);

  // پروبِ در دسترس بودنِ دامنه. از `Image` استفاده می‌کنیم نه fetch، چون
  // CSPِ ما `connect-src 'self'` است ولی `img-src https:` را می‌دهد.
  useEffect(() => {
    let done = false;
    setReachable(null);
    setDismissed(false);
    const img = new Image();
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      setReachable(ok);
    };
    const t = setTimeout(() => finish(false), PROBE_TIMEOUT_MS);
    img.onload = () => { clearTimeout(t); finish(true); };
    img.onerror = () => { clearTimeout(t); finish(false); };
    // پارامترِ یکتا تا پاسخِ کششده‌ی قبلی جوابِ پروب نشود
    img.src = `https://s3.tradingview.com/favicon.ico?probe=${attempt}-${Date.now()}`;
    return () => { done = true; clearTimeout(t); img.onload = null; img.onerror = null; };
  }, [attempt]);

  const failed = !dismissed && (reachable === false || (!loaded && timedOut));

  return (
    <div className="trade-chart-frame" style={{ height }}>
      {!loaded && !failed && (
        <div className="trade-chart-loading">
          <span className="trade-chart-loading-dot" />
          در حال بارگذاری چارت…
        </div>
      )}

      {failed && (
        <div className="trade-chart-loading trade-chart-failed">
          <p>چارت تریدینگ‌ویو بالا نیامد — ممکن است شبکه، تحریم جغرافیایی یا یک افزونه‌ی مسدودکننده اجازه ندهد.</p>
          <div className="trade-chart-failed-actions">
            <button type="button" className="account-outline-btn" onClick={() => setAttempt((a) => a + 1)}>
              <RefreshCw size={14} /> تلاش دوباره
            </button>
            <a className="account-outline-btn" href={pageUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={14} /> باز کردن در تریدینگ‌ویو
            </a>
            <button type="button" className="trade-ghost-btn" onClick={() => setDismissed(true)}>
              <X size={14} /> بستن پیام
            </button>
          </div>
        </div>
      )}

      <iframe
        key={`${src}#${attempt}`}
        src={src}
        title="چارت تریدینگ‌ویو"
        onLoad={() => setLoaded(true)}
        loading="lazy"
        referrerPolicy="origin"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        style={{
          opacity: loaded && !failed ? 1 : 0,
          pointerEvents: loaded && !failed ? "auto" : "none",
        }}
      />
    </div>
  );
}
