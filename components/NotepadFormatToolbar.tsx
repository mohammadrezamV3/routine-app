"use client";

import { useEffect, useState } from "react";
import { Bold, Code, Italic, Link as LinkIcon, Strikethrough, Underline } from "lucide-react";

// تولبار شناور — وقتی داخل یکی از بلاک‌های ادیتور یه انتخاب متنی غیرخالی
// وجود داشته باشه ظاهر می‌شه، بالای همون انتخاب. فرمت‌دهی بولد/ایتالیک/
// آندرلاین با execCommand بومی مرورگر (که خودش partial-selection رو درست
// مدیریت می‌کنه)، کد/لینک با wrap کردن دستی Range.
export function NotepadFormatToolbar({ containerRef }: { containerRef: React.RefObject<HTMLElement> }) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");

  useEffect(() => {
    function onSelectionChange() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) { setRect(null); setLinkOpen(false); return; }
      const anchorNode = sel.anchorNode;
      if (!anchorNode || !containerRef.current || !containerRef.current.contains(anchorNode)) { setRect(null); return; }
      const r = sel.getRangeAt(0).getBoundingClientRect();
      if (!r || (r.width === 0 && r.height === 0)) { setRect(null); return; }
      setRect(r);
    }
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [containerRef]);

  function applyInline(cmd: "bold" | "italic" | "underline" | "strikeThrough") {
    document.execCommand(cmd, false);
  }

  function wrapWithTag(tag: "code") {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const text = range.toString();
    if (!text) return;
    const el = document.createElement(tag);
    el.textContent = text;
    range.deleteContents();
    range.insertNode(el);
    const after = document.createRange();
    after.setStartAfter(el);
    after.collapse(true);
    sel.removeAllRanges();
    sel.addRange(after);
    // یه event input شبیه‌سازی‌شده بفرست تا بلاک‌ریو تغییرات رو serialize کنه
    el.closest("[contenteditable]")?.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function applyLink() {
    const url = linkValue.trim();
    if (!url) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const text = range.toString();
    const a = document.createElement("a");
    a.href = url;
    a.textContent = text;
    range.deleteContents();
    range.insertNode(a);
    a.closest("[contenteditable]")?.dispatchEvent(new Event("input", { bubbles: true }));
    setLinkOpen(false);
    setLinkValue("");
    setRect(null);
  }

  if (!rect) return null;

  const top = rect.top + window.scrollY - 46;
  const left = rect.left + window.scrollX + rect.width / 2;

  return (
    <div className="notepad-format-toolbar" style={{ position: "absolute", top, left, transform: "translateX(-50%)" }} onMouseDown={(e) => e.preventDefault()}>
      {linkOpen ? (
        <div className="notepad-format-link-row">
          <input
            autoFocus
            type="text"
            placeholder="لینک…"
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") applyLink(); if (e.key === "Escape") setLinkOpen(false); }}
          />
          <button type="button" onClick={applyLink}>تایید</button>
        </div>
      ) : (
        <>
          <button type="button" onClick={() => applyInline("bold")} aria-label="بولد"><Bold size={13} /></button>
          <button type="button" onClick={() => applyInline("italic")} aria-label="ایتالیک"><Italic size={13} /></button>
          <button type="button" onClick={() => applyInline("underline")} aria-label="آندرلاین"><Underline size={13} /></button>
          <button type="button" onClick={() => applyInline("strikeThrough")} aria-label="خط‌خورده"><Strikethrough size={13} /></button>
          <button type="button" onClick={() => wrapWithTag("code")} aria-label="کد"><Code size={13} /></button>
          <button type="button" onClick={() => setLinkOpen(true)} aria-label="لینک"><LinkIcon size={13} /></button>
        </>
      )}
    </div>
  );
}
