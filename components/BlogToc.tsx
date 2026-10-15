"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n";
import "./blog.css";

export type BlogTocItem = { id: string; text: string };

/** فهرست مطالب: جمع‌شونده در موبایل، ستون چسبان در دسکتاپ، با هایلایت بخش فعال */
export function BlogToc({ items }: { items: BlogTocItem[] }) {
  const [active, setActive] = useState("");
  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter(Boolean) as HTMLElement[];
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: "-10% 0px -70% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [items]);

  if (items.length < 2) return null;
  const list = (
    <ol className="blog-toc-list">
      {items.map((it) => (
        <li key={it.id}>
          <a href={`#${it.id}`} aria-current={active === it.id ? "location" : undefined}>{it.text}</a>
        </li>
      ))}
    </ol>
  );
  return (
    <>
      <details className="blog-toc-mobile">
        <summary>{tr("فهرست مطالب", "Contents")}</summary>
        {list}
      </details>
      <aside className="blog-toc-side" aria-label={tr("فهرست مطالب", "Contents")}>
        <div className="blog-toc-title">{tr("فهرست مطالب", "Contents")}</div>
        {list}
      </aside>
    </>
  );
}
