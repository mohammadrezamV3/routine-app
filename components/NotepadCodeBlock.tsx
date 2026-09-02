"use client";

import { useEffect, useRef, useState } from "react";
import { CODE_LANGUAGES, NotepadBlock, leavesToPlainText, plainTextToLeaves, tokenizeCode } from "@/lib/notepad";

// بلاک کد — یه textarea شفاف روی یه <pre> رنگ‌شده (همون تکنیک کلاسیک
// «overlay editor» بدون نیاز به هیچ کتابخانه‌ی سنگینی مثل CodeMirror/
// Monaco)، با یه tokenizer سبک خودمون (lib/notepad.ts → tokenizeCode).
// جدا از BlockContentEditable نگه داشته شده چون منطق rich-text/اسلش‌کامند
// اونجا اصلا اینجا معنی نداره — Enter توی کد باید خط جدید بسازه نه بلاک جدید.
export function NotepadCodeBlock({
  block,
  locked,
  onChange,
}: {
  block: NotepadBlock;
  locked?: boolean;
  onChange: (id: string, text: string, language: string) => void;
}) {
  const [text, setText] = useState(() => leavesToPlainText(block.content));
  const language = block.language || "plaintext";
  const taRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const lastEmitted = useRef(text);

  useEffect(() => {
    const current = leavesToPlainText(block.content);
    if (current !== lastEmitted.current) { setText(current); lastEmitted.current = current; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.content]);

  useEffect(() => { autoGrow(); }, [text]);

  function autoGrow() {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  function commit(next: string) {
    setText(next);
    lastEmitted.current = next;
    onChange(block.id, next, language);
  }

  function handleTab(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const el = e.currentTarget;
    const start = el.selectionStart, end = el.selectionEnd;
    const next = text.slice(0, start) + "  " + text.slice(end);
    commit(next);
    requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + 2; });
  }

  function handleSyncScroll() {
    if (taRef.current && preRef.current) {
      preRef.current.scrollTop = taRef.current.scrollTop;
      preRef.current.scrollLeft = taRef.current.scrollLeft;
    }
  }

  const tokens = tokenizeCode(text, language);

  return (
    <div className="notepad-code-block">
      <div className="notepad-code-head">
        <select
          className="notepad-code-lang-select"
          value={language}
          disabled={locked}
          onChange={(e) => { onChange(block.id, text, e.target.value); }}
        >
          {CODE_LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
      </div>
      <div className="notepad-code-body">
        <pre ref={preRef} className="notepad-code-highlight" aria-hidden>
          {tokens.map((t, i) => (t.cls ? <span key={i} className={`nc-${t.cls}`}>{t.text}</span> : t.text))}
          {"​"}
        </pre>
        <textarea
          ref={taRef}
          className="notepad-code-textarea"
          value={text}
          readOnly={locked}
          spellCheck={false}
          placeholder="کدت رو اینجا بنویس…"
          dir="ltr"
          onChange={(e) => commit(e.target.value)}
          onKeyDown={handleTab}
          onScroll={handleSyncScroll}
        />
      </div>
    </div>
  );
}
