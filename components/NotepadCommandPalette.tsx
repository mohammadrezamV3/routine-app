"use client";

import { useEffect, useState } from "react";
import { FileText, Plus, Search, Sidebar as SidebarIcon } from "lucide-react";
import { NotepadSearchResult, searchNotepad } from "@/lib/notepad";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";

type Command = { id: string; label: string; icon: JSX.Element; run: () => void };

// Command Palette — با Ctrl/Cmd+K باز می‌شه؛ یه اینپوتِ واحد هم دستورهای
// پایه (صفحه‌ی جدید، toggle سایدبار) هم جستجوی سراسریِ عنوان/متنِ بلاک‌ها رو
// پوشش می‌ده — دقیقاً مثلِ الگویی که توی بخشِ «شروعِ کار» خواسته شده
export function NotepadCommandPalette({
  onClose,
  onNavigate,
  onCreatePage,
  onToggleSidebar,
}: {
  onClose: () => void;
  onNavigate: (pageId: string) => void;
  onCreatePage: () => void;
  onToggleSidebar: () => void;
}) {
  useLockBodyScroll();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NotepadSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const commands: Command[] = [
    { id: "new-page", label: "صفحه‌ی جدید", icon: <Plus size={14} />, run: onCreatePage },
    { id: "toggle-sidebar", label: "نمایش/پنهانِ سایدبار", icon: <SidebarIcon size={14} />, run: onToggleSidebar },
  ];

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      const r = await searchNotepad(query);
      setResults(r);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const filteredCommands = query.trim() ? commands.filter((c) => c.label.includes(query.trim())) : commands;

  return (
    <>
      <div className="modal-overlay open" onClick={onClose} />
      <div className="notepad-palette open">
        <div className="notepad-palette-input-row">
          <Search size={15} />
          <input
            autoFocus
            type="text"
            placeholder="جستجو یا یه دستور بنویس…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="notepad-palette-list thin-scroll">
          {!query.trim() && filteredCommands.map((c) => (
            <button key={c.id} type="button" className="notepad-palette-item" onClick={() => { c.run(); onClose(); }}>
              {c.icon}
              <span>{c.label}</span>
            </button>
          ))}
          {query.trim() && loading && <div className="notepad-palette-empty">در حال جستجو…</div>}
          {query.trim() && !loading && results.length === 0 && <div className="notepad-palette-empty">چیزی پیدا نشد</div>}
          {results.map((r, i) => (
            <button key={`${r.pageId}-${i}`} type="button" className="notepad-palette-item" onClick={() => { onNavigate(r.pageId); onClose(); }}>
              <FileText size={14} />
              <span className="flex min-w-0 flex-col items-start">
                <span className="truncate">{r.icon ? `${r.icon} ` : ""}{r.title}</span>
                {r.snippet && <span className="notepad-palette-snippet">{r.snippet}</span>}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
