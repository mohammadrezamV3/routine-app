"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { DashCard } from "./DashCard";
import { getWeekStats, WeekDayStat } from "@/lib/routineStats";
import { useLiveRefresh } from "@/lib/liveSync";
import { BarChart3 } from "lucide-react";


// میله‌ها وقتی پر می‌شن که واقعا دیده بشن: اسپلش (data-boot روی <html>) تموم شده
// و کارت داخل صفحه‌ی دیده‌شده‌ست (IntersectionObserver، یک بار برای هر کلید).
// قبلا انیمیشن موقع mount شروع می‌شد، یعنی زیر اسپلش یا پایین‌تر از صفحه تموم
// می‌شد و کاربر هیچ‌وقت ندیدش. فقط transform، بدون framer؛ با حرکت‌کاهی بدون
// انیمیشن و مستقیم حالت نهایی (CSS).
const SPLASH_WAIT_CAP_MS = 12000;

function whenSplashDone(cb: () => void): () => void {
  const html = document.documentElement;
  const isDone = () => { const v = html.getAttribute("data-boot"); return !v || v === "done"; };
  if (isDone()) { cb(); return () => {}; }
  let fired = false;
  const fire = () => { if (fired) return; fired = true; mo.disconnect(); clearTimeout(cap); cb(); };
  const mo = new MutationObserver(() => { if (isDone()) fire(); });
  mo.observe(html, { attributes: true, attributeFilter: ["data-boot"] });
  const cap = setTimeout(fire, SPLASH_WAIT_CAP_MS);
  return () => { fired = true; mo.disconnect(); clearTimeout(cap); };
}

function useBarsReveal(el: HTMLElement | null, key: string): boolean {
  const [playedKey, setPlayedKey] = useState<string | null>(null);
  useEffect(() => {
    if (!el || !key) return;
    let io: IntersectionObserver | null = null;
    const stopSplash = whenSplashDone(() => {
      if (typeof IntersectionObserver === "undefined") { setPlayedKey(key); return; }
      io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) { setPlayedKey(key); io?.disconnect(); }
      }, { threshold: 0.4 });
      io.observe(el);
    });
    return () => { stopSplash(); io?.disconnect(); };
  }, [el, key]);
  return playedKey === key;
}

// نمودار میله‌ای آمار هفتگی — درصد واقعی هرروز (از DailyEntry.completedItems
// نسبت به تعداد برنامه‌های همون روز)، راست‌چین طبیعی: شنبه راست، جمعه چپ.
export function DashWeeklyChartCard({ delay, refreshKey }: { delay?: number; refreshKey?: number }) {
  const [stats, setStats] = useState<WeekDayStat[] | null>(null);

  useEffect(() => { getWeekStats().then(setStats); }, [refreshKey]);
  // هر تیک/تغییر برنامه (از هرجا) همون لحظه نمودار رو از داده‌ی زنده حساب می‌کنه
  useLiveRefresh(["daily", "customOccurrences", "removedOccurrences"], () => { getWeekStats().then(setStats); });

  const rows = stats ?? [];
  // هفته‌ی عوض‌شده یا رسیدن اولین داده دوباره پرشدن رو شروع می‌کنه
  const [barsEl, setBarsEl] = useState<HTMLElement | null>(null);
  const played = useBarsReveal(barsEl, stats ? (rows[0]?.iso ?? "empty") : "");
  const maxPct = Math.max(1, ...rows.map((s) => s.pct));

  return (
    <DashCard delay={delay}>
      <h2 className="flex items-center gap-1.5 text-right text-[14px] font-bold text-dash-text sm:text-[15px]">
        <BarChart3 className="h-4 w-4 text-dash-green sm:h-[18px] sm:w-[18px]" />
        آمار هفتگی
      </h2>

      {stats === null ? (
        <div className="mt-4 text-[11px] text-dash-muted sm:text-[12px] is-loading">در حال بارگذاری…</div>
      ) : (
        <div className="mt-5 flex items-end gap-3">
          <div ref={setBarsEl} className="flex flex-1 items-end justify-between gap-1.5 sm:gap-2">
            {rows.map((s, i) => {
              const peak = s.pct > 0 && s.pct === maxPct;
              return (
                <div key={s.iso} className="flex flex-1 flex-col items-center gap-1 sm:gap-1.5">
                  <span className={cn("text-[9px] font-semibold sm:text-[10px]", peak ? "text-dash-green" : "text-dash-muted")}>{s.pct}٪</span>
                  <div className="flex h-24 w-full items-end justify-center sm:h-28">
                    {/* پرشدن نرم با CSS (scaleY، فقط کامپوزیت) نه framer — روی
                        گوشی ضعیف MotionTuner انیمیشن‌های framer رو خاموش می‌کنه،
                        ولی این میله‌ها باید همه‌جا مثل دسکتاپ پر بشن. تا لحظه‌ی
                        دیده‌شدن (useBarsReveal) میله‌ها در حالت صفرن. */}
                    <div
                      className={cn(played ? "dash-bar-grow" : "dash-bar-hold", "w-2 rounded-full sm:w-2.5")}
                      style={{
                        height: `${Math.max(s.pct > 0 ? 4 : 1, s.pct)}%`,
                        animationDelay: `${0.1 + i * 0.05}s`,
                        background: peak ? "var(--accent)" : "rgba(var(--accent-rgb),.45)",
                        boxShadow: peak ? "0 0 12px rgba(var(--accent-rgb),.6)" : "none",
                      }}
                    />
                  </div>
                  <span className="text-[9.5px] text-dash-muted sm:text-[11.5px]">{s.short}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </DashCard>
  );
}
