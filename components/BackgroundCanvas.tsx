"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate } from "animejs";
import {
  type BgTier,
  createJankMonitor,
  initialTierGuess,
  probeFrameTime,
  refineTierWithProbe,
  writeCachedTier,
} from "@/lib/backgroundTier";

// بک‌گراند نور محیطی (aurora) — چند بلاب نرم و تار سبز. هر بلاب توی یک
// wrapper جداست: خود بلاب انیمیشن شناور CSS همیشگی‌شو داره، wrapper با
// anime.js بر اساس موقعیت ماوس جابه‌جا می‌شه (هر عمق با نسبت متفاوت) — حس
// یک صحنه‌ی سه‌بعدی و زنده به‌جای یک پس‌زمینه‌ی ثابت.
//
// تشخیصِ توانِ دستگاه (lib/backgroundTier.ts): قبلا تنها معیار globals.css
// بود «هر دستگاهِ لمسی = بی‌انیمیشن» — یعنی یک گوشیِ قوی دقیقا همون نسخه‌ی
// افتاده‌ی یک گوشیِ ضعیف رو می‌گرفت. حالا سه تیر داریم (low/mid/high) که از
// روی سیگنال‌های سخت‌افزاری/شبکه + یک پروبِ واقعیِ FPS تعیین می‌شن، و مارک‌آپ
// همیشه ثابت رندر می‌شه (بدونِ شرط روی state) — فقط بعدِ مونت با استایلِ
// inline کنترل می‌شن، که هم فلشِ هیدریشن نداره هم چون inline style از قانونِ
// stylesheet (حتی media query) برنده‌ست، می‌تونه رده‌ی pointer:coarse رو
// برای گوشیِ قوی (تیرِ high) دوباره فعال کنه.
const DEPTHS = [16, 26, 34];

const BLOB_ANIM_BY_INDEX = [
  "auroraDriftA 26s ease-in-out infinite",
  "auroraDriftB 32s ease-in-out infinite",
  "auroraDriftC 40s ease-in-out infinite",
];

// چند بلاب برای هر تیر فعاله + چقدر بلور بخوره (null = بلورِ پیش‌فرضِ CSS،
// یعنی blur(120px) برای high، یا کلا بی‌بلور برای low).
const TIER_CONFIG: Record<BgTier, { blobs: number; blurPx: number | null }> = {
  low: { blobs: 1, blurPx: null },
  mid: { blobs: 2, blurPx: 48 },
  high: { blobs: 3, blurPx: null },
};

export function BackgroundCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  // با همون چیزی شروع می‌شه که SSR رندر کرده (high) تا فلش/میسمچ نباشه؛
  // تیرِ واقعی بلافاصله توی useLayoutEffect (قبل از پینت) اصلاح می‌شه.
  const [tier, setTierState] = useState<BgTier>("high");
  const tierRef = useRef<BgTier>("high");

  function setTier(next: BgTier) {
    if (tierRef.current === next) return;
    tierRef.current = next;
    setTierState(next);
    writeCachedTier(next);
  }

  // حدسِ اولیه (کش یا هیوریستیکِ sync از navigator/screen) — قبل از پینتِ
  // مرورگر اعمال می‌شه که فلشِ «کامل → افتاده» کمتر دیده بشه.
  useLayoutEffect(() => {
    setTier(initialTierGuess());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // پروبِ واقعیِ FPS (~۱ ثانیه) بعد از مونت + مانیتورِ مداومِ jank که فقط
  // می‌تونه پله‌ پله پایین بیاره (هیچ‌وقت بالا نمی‌بره، تا افکت پرپر نزنه).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const avg = await probeFrameTime(1000);
      if (cancelled) return;
      setTier(refineTierWithProbe(tierRef.current, avg));
    })();

    const monitor = createJankMonitor(
      () => tierRef.current,
      (next) => setTier(next),
    );
    monitor.start();

    return () => {
      cancelled = true;
      monitor.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // اعمالِ تیرِ فعلی روی DOM: چند بلاب فعاله، بلور/انیمیشن‌شون چقدره،
  // پارالاکسِ ماوس (فقط pointer:fine + تیرِ high)، و مکث روی تبِ مخفی.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const container = containerRef.current;
    if (!container) return;
    const pointerFine = window.matchMedia("(pointer: fine)").matches;
    const cfg = TIER_CONFIG[tier];
    const wraps = container.querySelectorAll<HTMLElement>(".aurora-blob-wrap");

    wraps.forEach((wrap, i) => {
      const active = i < cfg.blobs;
      wrap.style.display = active ? "" : "none";
      if (!active) return;
      const blob = wrap.querySelector<HTMLElement>(".aurora-blob");
      if (!blob) return;
      if (tier === "low") {
        // ثابت‌ترین حالت: بی‌انیمیشن، ولی بلور می‌مونه (درخواست کاربر: بک‌گراند
        // همیشه تار). بلورِ لایه‌ی ثابت فقط یک بار رستر می‌شه، پس ارزونه.
        blob.style.filter = "blur(40px)";
        blob.style.animation = "none";
        blob.style.transform = "none";
        blob.style.willChange = "auto";
        wrap.style.willChange = "auto";
      } else {
        blob.style.animation = BLOB_ANIM_BY_INDEX[i] ?? "none";
        blob.style.filter = cfg.blurPx != null ? `blur(${cfg.blurPx}px)` : "";
        blob.style.willChange = "transform";
        wrap.style.willChange = "transform";
      }
    });

    function onMove(e: MouseEvent) {
      const nx = e.clientX / window.innerWidth - 0.5; // -0.5..0.5
      const ny = e.clientY / window.innerHeight - 0.5;
      wraps.forEach((w, i) => {
        if (i >= cfg.blobs) return;
        const depth = DEPTHS[i % DEPTHS.length];
        animate(w, { translateX: nx * depth * 2, translateY: ny * depth * 2, duration: 900, ease: "outQuad" });
      });
    }

    // پارالاکسِ JS فقط برای تیرِ کامل: هم چون روی mid/low ارزشِ هزینه‌ش رو
    // نداره، هم چون دستگاهِ لمسی اصلا رویدادِ mousemove نداره.
    const wantsParallax = tier === "high" && pointerFine;
    if (wantsParallax) window.addEventListener("mousemove", onMove);

    // تبِ مخفی: انیمیشنِ CSS رو مکث کن — نه فقط برای باتری، بلکه چون
    // requestAnimationFrame/انیمیشن‌های پس‌زمینه هیچ فایده‌ای برای کاربر
    // ندارن وقتی صفحه دیده نمی‌شه.
    function onVisibility() {
      const hidden = document.hidden;
      wraps.forEach((wrap, i) => {
        if (i >= cfg.blobs || tier === "low") return;
        const blob = wrap.querySelector<HTMLElement>(".aurora-blob");
        if (blob) blob.style.animationPlayState = hidden ? "paused" : "running";
      });
    }
    document.addEventListener("visibilitychange", onVisibility);
    onVisibility();

    return () => {
      if (wantsParallax) window.removeEventListener("mousemove", onMove);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [tier]);

  return (
    <div id="bgCanvas" aria-hidden="true" ref={containerRef}>
      <span className="aurora-blob-wrap aurora-blob-wrap-a"><span className="aurora-blob aurora-blob-a" /></span>
      <span className="aurora-blob-wrap aurora-blob-wrap-b"><span className="aurora-blob aurora-blob-b" /></span>
      <span className="aurora-blob-wrap aurora-blob-wrap-c"><span className="aurora-blob aurora-blob-c" /></span>
    </div>
  );
}
