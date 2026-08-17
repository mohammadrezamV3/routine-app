"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { NotepadPage } from "@/lib/notepad";

// پاپ‌آپِ «جابه‌جاکردن» — لیستِ همه‌ی صفحاتِ غیرآرشیوشده (به‌جز خودِ صفحه و
// زیرمجموعه‌هاش، که سرور هم دوباره چکش می‌کنه) برای انتخابِ والدِ جدید؛
// گزینه‌ی «سطحِ اصلی» هم برای بردنِ صفحه به ریشه
export function NotepadMovePicker({
  pages,
  currentPageId,
  onPick,
  onClose,
}: {
  pages: NotepadPage[];
  currentPageId: string;
  onPick: (parentId: string | null) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  const excludedIds = useMemo(() => {
    const excluded = new Set<string>([currentPageId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const p of pages) {
        if (p.parentId && excluded.has(p.parentId) && !excluded.has(p.id)) {
          excluded.add(p.id);
          changed = true;
        }
      }
    }
    return excluded;
  }, [pages, currentPageId]);

  const options = pages
    .filter((p) => !p.isArchived && !excludedIds.has(p.id))
    .filter((p) => !query.trim() || p.title.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <>
      <div className="modal-overlay open" onClick={onClose} />
      <div className="notepad-palette open">
        <div className="notepad-palette-input-row">
          <Search size={15} />
          <input autoFocus type="text" placeholder="اسمِ صفحه‌ی مقصد…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="notepad-palette-list thin-scroll">
          <button type="button" className="notepad-palette-item" onClick={() => onPick(null)}>
            <span>📂 سطحِ اصلی (بدونِ والد)</span>
          </button>
          {options.map((p) => (
            <button key={p.id} type="button" className="notepad-palette-item" onClick={() => onPick(p.id)}>
              <span>{p.icon || "📄"} {p.title || "بدونِ عنوان"}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
