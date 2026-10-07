"use client";

import { useEffect, useRef } from "react";
import "./blog.css";

/** نوار باریک پیشرفت مطالعه؛ فقط transform، با rAF */
export function BlogProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const art = document.getElementById("blog-article-body");
      if (!art) return;
      const r = art.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.6;
      const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      el.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div className="blog-progress" aria-hidden="true">
      <div ref={ref} className="blog-progress-bar" />
    </div>
  );
}
