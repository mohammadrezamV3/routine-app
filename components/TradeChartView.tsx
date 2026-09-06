"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { getSetting, setSetting } from "@/lib/storage";
import { SETTING_KEYS } from "@/lib/userSettingKeys";
import { CAL_SYSTEM_KEY, CalSystem, TradeAccount, TradeTag } from "@/lib/tradeTypes";
import { TRADE_PAIRS } from "@/lib/tradePairs";
import { TradingViewChart } from "./TradingViewChart";
import { SymbolSearchField } from "./SymbolSearchField";
import { ChartTradePanel } from "./ChartTradePanel";
import { ChartCalendarPanel } from "./ChartCalendarPanel";
import { SymbolChatPanel } from "./SymbolChatPanel";
import { PanelSkeleton } from "./PanelSkeleton";

const SYMBOL_KEY = SETTING_KEYS.tradeChartSymbol;

/**
 * صفحه‌ی چارت.
 *
 * چیدمانِ دسکتاپ (راست‌به‌چپ) — یک گریدِ دوردیفه که کلِ ارتفاعِ پنجره را
 * می‌گیرد و **اسکرول نمی‌شود**؛ هر خانه خودش داخلش اسکرول دارد:
 *
 *     ┌──────────────────────────┬──────────┐
 *     │          چارت            │ چک‌لیست  │
 *     ├─────────────┬────────────┤──────────┤
 *     │  گفت‌وگو     │ اخبار      │ ثبت معامله│
 *     └─────────────┴────────────┴──────────┘
 *
 * موبایل: تک‌ستونه، به ترتیبِ چارت → گفت‌وگو → چک‌لیست → ثبتِ معامله →
 * اخبارِ اقتصادی، و صفحه مثل قبل اسکرول می‌شود.
 *
 * هر پنج خانه مستقیماً بچه‌ی همین گریدند (نه داخلِ یک ستونِ واسط) — وگرنه
 * خانه‌ها نمی‌توانستند در دو محور جدا از هم جا بگیرند.
 *
 * نماد یک انتخابِ سراسریِ صفحه است: هر سه بخش (چارت، ثبتِ معامله، اتاقِ
 * گفت‌وگو) از همان یک نماد پیروی می‌کنند.
 *
 * تایم‌فریم عمداً این‌جا نیست — نوارِ بالاییِ خودِ تریدینگ‌ویو داردش و دو
 * جای کنترلِ یک چیز فقط گیج‌کننده است.
 */
export function TradeChartView() {
  const [symbol, setSymbol] = useState("EURUSD");
  const [accounts, setAccounts] = useState<TradeAccount[]>([]);
  const [tags, setTags] = useState<TradeTag[]>([]);
  const [calSystem, setCalSystem] = useState<CalSystem>("jalali");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSetting<CalSystem>(CAL_SYSTEM_KEY, "jalali").then(setCalSystem);
    getSetting<string>(SYMBOL_KEY, "EURUSD").then((v) => {
      if (v && TRADE_PAIRS.some((p) => p.code === v)) setSymbol(v);
    });
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [aRes, tRes] = await Promise.all([
        fetch("/api/trade/accounts?archived=0"),
        fetch("/api/trade/tags"),
      ]);
      setAccounts(aRes.ok ? (await aRes.json()).accounts || [] : []);
      setTags(tRes.ok ? (await tRes.json()).tags || [] : []);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ارتفاعِ گرید را دقیقاً «از بالای خودش تا کفِ پنجره» می‌گیریم تا صفحه
  // اسکرول نخورد. با CSS تنها نمی‌شد: ارتفاعِ سرصفحه‌ی این صفحه (لینکِ
  // بازگشت + عنوان + توضیح) ثابت نیست و با شکستنِ خطوط عوض می‌شود، پس هر
  // عددِ ثابتی یا فضا هدر می‌داد یا کمی اسکرول می‌ساخت.
  const pageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (loading) return;
    const el = pageRef.current;
    if (!el) return;
    const apply = () => {
      if (window.innerWidth < 1024) { el.style.removeProperty("--tv-h"); return; }
      const top = el.getBoundingClientRect().top;
      // پدینگِ پایینِ body باید حساب شود، وگرنه دقیقاً به همان اندازه صفحه
      // اسکرول می‌خورد — همان چیزی که قرار بود نباشد. ولی روی دسکتاپ هیچ
      // نوارِ ثابتی کفِ صفحه نیست و آن ۹۰ پیکسل فقط فضای تنفس است، پس
      // بیش از ۲۴ پیکسلش را به چارت می‌دهیم.
      const bodyPad = parseFloat(getComputedStyle(document.body).paddingBottom) || 0;
      const h = window.innerHeight - top - Math.min(bodyPad, 24) - 12;
      el.style.setProperty("--tv-h", `${Math.max(520, Math.round(h))}px`);
    };
    apply();
    // ورودِ صفحه یک انیمیشنِ ۳۶۰ms دارد که تا تمام نشود `top` واقعی نیست —
    // پس بعد از پایانش یک‌بار دیگر اندازه می‌گیریم.
    const t = setTimeout(apply, 460);
    window.addEventListener("resize", apply);
    return () => { clearTimeout(t); window.removeEventListener("resize", apply); };
  }, [loading]);

  function changeSymbol(next: string) {
    setSymbol(next);
    setSetting(SYMBOL_KEY, next);
  }

  // فول‌اسکرینِ چارت — روی خودِ کارتِ `.tv-chart-card` (نه فقط iframe) تا
  // نوارِ جست‌وجوی نماد هم همراهش بماند.
  //
  // چرا دکمه قبلاً «کار نمی‌کرد»: Fullscreen API استاندارد
  // (`Element.requestFullscreen`) روی سافاری/iOS اصلاً پیاده‌سازی نشده
  // (فقط `webkitEnterFullscreen` روی خودِ تگ `<video>` کار می‌کند) و روی
  // بعضی وب‌ویوها هم به‌خاطرِ Permissions-Policy رد می‌شود — نتیجه‌اش یک
  // `catch(() => {})`ی بی‌صدا بود، یعنی از دیدِ کاربر دکمه هیچ اتفاقی
  // نمی‌انداخت. حالا اول همان API استاندارد امتحان می‌شود و اگر پشتیبانی
  // نشد/رد شد، یک حالتِ «شبه‌فول‌اسکرین» با CSS (`position:fixed` روی کلِ
  // ویوپورت) جایگزین می‌شود که به هیچ APIِ مرورگری وابسته نیست.
  const chartCardRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const onChange = () => {
      if (document.fullscreenElement === chartCardRef.current) setIsFullscreen(true);
      else if (document.fullscreenElement === null) setIsFullscreen((v) => (chartCardRef.current?.dataset.pseudoFs ? v : false));
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  useEffect(() => {
    if (!isFullscreen) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") exitFullscreen(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullscreen]);
  function exitFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    if (chartCardRef.current) delete chartCardRef.current.dataset.pseudoFs;
    setIsFullscreen(false);
  }
  async function toggleFullscreen() {
    if (isFullscreen) { exitFullscreen(); return; }
    const el = chartCardRef.current;
    if (!el) return;
    try {
      if (!el.requestFullscreen) throw new Error("unsupported");
      await el.requestFullscreen();
      setIsFullscreen(true);
    } catch {
      el.dataset.pseudoFs = "1";
      setIsFullscreen(true);
    }
  }

  if (loading) return <PanelSkeleton />;

  return (
    <div className="tv-page" ref={pageRef}>
      <div className={`tv-chart-card${isFullscreen ? " tv-pseudo-fullscreen" : ""}`} ref={chartCardRef}>
        <div className="tv-chart-toolbar">
          <span className="tv-chart-title">چارت</span>
          <SymbolSearchField symbol={symbol} onChange={changeSymbol} />
          <button
            type="button"
            className="trade-icon-btn tv-chart-fullscreen-btn"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "خروج از حالت تمام‌صفحه" : "تمام‌صفحه"}
            title={isFullscreen ? "خروج از حالت تمام‌صفحه" : "تمام‌صفحه"}
          >
            {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>
        </div>
        <TradingViewChart symbol={symbol} />
      </div>

      <SymbolChatPanel symbol={symbol} />
      <ChartCalendarPanel />

      {/* دو کارتِ جدا برمی‌گرداند: چک‌لیست و ثبتِ معامله */}
      <ChartTradePanel
        symbol={symbol}
        accounts={accounts}
        tags={tags}
        calSystem={calSystem}
        onTagCreated={(t) => setTags((prev) => [...prev, t])}
        onSaved={() => load(true)}
      />
    </div>
  );
}
