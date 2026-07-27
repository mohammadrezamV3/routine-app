"use client";

import { useEffect, useRef } from "react";

// پورت مستقیم initParticles از فایل HTML اصلی — بدون تغییر منطق،
// فقط پیچیده‌شده در یک useEffect برای هماهنگی با چرخه عمر React.
export function BackgroundCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0;
    const isMobile = window.matchMedia("(max-width:700px)").matches;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const DPR = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
    let particles: any[] = [];
    const mouse = { x: -9999, y: -9999 };
    let COUNT = 0;
    let lastW: number | null = null;

    function rand(a: number, b: number) {
      return a + Math.random() * (b - a);
    }

    function resize() {
      const newW = window.innerWidth, newH = window.innerHeight;
      if (lastW !== null && Math.abs(newW - lastW) < 2 && particles.length) {
        W = newW; H = newH;
        canvas!.width = W * DPR; canvas!.height = H * DPR;
        canvas!.style.width = W + "px"; canvas!.style.height = H + "px";
        ctx!.setTransform(DPR, 0, 0, DPR, 0, 0);
        particles.forEach((p) => { if (p.y > H) p.y = H; if (p.x > W) p.x = W; });
        lastW = newW;
        return;
      }
      lastW = newW;
      W = newW; H = newH;
      canvas!.width = W * DPR; canvas!.height = H * DPR;
      canvas!.style.width = W + "px"; canvas!.style.height = H + "px";
      ctx!.setTransform(DPR, 0, 0, DPR, 0, 0);
      // روی موبایل تراکم ذرات رو نصف می‌کنیم — سنگین‌ترین بخش این افکت
      // حلقه O(n²) رسم خط بین ذره‌هاست، پس تعداد کمتر مستقیماً یعنی fps بهتر.
      COUNT = Math.round((W * H) / (isMobile ? 18000 : 11000));
      COUNT = Math.max(18, Math.min(isMobile ? 55 : 130, COUNT));
      particles = [];
      for (let i = 0; i < COUNT; i++) {
        particles.push({
          x: rand(0, W), y: rand(0, H), vx: rand(-0.16, 0.16), vy: rand(-0.16, 0.16),
          r: rand(2.2, 4), phase: rand(0, Math.PI * 2), state: "idle", holdStart: 0, fadeStart: 0,
        });
      }
    }

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
    window.addEventListener("mouseleave", () => { mouse.x = -9999; mouse.y = -9999; });
    window.addEventListener("touchmove", (e) => {
      if (e.touches && e.touches[0]) { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; }
    }, { passive: true });

    const BLAST_R = 170, BLAST_FORCE = 3.4;
    function blastAt(cx: number, cy: number) {
      mouse.x = cx; mouse.y = cy;
      particles.forEach((p) => {
        const dx = p.x - cx, dy = p.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        if (dist < BLAST_R) {
          const force = (1 - dist / BLAST_R) * BLAST_FORCE;
          p.ix = (p.ix || 0) + (dx / dist) * force;
          p.iy = (p.iy || 0) + (dy / dist) * force;
        }
      });
    }
    const onClick = (e: MouseEvent) => blastAt(e.clientX, e.clientY);
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) blastAt(e.touches[0].clientX, e.touches[0].clientY);
    };
    window.addEventListener("click", onClick);
    window.addEventListener("touchstart", onTouchStart, { passive: true });

    function cssVar(name: string) {
      return getComputedStyle(document.body).getPropertyValue(name).trim();
    }
    function hexToRgb(hex: string) {
      hex = (hex || "#4E545C").replace("#", "");
      if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
      const num = parseInt(hex, 16) || 0x4e545c;
      return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    }
    function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
    function particleColor(p: any, now: number, gray: number[], green: number[]) {
      if (p.state === "hover" || p.state === "holding") return green;
      if (p.state === "fading") {
        const t = Math.min(1, (now - p.fadeStart) / 1400);
        return [lerp(green[0], gray[0], t), lerp(green[1], gray[1], t), lerp(green[2], gray[2], t)];
      }
      return gray;
    }

    let last = performance.now();
    let rafId = 0;
    function frame(now: number) {
      rafId = requestAnimationFrame(frame);
      const dt = Math.min(now - last, 50); last = now;
      const bg = cssVar("--bg") || "#0C0E11";
      const gray = hexToRgb(cssVar("--particle") || cssVar("--muted2"));
      const green = hexToRgb("#00A86B");

      ctx!.fillStyle = bg;
      ctx!.fillRect(0, 0, W, H);

      const R = 90, HOLD = 3000, FADE = 1400;

      particles.forEach((p) => {
        p.phase += dt * 0.0009;
        p.x += p.vx + Math.sin(p.phase) * 0.04 + (p.ix || 0);
        p.y += p.vy + Math.cos(p.phase) * 0.04 + (p.iy || 0);
        if (p.ix) { p.ix *= 0.92; if (Math.abs(p.ix) < 0.015) p.ix = 0; }
        if (p.iy) { p.iy *= 0.92; if (Math.abs(p.iy) < 0.015) p.iy = 0; }
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;

        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < R) { p.state = "hover"; }
        else if (p.state === "hover") { p.state = "holding"; p.holdStart = now; }
        if (p.state === "holding" && now - p.holdStart > HOLD) { p.state = "fading"; p.fadeStart = now; }
        if (p.state === "fading" && now - p.fadeStart > FADE) { p.state = "idle"; }
      });

      ctx!.lineWidth = 1;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx2 = a.x - b.x, dy2 = a.y - b.y;
          const d = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          if (d < 118) {
            const op = (1 - d / 118) * 0.35;
            const ca = particleColor(a, now, gray, green);
            const cb = particleColor(b, now, gray, green);
            ctx!.strokeStyle = `rgba(${Math.round((ca[0] + cb[0]) / 2)},${Math.round((ca[1] + cb[1]) / 2)},${Math.round((ca[2] + cb[2]) / 2)},${op})`;
            ctx!.beginPath(); ctx!.moveTo(a.x, a.y); ctx!.lineTo(b.x, b.y); ctx!.stroke();
          }
        }
      }
      particles.forEach((p) => {
        const c = particleColor(p, now, gray, green);
        ctx!.fillStyle = `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
        ctx!.beginPath(); ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx!.fill();
      });
    }

    resize();
    rafId = requestAnimationFrame(frame);

    // وقتی تب پس‌زمینه‌ست (کاربر رفته سراغ تب دیگه)، انیمیشن رو متوقف کن —
    // نه فقط برای باتری، بلکه چون rAF پس‌زمینه در بعضی مرورگرها هرچند مفید
    // به‌صرفه‌ست، ولی مطمئن‌تره صریحاً خودمون مدیریتش کنیم.
    function onVisibilityChange() {
      if (document.hidden) {
        cancelAnimationFrame(rafId);
      } else {
        last = performance.now();
        rafId = requestAnimationFrame(frame);
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("resize", resize);
      window.removeEventListener("click", onClick);
      window.removeEventListener("touchstart", onTouchStart);
    };
  }, []);

  return <canvas id="bgCanvas" ref={canvasRef} />;
}
