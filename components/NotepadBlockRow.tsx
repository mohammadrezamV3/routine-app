"use client";

import { useEffect, useRef } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { ChevronRight, GripVertical, ImagePlus, Plus, Trash2 } from "lucide-react";
import {
  BlockType,
  NotepadBlock,
  RichLeaf,
  domToLeaves,
  findInlineMarkdownShortcut,
  getPlainTextAndCursor,
  isDividerShortcut,
  leavesToHtml,
  matchBlockShortcut,
  rangeFromOffsets,
  setCaretAtOffset,
} from "@/lib/notepad";
import { NotepadDatabaseBlock } from "./NotepadDatabaseBlock";
import { NotepadCodeBlock } from "./NotepadCodeBlock";

export type BlockRowHandlers = {
  onChangeContent: (id: string, leaves: RichLeaf[]) => void;
  onEnter: (id: string, beforeText: string, afterLeaves: RichLeaf[]) => void;
  onBackspaceAtStart: (id: string) => void;
  onArrowUp: (id: string) => void;
  onArrowDown: (id: string) => void;
  onToggleChecked: (id: string) => void;
  onToggleCollapsed: (id: string) => void;
  onDelete: (id: string) => void;
  onConvertType: (id: string, type: BlockType) => void;
  onSlashOpen: (id: string, query: string, anchorEl: HTMLElement) => void;
  onSlashUpdateQuery: (query: string) => void;
  onSlashClose: () => void;
  onImageSet: (id: string, url: string) => void;
  onDatabaseCreated: (id: string, databaseId: string) => void;
  onCodeChange: (id: string, text: string, language: string) => void;
  registerRef: (id: string, el: HTMLElement | null) => void;
};

function BlockContentEditable({
  block,
  placeholder,
  className,
  style,
  handlers,
  locked,
}: {
  block: NotepadBlock;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  handlers: BlockRowHandlers;
  locked?: boolean;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string>(JSON.stringify(block.content));
  const slashActive = useRef(false);

  useEffect(() => {
    const serialized = JSON.stringify(block.content);
    if (serialized === lastEmitted.current) return;
    if (elRef.current) elRef.current.innerHTML = leavesToHtml(block.content);
    lastEmitted.current = serialized;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.content]);

  function commit() {
    if (!elRef.current) return;
    const leaves = domToLeaves(elRef.current);
    lastEmitted.current = JSON.stringify(leaves);
    handlers.onChangeContent(block.id, leaves);
  }

  function handleInput() {
    if (!elRef.current) return;
    commit();
    const { text, cursor } = getPlainTextAndCursor(elRef.current);

    // اسلش‌کامند: تشخیص "/" و بقیه‌ی متن بعدش تا اولین فاصله/انتهای متن
    const slashIdx = text.lastIndexOf("/", cursor - 1);
    if (slashIdx !== -1 && !text.slice(slashIdx, cursor).includes(" ") && !text.slice(slashIdx, cursor).includes("\n")) {
      const query = text.slice(slashIdx + 1, cursor);
      if (!slashActive.current) {
        slashActive.current = true;
        handlers.onSlashOpen(block.id, query, elRef.current);
      } else {
        handlers.onSlashUpdateQuery(query);
      }
      return;
    }
    if (slashActive.current) {
      slashActive.current = false;
      handlers.onSlashClose();
    }

    // میان‌بر مارک‌داون درون‌خطی — **بولد**، *ایتالیک*، ~~خط‌خورده~~، `کد`
    const inline = findInlineMarkdownShortcut(text, cursor);
    if (inline) {
      const range = rangeFromOffsets(elRef.current, inline.innerStart, inline.innerEnd);
      const innerText = text.slice(inline.innerStart, inline.innerEnd);
      if (range && innerText) {
        const wrapTag = { bold: "b", italic: "i", strike: "s", code: "code" }[inline.mark];
        const wrapped = document.createElement(wrapTag);
        wrapped.textContent = innerText;
        const fullRange = rangeFromOffsets(elRef.current, inline.fullStart, inline.fullEnd);
        if (fullRange) {
          fullRange.deleteContents();
          fullRange.insertNode(wrapped);
          const after = document.createRange();
          after.setStartAfter(wrapped);
          after.collapse(true);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(after);
          commit();
        }
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!elRef.current) return;
    const { text, cursor } = getPlainTextAndCursor(elRef.current);
    const sel = window.getSelection();
    const hasSelection = sel && !sel.isCollapsed;

    if (slashActive.current && (e.key === "Escape")) {
      slashActive.current = false;
      handlers.onSlashClose();
      return;
    }

    if (e.key === " " && !hasSelection) {
      const beforeCursor = text.slice(0, cursor);
      if (isDividerShortcut(beforeCursor) && block.type !== "divider") {
        e.preventDefault();
        handlers.onConvertType(block.id, "divider");
        return;
      }
      const shortcutType = matchBlockShortcut(beforeCursor);
      if (shortcutType && block.type !== shortcutType) {
        e.preventDefault();
        handlers.onConvertType(block.id, shortcutType);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (slashActive.current) return; // اسلش‌منو خودش Enter رو مدیریت می‌کنه
      const beforeText = text.slice(0, cursor);
      if (isDividerShortcut(beforeText) && block.type !== "divider") {
        handlers.onConvertType(block.id, "divider");
        return;
      }
      const afterText = text.slice(cursor);
      commit();
      handlers.onEnter(block.id, beforeText, afterText ? [{ text: afterText }] : []);
      return;
    }

    if (e.key === "Backspace" && cursor === 0 && !hasSelection) {
      e.preventDefault();
      handlers.onBackspaceAtStart(block.id);
      return;
    }

    if (e.key === "ArrowUp" && cursor === 0) {
      handlers.onArrowUp(block.id);
    }
    if (e.key === "ArrowDown" && cursor === text.length) {
      handlers.onArrowDown(block.id);
    }

    if ((e.metaKey || e.ctrlKey) && ["b", "i", "u"].includes(e.key.toLowerCase())) {
      e.preventDefault();
      const cmd = { b: "bold", i: "italic", u: "underline" }[e.key.toLowerCase() as "b" | "i" | "u"];
      document.execCommand(cmd, false);
      commit();
    }
  }

  return (
    <div
      ref={(el) => {
        (elRef as any).current = el;
        handlers.registerRef(block.id, el);
      }}
      className={`notepad-block-text${className ? " " + className : ""}`}
      style={style}
      contentEditable={!locked}
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onInput={locked ? undefined : handleInput}
      onKeyDown={locked ? undefined : handleKeyDown}
      onBlur={locked ? undefined : commit}
    />
  );
}

export function NotepadBlockRow({
  block,
  index,
  numberedIndex,
  editable,
  locked,
  handlers,
}: {
  block: NotepadBlock;
  index: number;
  numberedIndex?: number;
  editable: boolean;
  locked?: boolean;
  handlers: BlockRowHandlers;
}) {
  const controls = useDragControls();

  const inner = (() => {
    switch (block.type) {
      case "heading1":
        return <BlockContentEditable block={block} placeholder="عنوان ۱" className="np-h1" handlers={handlers} locked={locked} />;
      case "heading2":
        return <BlockContentEditable block={block} placeholder="عنوان ۲" className="np-h2" handlers={handlers} locked={locked} />;
      case "heading3":
        return <BlockContentEditable block={block} placeholder="عنوان ۳" className="np-h3" handlers={handlers} locked={locked} />;
      case "quote":
        return (
          <div className="notepad-quote-wrap">
            <BlockContentEditable block={block} placeholder="نقل‌قول" className="np-quote" handlers={handlers} locked={locked} />
          </div>
        );
      case "bulleted_list":
        return (
          <div className="notepad-list-row">
            <span className="notepad-bullet-dot" />
            <BlockContentEditable block={block} placeholder="لیست" handlers={handlers} locked={locked} />
          </div>
        );
      case "numbered_list":
        return (
          <div className="notepad-list-row">
            <span className="notepad-number-marker">{numberedIndex ?? 1}.</span>
            <BlockContentEditable block={block} placeholder="لیست" handlers={handlers} locked={locked} />
          </div>
        );
      case "todo":
        return (
          <div className="notepad-list-row">
            <button
              type="button"
              className={`notepad-todo-check${block.checked ? " done" : ""}`}
              onClick={locked ? undefined : () => handlers.onToggleChecked(block.id)}
              aria-label={block.checked ? "انجام‌نشده علامت بزن" : "انجام‌شده علامت بزن"}
              disabled={locked}
            >
              {block.checked && (
                <svg viewBox="0 0 24 24" fill="none" width="11" height="11">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <BlockContentEditable
              block={block}
              placeholder="کار جدید"
              className={block.checked ? "notepad-todo-done" : undefined}
              handlers={handlers}
              locked={locked}
            />
          </div>
        );
      case "toggle":
        return (
          <div className="notepad-list-row">
            <button
              type="button"
              className={`notepad-toggle-arrow${block.collapsed ? "" : " open"}`}
              onClick={() => handlers.onToggleCollapsed(block.id)}
              aria-label={block.collapsed ? "بازکردن" : "بستن"}
            >
              <ChevronRight size={14} />
            </button>
            <BlockContentEditable block={block} placeholder="تاگل" className="notepad-toggle-title" handlers={handlers} locked={locked} />
          </div>
        );
      case "divider":
        return (
          <div
            className="notepad-divider-row"
            tabIndex={0}
            onKeyDown={(e) => {
              if (!locked && (e.key === "Backspace" || e.key === "Delete")) {
                e.preventDefault();
                handlers.onDelete(block.id);
              }
            }}
          >
            <hr className="notepad-divider-hr" />
          </div>
        );
      case "image":
        return <NotepadImageBlock block={block} onImageSet={handlers.onImageSet} locked={locked} />;
      case "database":
        return (
          <NotepadDatabaseBlock
            blockId={block.id}
            databaseId={block.databaseId ?? null}
            onDatabaseCreated={(databaseId) => handlers.onDatabaseCreated(block.id, databaseId)}
          />
        );
      case "code":
        return <NotepadCodeBlock block={block} locked={locked} onChange={handlers.onCodeChange} />;
      default:
        return <BlockContentEditable block={block} placeholder="برای نوشتن، یا / برای دستورات" handlers={handlers} locked={locked} />;
    }
  })();

  if (!editable) {
    return <div className="notepad-block-row">{inner}</div>;
  }

  return (
    <Reorder.Item value={block.id} dragListener={false} dragControls={locked ? undefined : controls} className="notepad-block-row" as="div">
      {!locked && (
        <button type="button" className="notepad-block-drag-handle" onPointerDown={(e) => controls.start(e)} aria-label="جابه‌جایی">
          <GripVertical size={14} />
        </button>
      )}
      <div className="notepad-block-content">{inner}</div>
      {!locked && (
        <button type="button" className="notepad-block-delete-btn" onClick={() => handlers.onDelete(block.id)} aria-label="حذف بلاک">
          <Trash2 size={13} />
        </button>
      )}
    </Reorder.Item>
  );
}

function NotepadImageBlock({ block, onImageSet, locked }: { block: NotepadBlock; onImageSet: (id: string, url: string) => void; locked?: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const canvas = document.createElement("canvas");
      const img = new Image();
      img.onload = () => {
        const maxW = 900;
        const scale = Math.min(1, maxW / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        onImageSet(block.id, canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  if (block.imageUrl) {
    return (
      <div className="notepad-image-block">
        <img src={block.imageUrl} alt="" />
        {!locked && (
          <>
            <button type="button" className="notepad-image-change-btn" onClick={() => fileRef.current?.click()}>تغییر عکس</button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </>
        )}
      </div>
    );
  }
  if (locked) return <div className="notepad-image-empty notepad-image-empty-locked">بدون تصویر</div>;
  return (
    <div className="notepad-image-empty">
      <button type="button" onClick={() => fileRef.current?.click()}>
        <ImagePlus size={16} />
        افزودن تصویر
      </button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <input
        type="text"
        placeholder="یا لینک عکس رو اینجا بچسبون…"
        className="notepad-image-url-input"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
            onImageSet(block.id, (e.target as HTMLInputElement).value.trim());
          }
        }}
      />
    </div>
  );
}
