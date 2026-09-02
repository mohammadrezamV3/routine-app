"use client";

import { useEffect, useRef } from "react";

type Blob = {
  el: HTMLElement; glowEl: HTMLElement | null; r: number;
  x: number; y: number; vx: number; vy: number; phase: number;
};

/**
 * پورت مستقیم فیزیک بلوب‌های مایع (initWboxLiquidBlobs) از فایل HTML اصلی،
 * برای یک باکس مشخص. هر باکس فیزیک مستقل خودش رو داره (walk تصادفی +
 * برخورد زوجی که باعث می‌شه فیلتر goo دو بلوب رو ادغام نشون بده).
 * این کامپوننت خودش رندر نمی‌کنه؛ فقط روی children موجود (wbox-liquid/wbox-glow)
 * سوار می‌شه و transform‌شون رو هر فریم آپدیت می‌کنه.
 */
export function useLiquidBlobPhysics(containerRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    // فیزیک هر فریم (rAF) + filter:blur روی چند لایه، روی موبایل سنگینه —
    // خود افکت بصری تزئینیه، پس روی دستگاه‌های لمسی کلا اجرا نمی‌شه
    // (همون الگویی که برای پارالاکس BackgroundCanvas استفاده شده).
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const box = containerRef.current;
    if (!box) return;
    const liquidWrap = box.querySelector(".wbox-liquid");
    const glowWrap = box.querySelector(".wbox-glow");
    if (!liquidWrap) return;

    const glowEls = glowWrap ? Array.from(glowWrap.querySelectorAll<HTMLElement>(".wbox-glowblob")) : [];
    const blobEls = Array.from(liquidWrap.querySelectorAll<HTMLElement>(".wbox-blob"));
    if (!blobEls.length) return;

    // خاموش کردن انیمیشن CSS ساده‌شده (fallback) چون از این به بعد JS کنترل می‌کنه
    blobEls.forEach((el) => { el.style.animation = "none"; });
    glowEls.forEach((el) => { el.style.animation = "none"; });

    const W = box.clientWidth || 80, H = box.clientHeight || 80;
    const blobs: Blob[] = blobEls.map((el, idx) => {
      const size = 26 + Math.random() * 12;
      el.style.width = size.toFixed(1) + "px";
      el.style.height = size.toFixed(1) + "px";
      el.style.marginLeft = (-size / 2).toFixed(1) + "px";
      el.style.marginTop = (-size / 2).toFixed(1) + "px";
      const glowEl = glowEls[idx] || null;
      if (glowEl) {
        const glowSize = size * 1.7;
        glowEl.style.width = glowSize.toFixed(1) + "px";
        glowEl.style.height = glowSize.toFixed(1) + "px";
        glowEl.style.marginLeft = (-glowSize / 2).toFixed(1) + "px";
        glowEl.style.marginTop = (-glowSize / 2).toFixed(1) + "px";
      }
      return {
        el, glowEl, r: size / 2,
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
        phase: Math.random() * Math.PI * 2,
      };
    });

    let last = performance.now();
    let rafId = 0;
    function frame(now: number) {
      rafId = requestAnimationFrame(frame);
      if (!box || !box.isConnected) return;
      const dt = Math.min(now - last, 50); last = now;

      for (const p of blobs) {
        p.phase += dt * 0.0007;
        p.x += p.vx * (dt * 0.032) + Math.sin(p.phase) * 0.06;
        p.y += p.vy * (dt * 0.032) + Math.cos(p.phase * 0.8) * 0.06;
        if (Math.random() < 0.005) {
          p.vx = (Math.random() - 0.5) * 0.22;
          p.vy = (Math.random() - 0.5) * 0.22;
        }
      }

      for (let a = 0; a < blobs.length; a++) {
        for (let b = a + 1; b < blobs.length; b++) {
          const p1 = blobs[a], p2 = blobs[b];
          const dx = p2.x - p1.x, dy = p2.y - p1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
          const mergeDist = (p1.r + p2.r) * 0.9;
          if (dist < mergeDist) {
            const nx = dx / dist, ny = dy / dist;
            const push = (mergeDist - dist) * 0.035;
            p1.x -= nx * push; p1.y -= ny * push;
            p2.x += nx * push; p2.y += ny * push;
            p1.vx -= nx * 0.004; p1.vy -= ny * 0.004;
            p2.vx += nx * 0.004; p2.vy += ny * 0.004;
          }
        }
      }

      for (const p of blobs) {
        const m = p.r * 1.7 + 6;
        if (p.x < -m) p.x = W + m;
        if (p.x > W + m) p.x = -m;
        if (p.y < -m) p.y = H + m;
        if (p.y > H + m) p.y = -m;
        p.el.style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px)`;
        if (p.glowEl) p.glowEl.style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px)`;
      }
    }
    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** باکس آماده با wbox-glow + wbox-liquid داخلش و فیزیک متصل — برای استفاده در wsearch-box و pcard-face-back */
export function LiquidBlobLayers() {
  const ref = useRef<HTMLDivElement>(null);
  useLiquidBlobPhysics(ref as any);
  return (
    <div ref={ref} style={{ position: "absolute", inset: 0 }}>
      <div className="wbox-glow"><span className="wbox-glowblob" /><span className="wbox-glowblob" /></div>
      <div className="wbox-liquid"><span className="wbox-blob" /><span className="wbox-blob" /></div>
    </div>
  );
}
