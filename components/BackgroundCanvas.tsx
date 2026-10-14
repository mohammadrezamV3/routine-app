"use client";

import { useEffect, useRef } from "react";
import { EASE } from "@/lib/uiAnim";

// بک‌گراند نور محیطی (aurora) — چند بلاب نرم و تار سبز. هر بلاب توی یک
// wrapper جداست: خود بلاب انیمیشن شناور CSS همیشگی‌شو داره، wrapper با
// Web Animations API بر اساس موقعیت ماوس جابه‌جا می‌شه (هر عمق با نسبت متفاوت) — حس
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

    const anims: (Animation | null)[] = [];
    const pos: { x: number; y: number }[] = [];
    function onMove(e: MouseEvent) {
      const nx = e.clientX / window.innerWidth - 0.5; // -0.5..0.5
      const ny = e.clientY / window.innerHeight - 0.5;
      wrappers.forEach((w, i) => {
        const depth = DEPTHS[i % DEPTHS.length];
        const tx = nx * depth * 2;
        const ty = ny * depth * 2;
        if (typeof w.animate !== "function") { w.style.transform = `translate(${tx}px, ${ty}px)`; return; }
        // شروع از مقدار فعلی (حتی وسط انیمیشن قبلی)، مثل رفتار قبلی
        let from = pos[i] || { x: 0, y: 0 };
        const prev = anims[i];
        if (prev && prev.playState === "running") {
          const m = new DOMMatrixReadOnly(getComputedStyle(w).transform);
          from = { x: m.m41, y: m.m42 };
          prev.cancel();
        }
        pos[i] = { x: tx, y: ty };
        w.style.transform = `translate(${tx}px, ${ty}px)`;
        anims[i] = w.animate(
          [{ transform: `translate(${from.x}px, ${from.y}px)` }, { transform: `translate(${tx}px, ${ty}px)` }],
          { duration: 900, easing: EASE.outQuad }
        );
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
    </div>
  );
}
