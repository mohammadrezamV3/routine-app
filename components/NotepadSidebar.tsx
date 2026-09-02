"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown, ChevronRight, Clock, FileText, Plus, Search, Star, Trash2, X,
} from "lucide-react";
import { NotepadPage } from "@/lib/notepad";
import { faNum } from "@/lib/jalali";

type SidebarView = "tree" | "trash";

function NotepadPageTreeItem({
  page,
  depth,
  childrenMap,
  activePageId,
  expanded,
  onToggleExpand,
  onNavigate,
  onCreateChild,
}: {
  page: NotepadPage;
  depth: number;
  childrenMap: Map<string | null, NotepadPage[]>;
  activePageId: string | null;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  onNavigate: (id: string) => void;
  onCreateChild: (parentId: string) => void;
}) {
  const kids = childrenMap.get(page.id) || [];
  const isExpanded = expanded.has(page.id);
  const isActive = activePageId === page.id;

  return (
    <div>
      <div className={`notepad-tree-row${isActive ? " active" : ""}`} style={{ paddingRight: 8 + depth * 16 }}>
        <button
          type="button"
          className={`notepad-tree-caret${kids.length ? "" : " invisible"}`}
          onClick={(e) => { e.stopPropagation(); onToggleExpand(page.id); }}
          tabIndex={kids.length ? 0 : -1}
        >
          {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
        <button type="button" className="notepad-tree-label" onClick={() => onNavigate(page.id)}>
          <span className="notepad-tree-icon">{page.icon || "📄"}</span>
          <span className="notepad-tree-title">{page.title || "بدون عنوان"}</span>
        </button>
        <button type="button" className="notepad-tree-add" onClick={(e) => { e.stopPropagation(); onCreateChild(page.id); }} aria-label="زیرصفحه‌ی جدید">
          <Plus size={12} />
        </button>
      </div>
      {isExpanded && kids.length > 0 && (
        <div>
          {kids.map((child) => (
            <NotepadPageTreeItem
              key={child.id}
              page={child}
              depth={depth + 1}
              childrenMap={childrenMap}
              activePageId={activePageId}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
              onNavigate={onNavigate}
              onCreateChild={onCreateChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function NotepadSidebar({
  pages,
  activePageId,
  mobileOpen,
  onCloseMobile,
  onNavigate,
  onCreatePage,
  onOpenSearch,
  onRestore,
  onPermanentDelete,
}: {
  pages: NotepadPage[];
  activePageId: string | null;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onNavigate: (id: string) => void;
  onCreatePage: (parentId: string | null) => void;
  onOpenSearch: () => void;
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
}) {
  const [view, setView] = useState<SidebarView>("tree");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const active = pages.filter((p) => !p.isArchived);
  const archived = useMemo(() => pages.filter((p) => p.isArchived).sort((a, b) => +new Date(b.archivedAt || 0) - +new Date(a.archivedAt || 0)), [pages]);
  const favorites = useMemo(() => active.filter((p) => p.isFavorite).sort((a, b) => a.title.localeCompare(b.title)), [active]);
  const recent = useMemo(
    () => active.filter((p) => p.lastOpenedAt).sort((a, b) => +new Date(b.lastOpenedAt!) - +new Date(a.lastOpenedAt!)).slice(0, 6),
    [active]
  );
  const childrenMap = useMemo(() => {
    const map = new Map<string | null, NotepadPage[]>();
    for (const p of active) {
      const arr = map.get(p.parentId) || [];
      arr.push(p);
      map.set(p.parentId, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.position - b.position);
    return map;
  }, [active]);
  const roots = childrenMap.get(null) || [];

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <>
      <div className={`notepad-sidebar-overlay${mobileOpen ? " open" : ""}`} onClick={onCloseMobile} />
      <aside className={`notepad-sidebar${mobileOpen ? " open" : ""}`}>
        <div className="notepad-sidebar-head">
          <span className="notepad-sidebar-title">دفترچه</span>
          <button type="button" className="notepad-sidebar-close" onClick={onCloseMobile} aria-label="بستن"><X size={16} /></button>
        </div>

        <button type="button" className="notepad-sidebar-search-btn" onClick={onOpenSearch}>
          <Search size={14} />
          جستجو
          <span className="notepad-sidebar-search-kbd">⌘K</span>
        </button>

        <button type="button" className="notepad-sidebar-new-btn" onClick={() => onCreatePage(null)}>
          <Plus size={14} />
          صفحه‌ی جدید
        </button>

        {view === "tree" ? (
          <div className="notepad-sidebar-scroll thin-scroll">
            {favorites.length > 0 && (
              <div className="notepad-sidebar-section">
                <div className="notepad-sidebar-section-title"><Star size={11} /> علاقه‌مندی‌ها</div>
                {favorites.map((p) => (
                  <button key={p.id} type="button" className={`notepad-tree-row notepad-flat-row${activePageId === p.id ? " active" : ""}`} onClick={() => onNavigate(p.id)}>
                    <span className="notepad-tree-icon">{p.icon || "📄"}</span>
                    <span className="notepad-tree-title">{p.title || "بدون عنوان"}</span>
                  </button>
                ))}
              </div>
            )}

            {recent.length > 0 && (
              <div className="notepad-sidebar-section">
                <div className="notepad-sidebar-section-title"><Clock size={11} /> اخیر</div>
                {recent.map((p) => (
                  <button key={p.id} type="button" className={`notepad-tree-row notepad-flat-row${activePageId === p.id ? " active" : ""}`} onClick={() => onNavigate(p.id)}>
                    <span className="notepad-tree-icon">{p.icon || "📄"}</span>
                    <span className="notepad-tree-title">{p.title || "بدون عنوان"}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="notepad-sidebar-section">
              <div className="notepad-sidebar-section-title"><FileText size={11} /> همه‌ی صفحات</div>
              {roots.length === 0 ? (
                <div className="notepad-sidebar-empty">هنوز صفحه‌ای نساختی</div>
              ) : (
                roots.map((p) => (
                  <NotepadPageTreeItem
                    key={p.id}
                    page={p}
                    depth={0}
                    childrenMap={childrenMap}
                    activePageId={activePageId}
                    expanded={expanded}
                    onToggleExpand={toggleExpand}
                    onNavigate={onNavigate}
                    onCreateChild={onCreatePage}
                  />
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="notepad-sidebar-scroll thin-scroll">
            <div className="notepad-sidebar-section">
              {archived.length === 0 ? (
                <div className="notepad-sidebar-empty">سطل زباله خالیه</div>
              ) : (
                archived.map((p) => (
                  <div key={p.id} className="notepad-trash-row">
                    <span className="notepad-tree-icon">{p.icon || "📄"}</span>
                    <span className="notepad-tree-title">{p.title || "بدون عنوان"}</span>
                    <button type="button" onClick={() => onRestore(p.id)} title="بازگردانی">↺</button>
                    <button type="button" className="notepad-trash-danger" onClick={() => onPermanentDelete(p.id)} title="حذف همیشگی"><Trash2 size={12} /></button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <button type="button" className="notepad-sidebar-trash-btn" onClick={() => setView(view === "trash" ? "tree" : "trash")}>
          <Trash2 size={13} />
          {view === "trash" ? "بازگشت" : `سطل زباله${archived.length ? ` (${faNum(archived.length)})` : ""}`}
        </button>
      </aside>
    </>
  );
}
