"use client";

import { useEffect, useRef } from "react";
import { animate } from "animejs";
import { TreasureTrail } from "./TreasureTrail";

// بک‌گراند نور محیطی (aurora) — چند بلاب نرم و تار سبز. هر بلاب توی یک
// wrapper جداست: خودِ بلاب انیمیشن شناور CSS همیشگی‌شو داره، wrapper با
// anime.js بر اساس موقعیت ماوس جابه‌جا می‌شه (هر عمق با نسبت متفاوت) — حس
// یک صحنه‌ی سه‌بعدی و زنده به‌جای یک پس‌زمینه‌ی ثابت.
const DEPTHS = [16, 26, 34];

export function BackgroundCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return; // فقط دسکتاپ/ماوس، نه لمسی
    const container = containerRef.current;
    if (!container) return;
    const wrappers = container.querySelectorAll<HTMLElement>(".aurora-blob-wrap");

    function onMove(e: MouseEvent) {
      const nx = e.clientX / window.innerWidth - 0.5; // -0.5..0.5
      const ny = e.clientY / window.innerHeight - 0.5;
      wrappers.forEach((w, i) => {
        const depth = DEPTHS[i % DEPTHS.length];
        animate(w, { translateX: nx * depth * 2, translateY: ny * depth * 2, duration: 900, ease: "outQuad" });
      });
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div id="bgCanvas" aria-hidden="true" ref={containerRef}>
      <span className="aurora-blob-wrap aurora-blob-wrap-a"><span className="aurora-blob aurora-blob-a" /></span>
      <span className="aurora-blob-wrap aurora-blob-wrap-b"><span className="aurora-blob aurora-blob-b" /></span>
      <span className="aurora-blob-wrap aurora-blob-wrap-c"><span className="aurora-blob aurora-blob-c" /></span>

      {/* مسیرهای نقشه‌ی گنج، بزرگ و کم‌رنگ، پشت محتوا */}
      <TreasureTrail variant="a" className="treasure-trail-bg tt-bg-a" duration={11} />
      <TreasureTrail variant="b" className="treasure-trail-bg tt-bg-b" duration={13} delay={2.5} />
      <TreasureTrail variant="c" className="treasure-trail-bg tt-bg-c" duration={12} delay={5} />
    </div>
  );
}
