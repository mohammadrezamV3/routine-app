"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Code2, Heading1, Heading2, Heading3, Image as ImageIcon, List, ListChecks,
  ListOrdered, Minus, Pilcrow, Quote, Table as DatabaseIcon, ChevronRight as ToggleIcon,
} from "lucide-react";
import { BLOCK_TYPE_META, BlockType, SLASH_MENU_ORDER } from "@/lib/notepad";

const ICONS: Record<BlockType, JSX.Element> = {
  paragraph: <Pilcrow size={15} />,
  heading1: <Heading1 size={15} />,
  heading2: <Heading2 size={15} />,
  heading3: <Heading3 size={15} />,
  bulleted_list: <List size={15} />,
  numbered_list: <ListOrdered size={15} />,
  todo: <ListChecks size={15} />,
  toggle: <ToggleIcon size={15} />,
  quote: <Quote size={15} />,
  divider: <Minus size={15} />,
  image: <ImageIcon size={15} />,
  database: <DatabaseIcon size={15} />,
  code: <Code2 size={15} />,
};

// منویِ اسلش‌کامند — با تایپِ "/" داخلِ یه بلاک باز می‌شه، با ادامه‌ی تایپ
// فیلتر می‌شه، با ↑/↓ گشت می‌زنه و با Enter/کلیک انتخاب می‌کنه
export function SlashCommandMenu({
  query,
  anchorRect,
  onSelect,
  onClose,
}: {
  query: string;
  anchorRect: DOMRect;
  onSelect: (type: BlockType) => void;
  onClose: () => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SLASH_MENU_ORDER;
    return SLASH_MENU_ORDER.filter((t) => {
      const meta = BLOCK_TYPE_META[t];
      return meta.label.toLowerCase().includes(q) || t.toLowerCase().includes(q) || meta.hint.toLowerCase().includes(q);
    });
  }, [query]);

  useEffect(() => setActiveIndex(0), [query]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, filtered.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
      else if (e.key === "Enter") { e.preventDefault(); if (filtered[activeIndex]) onSelect(filtered[activeIndex]); }
      else if (e.key === "Escape") { e.preventDefault(); onClose(); }
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [filtered, activeIndex, onSelect, onClose]);

  if (!filtered.length) return null;

  const top = anchorRect.bottom + window.scrollY + 6;
  const left = anchorRect.left + window.scrollX;

  return (
    <div ref={menuRef} className="notepad-slash-menu" style={{ position: "absolute", top, left }}>
      {filtered.map((type, i) => {
        const meta = BLOCK_TYPE_META[type];
        return (
          <button
            key={type}
            type="button"
            className={`notepad-slash-item${i === activeIndex ? " active" : ""}`}
            onMouseEnter={() => setActiveIndex(i)}
            onClick={() => onSelect(type)}
          >
            <span className="notepad-slash-item-icon">{ICONS[type]}</span>
            <span className="notepad-slash-item-text">
              <span className="notepad-slash-item-label">{meta.label}</span>
              <span className="notepad-slash-item-hint">{meta.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
