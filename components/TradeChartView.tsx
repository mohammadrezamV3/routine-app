"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSetting } from "@/lib/storage";
import { SETTING_KEYS } from "@/lib/userSettingKeys";
import { CAL_SYSTEM_KEY, CalSystem, TradeAccount, TradeTag } from "@/lib/tradeTypes";
import { TRADE_PAIRS } from "@/lib/tradePairs";
import { TradingViewChart } from "./TradingViewChart";
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
 * گفت‌وگو) از همان یک نماد پیروی می‌کنند؛ فقط از همون تنظیماتِ ذخیره‌شده
 * (`SYMBOL_KEY`) خونده می‌شه، دیگه فیلدِ جست‌وجویِ نمادِ جداگونه‌ای این‌جا
 * نیست — طبقِ درخواستِ صریح («جست‌وجوی نماد از داخلِ باکس حذف بشه، خودِ
 * تریدینگ‌ویو می‌تونه»). توجه: جست‌وجوی داخلِ خودِ iframeِ تریدینگ‌ویو
 * (allow_symbol_change) عوضِ نمادش فقط رویِ خودِ چارت اثر می‌ذاره، به
 * چت/ثبتِ‌معامله sync نمی‌شه (iframeِ ساده‌ست، نه APIِ رویدادیِ tv.js) —
 * برایِ عوض‌کردنِ نمادِ این سه بخش با هم، فعلاً راهی جز تغییرِ تنظیمات
 * نیست.
 *
 * تایم‌فریم عمداً این‌جا نیست — نوارِ بالاییِ خودِ تریدینگ‌ویو داردش و دو
 * جای کنترلِ یک چیز فقط گیج‌کننده است.
 */
export function TradeChartView() {
  // وقتی از صفحه‌ی یک چک‌لیستِ کامل («همه‌ی تیک‌ها خورده») اینجا می‌آییم
  // (?checklist=id)، همون چک‌لیست باید از پیش انتخاب شده باشه — طبقِ قاعده‌ی
  // پروژه (خوندنِ مستقیمِ window.location به‌جای useSearchParams+Suspense،
  // چون فقط مقدارِ اولیه لازم است، نه واکنش به تغییرِ زنده‌ی کوئری).
  const [presetChecklistId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("checklist")
  );
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

  if (loading) return <PanelSkeleton />;

  return (
    <div className="tv-page" ref={pageRef}>
      {/* عنوانِ «چارت» دیگر این‌جا نیست — عنوانِ خودِ صفحه شد
          (app/trade/chart/page.tsx)، بالای باکس و زیرِ لینکِ بازگشت. */}
      <div className="tv-chart-card">
        <div className="tv-chart-box">
          <TradingViewChart symbol={symbol} />
        </div>
      </div>

      <SymbolChatPanel symbol={symbol} />
      <ChartCalendarPanel />

      {/* دو کارتِ جدا برمی‌گرداند: چک‌لیست و ثبتِ معامله */}
      <ChartTradePanel
        symbol={symbol}
        accounts={accounts}
        tags={tags}
        calSystem={calSystem}
        initialChecklistId={presetChecklistId}
        onTagCreated={(t) => setTags((prev) => [...prev, t])}
        onSaved={() => load(true)}
      />
    </div>
  );
}
