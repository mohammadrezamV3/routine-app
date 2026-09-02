"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Reorder } from "framer-motion";
import { ChevronLeft, ImagePlus, Lock, MoreHorizontal, Plus, Star } from "lucide-react";
import {
  BlockType, NotepadBlock, NotepadPage, NotepadPageWithBlocks, RichLeaf,
  blocksToPlainText, leavesToPlainText, makeBlock, midPosition, plainTextToLeaves, saveNotepadBlocks,
  setCaretAtOffset, updateNotepadPage, NOTEPAD_TITLE_MAX,
} from "@/lib/notepad";
import { getSetting, setSetting } from "@/lib/storage";
import { NotepadBlockRow, BlockRowHandlers } from "./NotepadBlockRow";
import { SlashCommandMenu } from "./SlashCommandMenu";
import { NotepadFormatToolbar } from "./NotepadFormatToolbar";
import { NotepadIconPicker } from "./NotepadIconPicker";

type NotepadFont = "default" | "serif" | "mono";
type NotepadLayoutSetting = { font: NotepadFont; wide: boolean; smallText: boolean };
const DEFAULT_LAYOUT: NotepadLayoutSetting = { font: "default", wide: false, smallText: false };
const FONT_OPTIONS: { id: NotepadFont; label: string }[] = [
  { id: "default", label: "پیش‌فرض" },
  { id: "serif", label: "سریف" },
  { id: "mono", label: "مونو" },
];

type SlashState = { blockId: string; query: string; anchorRect: DOMRect } | null;

function sortByPosition(blocks: NotepadBlock[]): NotepadBlock[] {
  return [...blocks].sort((a, b) => a.position - b.position);
}

export function NotepadEditor({
  page,
  breadcrumb,
  onPageMetaChange,
  onRequestDelete,
  onRequestDuplicate,
  onRequestToggleFavorite,
  onRequestMove,
  onNavigate,
}: {
  page: NotepadPageWithBlocks;
  breadcrumb: NotepadPage[];
  onPageMetaChange: (updated: NotepadPage) => void;
  onRequestDelete: () => void;
  onRequestDuplicate: () => void;
  onRequestToggleFavorite: () => void;
  onRequestMove: () => void;
  onNavigate: (id: string) => void;
}) {
  const [title, setTitle] = useState(page.title);
  const [icon, setIcon] = useState(page.icon);
  const [coverUrl, setCoverUrl] = useState(page.coverUrl);
  const [isLocked, setIsLocked] = useState(page.isLocked);
  const [blocks, setBlocks] = useState<NotepadBlock[]>(page.blocks);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [slash, setSlash] = useState<SlashState>(null);
  const [pageMenuOpen, setPageMenuOpen] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [layout, setLayout] = useState<NotepadLayoutSetting>(DEFAULT_LAYOUT);
  const [toast, setToast] = useState<string | null>(null);

  const editorScopeRef = useRef<HTMLDivElement>(null);
  const blockRefs = useRef(new Map<string, HTMLElement>());
  const pendingFocus = useRef<{ id: string; offset: number } | null>(null);
  const skipNextSave = useRef(true);
  const coverFileRef = useRef<HTMLInputElement>(null);

  function showToast(text: string) {
    setToast(text);
    setTimeout(() => setToast((t) => (t === text ? null : t)), 2200);
  }

  // ناوبری به یه صفحه‌ی دیگه — کل استیت محلی از سرور reseed می‌شه
  useEffect(() => {
    setTitle(page.title);
    setIcon(page.icon);
    setCoverUrl(page.coverUrl);
    setIsLocked(page.isLocked);
    setBlocks(page.blocks.length ? page.blocks : [makeBlock(page.id, "paragraph", 1000)]);
    skipNextSave.current = true;
    setSaveStatus("idle");
    getSetting<NotepadLayoutSetting>(`notepad-layout:${page.id}`, DEFAULT_LAYOUT).then(setLayout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id]);

  function patchLayout(patch: Partial<NotepadLayoutSetting>) {
    setLayout((prev) => {
      const next = { ...prev, ...patch };
      setSetting(`notepad-layout:${page.id}`, next);
      return next;
    });
  }

  // اتوسیو بلاک‌ها — دیبانس‌شده، بعد هر تغییر واقعی blocks (نه seed اولیه).
  // یه قفل ساده هم داره (isSavingRef/saveAgainRef) تا دو درخواست PUT هیچ‌وقت
  // هم‌زمان در پرواز نباشن — اگه تایپ بعدی درست وسط یه ذخیره‌ی درحال‌انجام
  // برسه، به‌جای فایرکردن فوری یه درخواست دیگه، فقط علامت می‌زنه که بعد
  // اتمام درخواست فعلی یه بار دیگه (با آخرین blocks) ذخیره کنه.
  const isSavingRef = useRef(false);
  const saveAgainRef = useRef(false);
  const latestBlocksRef = useRef(blocks);
  latestBlocksRef.current = blocks;

  async function runSave() {
    isSavingRef.current = true;
    do {
      saveAgainRef.current = false;
      await saveNotepadBlocks(page.id, latestBlocksRef.current);
    } while (saveAgainRef.current);
    isSavingRef.current = false;
    setSaveStatus("saved");
  }

  useEffect(() => {
    if (skipNextSave.current) { skipNextSave.current = false; return; }
    setSaveStatus("saving");
    const t = setTimeout(() => {
      if (isSavingRef.current) { saveAgainRef.current = true; return; }
      runSave();
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks]);

  // اتوسیو عنوان/آیکون — جدا از بلاک‌ها، چون روت متفاوتی داره
  const titleSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function scheduleMetaSave(patch: { title?: string; icon?: string | null }) {
    if (titleSaveTimer.current) clearTimeout(titleSaveTimer.current);
    setSaveStatus("saving");
    titleSaveTimer.current = setTimeout(async () => {
      const updated = await updateNotepadPage(page.id, patch);
      setSaveStatus("saved");
      if (updated) onPageMetaChange(updated);
    }, 500);
  }

  async function setCover(url: string | null) {
    setCoverUrl(url);
    const updated = await updateNotepadPage(page.id, { coverUrl: url });
    if (updated) onPageMetaChange(updated);
  }

  function handleCoverFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const canvas = document.createElement("canvas");
      const img = new Image();
      img.onload = () => {
        const maxW = 1400;
        const scale = Math.min(1, maxW / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setCover(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function toggleLock() {
    const next = !isLocked;
    setIsLocked(next);
    const updated = await updateNotepadPage(page.id, { isLocked: next });
    if (updated) onPageMetaChange(updated);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/notepad/${page.id}`);
      showToast("لینک کپی شد");
    } catch { showToast("کپی نشد"); }
  }

  async function copyContents() {
    try {
      await navigator.clipboard.writeText(blocksToPlainText(blocks));
      showToast("محتوای صفحه کپی شد");
    } catch { showToast("کپی نشد"); }
  }

  function viewBreadcrumbPath() {
    if (!breadcrumb.length) { showToast("این صفحه زیر هیچ صفحه‌ای نیست"); return; }
    showToast(breadcrumb.map((p) => p.title || "بدون عنوان").join(" / "));
  }

  // synchronous (قبل از پینت) نه requestAnimationFrame — چون یه keydown بعدی
  // (مثلا وقتی کاربر/اسکریپت خیلی سریع پشت‌سرهم تایپ می‌کنه) ممکنه زودتر از
  // یه فوکوس deferred برسه و حرف رو توی بلاک قبلی/غلط بندازه
  useLayoutEffect(() => {
    if (!pendingFocus.current) return;
    const { id, offset } = pendingFocus.current;
    pendingFocus.current = null;
    const el = blockRefs.current.get(id);
    if (el) {
      el.focus();
      setCaretAtOffset(el, offset);
    }
  });

  const topLevel = useMemo(() => sortByPosition(blocks.filter((b) => !b.parentBlockId)), [blocks]);
  const childrenOf = useCallback((parentId: string) => sortByPosition(blocks.filter((b) => b.parentBlockId === parentId)), [blocks]);

  // ترتیب نمایشی واقعی (برای Arrow Up/Down) — بلاک‌های تاپ‌لول به‌همراه
  // بچه‌های تاگل‌های بازشده، به همون ترتیبی که روی صفحه دیده می‌شن
  const renderOrder = useMemo(() => {
    const order: string[] = [];
    for (const b of topLevel) {
      order.push(b.id);
      if (b.type === "toggle" && !b.collapsed) {
        for (const c of childrenOf(b.id)) order.push(c.id);
      }
    }
    return order;
  }, [topLevel, childrenOf]);

  function findBlock(id: string): NotepadBlock | undefined {
    return blocks.find((b) => b.id === id);
  }

  const insertBlockAfter = useCallback((afterId: string | null, type: BlockType, initialContent: RichLeaf[], parentBlockId: string | null) => {
    setBlocks((prev) => {
      const level = sortByPosition(prev.filter((b) => b.parentBlockId === parentBlockId));
      const afterIdx = afterId ? level.findIndex((b) => b.id === afterId) : level.length - 1;
      const prevPos = afterIdx >= 0 ? level[afterIdx].position : null;
      const nextPos = afterIdx >= 0 && level[afterIdx + 1] ? level[afterIdx + 1].position : null;
      const newBlock = makeBlock(page.id, type, midPosition(prevPos, nextPos), parentBlockId);
      newBlock.content = initialContent;
      pendingFocus.current = { id: newBlock.id, offset: 0 };
      return [...prev, newBlock];
    });
  }, [page.id]);

  const handlers: BlockRowHandlers = {
    registerRef: (id, el) => { if (el) blockRefs.current.set(id, el); else blockRefs.current.delete(id); },
    onChangeContent: (id, leaves) => setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, content: leaves } : b))),
    onToggleChecked: (id) => setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, checked: !b.checked } : b))),
    onToggleCollapsed: (id) => setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, collapsed: !b.collapsed } : b))),
    onImageSet: (id, url) => setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, imageUrl: url } : b))),
    onDatabaseCreated: (id, databaseId) => setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, databaseId } : b))),
    onCodeChange: (id, text, language) => setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, content: plainTextToLeaves(text), language } : b))),
    onConvertType: (id, type) => {
      setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, type, content: [], checked: false } : b)));
      // بعد خالی‌کردن محتوا، innerHTML ریست می‌شه و caret نامعتبر می‌مونه —
      // بدون این، تایپ بلافاصله‌ی بعدی (مثلا وقتی اسکریپت/کاربر تندتند
      // می‌نویسه) به‌جایی نمی‌رسه چون selection هنوز به نود حذف‌شده اشاره داره
      pendingFocus.current = { id, offset: 0 };
    },

    onDelete: (id) => {
      const idx = renderOrder.indexOf(id);
      const fallbackId = renderOrder[idx - 1] ?? renderOrder[idx + 1] ?? null;
      setBlocks((prev) => {
        const toRemove = new Set([id, ...prev.filter((b) => b.parentBlockId === id).map((b) => b.id)]);
        const next = prev.filter((b) => !toRemove.has(b.id));
        return next.length ? next : [makeBlock(page.id, "paragraph", 1000)];
      });
      if (fallbackId) {
        const el = blockRefs.current.get(fallbackId);
        pendingFocus.current = { id: fallbackId, offset: el?.textContent?.length ?? 0 };
      }
    },

    onEnter: (id, beforeText, afterLeaves) => {
      const block = findBlock(id);
      if (!block) return;
      const isListLike = block.type === "bulleted_list" || block.type === "numbered_list" || block.type === "todo";
      if (isListLike && !beforeText.trim() && !afterLeaves.length) {
        setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, type: "paragraph", content: [] } : b)));
        pendingFocus.current = { id, offset: 0 };
        return;
      }
      const newType: BlockType = isListLike ? block.type : "paragraph";
      setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, content: plainTextToLeaves(beforeText) } : b)));
      // برای تاگل، بلاک جدید بعد آخرین بچه (یا خود تاگل اگه بچه‌ای نداره) اضافه می‌شه، نه وسط بچه‌ها
      if (block.type === "toggle" && !block.collapsed) {
        const kids = childrenOf(block.id);
        const afterId = kids.length ? kids[kids.length - 1].id : block.id;
        insertBlockAfter(afterId, "paragraph", afterLeaves, block.parentBlockId);
      } else {
        insertBlockAfter(id, newType, afterLeaves, block.parentBlockId);
      }
    },

    onBackspaceAtStart: (id) => {
      const block = findBlock(id);
      if (!block) return;
      const hasChildren = blocks.some((b) => b.parentBlockId === id);
      if (block.type !== "paragraph") {
        setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, type: "paragraph" } : b)));
        pendingFocus.current = { id, offset: 0 };
        return;
      }
      if (hasChildren) return; // برای جلوگیری از یتیم‌شدن بچه‌ها، فعلا حذف/ادغام نمی‌کنیم
      const level = sortByPosition(blocks.filter((b) => b.parentBlockId === block.parentBlockId));
      const idx = level.findIndex((b) => b.id === id);
      if (idx <= 0) return; // اولین بلاک این سطح — کاری نمی‌کنیم
      const prevBlock = level[idx - 1];
      if (prevBlock.type === "divider" || prevBlock.type === "image") return;
      const mergeOffset = leavesToPlainText(prevBlock.content).length;
      setBlocks((prev) =>
        prev
          .map((b) => (b.id === prevBlock.id ? { ...b, content: [...b.content, ...block.content] } : b))
          .filter((b) => b.id !== id)
      );
      pendingFocus.current = { id: prevBlock.id, offset: mergeOffset };
    },

    onArrowUp: (id) => {
      const idx = renderOrder.indexOf(id);
      if (idx > 0) {
        const targetId = renderOrder[idx - 1];
        const el = blockRefs.current.get(targetId);
        pendingFocus.current = { id: targetId, offset: el?.textContent?.length ?? 0 };
      }
    },
    onArrowDown: (id) => {
      const idx = renderOrder.indexOf(id);
      if (idx !== -1 && idx < renderOrder.length - 1) {
        pendingFocus.current = { id: renderOrder[idx + 1], offset: 0 };
      }
    },

    onSlashOpen: (id, query, anchorEl) => setSlash({ blockId: id, query, anchorRect: anchorEl.getBoundingClientRect() }),
    onSlashUpdateQuery: (query) => setSlash((s) => (s ? { ...s, query } : s)),
    onSlashClose: () => setSlash(null),
  };

  function handleSlashSelect(type: BlockType) {
    if (!slash) return;
    const blockId = slash.blockId;
    setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, type, content: [], checked: false } : b)));
    setSlash(null);
    pendingFocus.current = { id: blockId, offset: 0 };
  }

  function handleTopLevelReorder(newOrderIds: string[]) {
    setBlocks((prev) => {
      const positioned = new Map(newOrderIds.map((id, i) => [id, (i + 1) * 1000]));
      return prev.map((b) => (positioned.has(b.id) ? { ...b, position: positioned.get(b.id)! } : b));
    });
  }

  function handleChildReorder(parentId: string, newOrderIds: string[]) {
    setBlocks((prev) => {
      const positioned = new Map(newOrderIds.map((id, i) => [id, (i + 1) * 1000]));
      return prev.map((b) => (b.parentBlockId === parentId && positioned.has(b.id) ? { ...b, position: positioned.get(b.id)! } : b));
    });
  }

  function appendParagraphAtEnd() {
    const last = topLevel[topLevel.length - 1];
    if (last && last.type === "paragraph" && leavesToPlainText(last.content).length === 0) {
      pendingFocus.current = { id: last.id, offset: 0 };
      const el = blockRefs.current.get(last.id);
      el?.focus();
      return;
    }
    insertBlockAfter(last?.id ?? null, "paragraph", [], null);
  }

  let numberedCounter = 0;
  const editorClassName = [
    "notepad-editor",
    layout.font !== "default" && `notepad-font-${layout.font}`,
    layout.wide && "notepad-editor-wide",
    layout.smallText && "notepad-editor-small-text",
  ].filter(Boolean).join(" ");

  return (
    <div className={editorClassName} ref={editorScopeRef}>
      {coverUrl && (
        <div className="notepad-cover">
          <img src={coverUrl} alt="" />
          {!isLocked && (
            <div className="notepad-cover-actions">
              <button type="button" onClick={() => coverFileRef.current?.click()}>تغییر کاور</button>
              <button type="button" onClick={() => setCover(null)}>حذف</button>
            </div>
          )}
        </div>
      )}
      <input
        ref={coverFileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => e.target.files?.[0] && handleCoverFile(e.target.files[0])}
      />

      {breadcrumb.length > 0 && (
        <div className="notepad-breadcrumb">
          {breadcrumb.map((p, i) => (
            <span key={p.id} className="notepad-breadcrumb-item">
              <button type="button" onClick={() => onNavigate(p.id)}>{p.icon ? `${p.icon} ` : ""}{p.title || "بدون عنوان"}</button>
              {i < breadcrumb.length - 1 && <ChevronLeft size={12} />}
            </span>
          ))}
        </div>
      )}

      <div className="notepad-editor-head">
        <div className="notepad-save-status">
          {saveStatus === "saving" ? "در حال ذخیره…" : saveStatus === "saved" ? "ذخیره شد" : ""}
          {isLocked && <span className="notepad-locked-badge"><Lock size={10} /> قفل</span>}
        </div>
        <div className="notepad-editor-head-actions">
          <button type="button" className={`notepad-fav-btn${page.isFavorite ? " on" : ""}`} onClick={onRequestToggleFavorite} aria-label="سنجاق">
            <Star size={15} fill={page.isFavorite ? "currentColor" : "none"} />
          </button>
          <div className="relative">
            <button type="button" className="notepad-page-menu-btn" onClick={() => setPageMenuOpen((v) => !v)} aria-label="گزینه‌ها">
              <MoreHorizontal size={16} />
            </button>
            {pageMenuOpen && (
              <>
                <div className="fixed inset-0 z-[19]" onClick={() => setPageMenuOpen(false)} />
                <div className="notepad-page-menu thin-scroll">
                  <div className="notepad-page-menu-fonts">
                    {FONT_OPTIONS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className={`notepad-font-swatch notepad-font-${f.id}${layout.font === f.id ? " active" : ""}`}
                        onClick={() => patchLayout({ font: f.id })}
                      >
                        <span className="notepad-font-swatch-sample">Ag</span>
                        <span className="notepad-font-swatch-label">{f.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="notepad-page-menu-divider" />
                  <button type="button" onClick={() => { setPageMenuOpen(false); copyLink(); }}>کپی لینک</button>
                  <button type="button" onClick={() => { setPageMenuOpen(false); copyContents(); }}>کپی محتوای صفحه</button>
                  <button type="button" onClick={() => { setPageMenuOpen(false); onRequestDuplicate(); }}>کپی از این صفحه</button>
                  <button type="button" onClick={() => { setPageMenuOpen(false); onRequestMove(); }}>جابه‌جاکردن…</button>
                  <div className="notepad-page-menu-divider" />
                  {coverUrl ? (
                    <>
                      <button type="button" onClick={() => { setPageMenuOpen(false); coverFileRef.current?.click(); }}>تغییر کاور</button>
                      <button type="button" onClick={() => { setPageMenuOpen(false); setCover(null); }}>حذف کاور</button>
                    </>
                  ) : (
                    <button type="button" onClick={() => { setPageMenuOpen(false); coverFileRef.current?.click(); }}>افزودن کاور</button>
                  )}
                  <button type="button" onClick={() => { setPageMenuOpen(false); viewBreadcrumbPath(); }}>دیدن مسیر</button>
                  <div className="notepad-page-menu-divider" />
                  <div className="stat-toggle-row">
                    <span className="notepad-page-menu-toggle-label">عرض کامل</span>
                    <button type="button" className={`ios-toggle${layout.wide ? " on" : ""}`} onClick={() => patchLayout({ wide: !layout.wide })}>
                      <span className="ios-toggle-knob" />
                    </button>
                  </div>
                  <div className="stat-toggle-row">
                    <span className="notepad-page-menu-toggle-label">متن کوچک</span>
                    <button type="button" className={`ios-toggle${layout.smallText ? " on" : ""}`} onClick={() => patchLayout({ smallText: !layout.smallText })}>
                      <span className="ios-toggle-knob" />
                    </button>
                  </div>
                  <div className="stat-toggle-row">
                    <span className="notepad-page-menu-toggle-label">قفل صفحه</span>
                    <button type="button" className={`ios-toggle${isLocked ? " on" : ""}`} onClick={toggleLock}>
                      <span className="ios-toggle-knob" />
                    </button>
                  </div>
                  <div className="notepad-page-menu-divider" />
                  <button type="button" className="notepad-page-menu-danger" onClick={() => { setPageMenuOpen(false); onRequestDelete(); }}>انتقال به سطل زباله</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="notepad-title-row">
        <button
          type="button"
          className={`notepad-icon-btn${coverUrl ? " overlap" : ""}`}
          onClick={() => !isLocked && setIconPickerOpen((v) => !v)}
        >
          {icon || "📄"}
        </button>
        {iconPickerOpen && !isLocked && (
          <NotepadIconPicker
            onPick={(emoji) => { setIcon(emoji); setIconPickerOpen(false); scheduleMetaSave({ icon: emoji }); }}
            onClose={() => setIconPickerOpen(false)}
          />
        )}
        <input
          type="text"
          className="notepad-title-input"
          placeholder="بدون عنوان"
          maxLength={NOTEPAD_TITLE_MAX}
          value={title}
          readOnly={isLocked}
          onChange={(e) => { setTitle(e.target.value); scheduleMetaSave({ title: e.target.value }); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const first = topLevel[0];
              if (first) { const el = blockRefs.current.get(first.id); el?.focus(); }
            }
          }}
        />
      </div>
      {!coverUrl && !isLocked && (
        <button type="button" className="notepad-add-cover-btn" onClick={() => coverFileRef.current?.click()}>
          <ImagePlus size={12} /> افزودن کاور
        </button>
      )}

      <Reorder.Group axis="y" values={topLevel.map((b) => b.id)} onReorder={handleTopLevelReorder} as="div" className="notepad-blocks-list">
        {topLevel.map((block) => {
          let numberedIndex: number | undefined;
          if (block.type === "numbered_list") { numberedCounter += 1; numberedIndex = numberedCounter; }
          else numberedCounter = 0;

          return (
            <div key={block.id}>
              <NotepadBlockRow block={block} index={0} numberedIndex={numberedIndex} editable locked={isLocked} handlers={handlers} />
              {block.type === "toggle" && !block.collapsed && (
                <Reorder.Group
                  axis="y"
                  values={childrenOf(block.id).map((c) => c.id)}
                  onReorder={(ids) => handleChildReorder(block.id, ids)}
                  as="div"
                  className="notepad-toggle-children"
                >
                  {childrenOf(block.id).map((child) => (
                    <NotepadBlockRow key={child.id} block={child} index={0} editable locked={isLocked} handlers={handlers} />
                  ))}
                  {!isLocked && (
                    <button type="button" className="notepad-toggle-add-child" onClick={() => insertBlockAfter(null, "paragraph", [], block.id)}>
                      <Plus size={12} /> افزودن به داخل تاگل
                    </button>
                  )}
                </Reorder.Group>
              )}
            </div>
          );
        })}
      </Reorder.Group>

      {!isLocked && <div className="notepad-editor-bottom-space" onClick={appendParagraphAtEnd} />}

      {slash && (
        <SlashCommandMenu
          query={slash.query}
          anchorRect={slash.anchorRect}
          onSelect={handleSlashSelect}
          onClose={() => setSlash(null)}
        />
      )}
      <NotepadFormatToolbar containerRef={editorScopeRef} />
      {toast && <div className="notepad-toast">{toast}</div>}
    </div>
  );
}
