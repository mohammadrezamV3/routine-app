"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { createPortal } from "react-dom";
import { Plus, StickyNote } from "lucide-react";
import { AuthGate } from "./AuthGate";
import { NoteCard } from "./NoteCard";
import { NoteEditorModal } from "./NoteEditorModal";
import { NoteItem, deleteNote, fetchNotes, updateNote } from "@/lib/notes";
import { fireTimerDone, getNotificationPermission } from "@/lib/notifications";

const FIRED_KEY = "arion-note-reminders-fired";

function loadFiredSet(): Set<string> {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}
function saveFiredSet(s: Set<string>) {
  try { localStorage.setItem(FIRED_KEY, JSON.stringify(Array.from(s))); } catch {}
}

// صفحه‌ی «یادداشت‌ها» — یه بخشِ آزادِ کاملاً شخصی (مثلِ کارهای روزمره، جزوِ
// پلنِ پایه، بدونِ نیاز به اشتراک): یادداشتِ متنی یا چک‌لیست، تگ‌های آزاد،
// سنجاق‌کردن، و یادآوریِ اختیاری که با Notification API مرورگر هماهنگه.
// دامنه‌ی این پیاده‌سازی عمداً محدودِ به همینا نگه داشته شده — نه یک کپیِ
// کاملِ Notion (بدونِ دیتابیس/کانبان/امبد/همکاریِ زنده).
export function NotesPanel() {
  const { status } = useSession();
  const [notes, setNotes] = useState<NoteItem[] | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchNotes().then(setNotes);
  }, [status]);

  // چکِ یادآوری‌ها — فقط تا وقتی همین صفحه بازه (محدودیتِ شناخته‌شده‌ی
  // Notification API مرورگر: بدونِ service worker، بیرونِ تب کار نمی‌کنه)
  useEffect(() => {
    if (!notes || getNotificationPermission() !== "granted") return;
    const check = () => {
      const fired = loadFiredSet();
      const now = Date.now();
      let changed = false;
      for (const n of notes) {
        if (!n.reminderAt || fired.has(n.id)) continue;
        if (new Date(n.reminderAt).getTime() <= now) {
          fireTimerDone("یادآوریِ یادداشت", n.title);
          fired.add(n.id);
          changed = true;
        }
      }
      if (changed) saveFiredSet(fired);
    };
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [notes]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    (notes ?? []).forEach((n) => n.tags.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [notes]);

  const visibleNotes = useMemo(() => {
    if (!notes) return [];
    return activeTag ? notes.filter((n) => n.tags.includes(activeTag)) : notes;
  }, [notes, activeTag]);

  function openCreate() {
    setEditingNote(null);
    setEditorOpen(true);
  }
  function openEdit(n: NoteItem) {
    setEditingNote(n);
    setEditorOpen(true);
  }
  function handleSaved(n: NoteItem) {
    setNotes((prev) => {
      if (!prev) return [n];
      const exists = prev.some((x) => x.id === n.id);
      const next = exists ? prev.map((x) => (x.id === n.id ? n : x)) : [n, ...prev];
      return next.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || +new Date(b.updatedAt) - +new Date(a.updatedAt));
    });
  }
  async function handleDelete(n: NoteItem) {
    setNotes((prev) => prev && prev.filter((x) => x.id !== n.id));
    await deleteNote(n.id);
  }
  async function handleTogglePin(n: NoteItem) {
    const next = { ...n, pinned: !n.pinned };
    handleSaved(next);
    await updateNote(n.id, { pinned: next.pinned });
  }
  async function handleToggleChecklistItem(n: NoteItem, itemId: string) {
    if (!n.checklist) return;
    const checklist = n.checklist.map((it) => (it.id === itemId ? { ...it, done: !it.done } : it));
    handleSaved({ ...n, checklist });
    await updateNote(n.id, { checklist });
  }

  if (status === "unauthenticated") {
    return <AuthGate message="برای استفاده از یادداشت‌ها وارد حساب شو" />;
  }

  return (
    <div className="dash-scope">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-[17px] font-bold text-dash-text sm:text-[20px]">
          <StickyNote className="h-5 w-5 text-dash-green" />
          یادداشت‌ها
        </h1>
        <button type="button" onClick={openCreate} className="notes-add-btn">
          <Plus size={16} />
          یادداشت جدید
        </button>
      </div>

      {allTags.length > 0 && (
        <div className="notes-tag-filter-row">
          <button type="button" className={`notes-tag-filter-chip${activeTag === null ? " on" : ""}`} onClick={() => setActiveTag(null)}>
            همه
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              type="button"
              className={`notes-tag-filter-chip${activeTag === t ? " on" : ""}`}
              onClick={() => setActiveTag(activeTag === t ? null : t)}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {notes === null ? (
        <div className="item-line" style={{ marginTop: 16 }}>در حال بارگذاری…</div>
      ) : visibleNotes.length === 0 ? (
        <div className="notes-empty-state">
          <StickyNote size={26} className="text-dash-muted" />
          <div className="text-[12.5px] text-dash-muted">
            {activeTag ? "یادداشتی با این تگ نیست" : "هنوز یادداشتی نساختی"}
          </div>
          {!activeTag && (
            <button type="button" onClick={openCreate} className="notes-add-btn">
              <Plus size={15} />
              اولین یادداشت رو بساز
            </button>
          )}
        </div>
      ) : (
        <div className="notes-grid">
          {visibleNotes.map((n, i) => (
            <NoteCard
              key={n.id}
              note={n}
              delay={Math.min(i, 8) * 0.03}
              onEdit={() => openEdit(n)}
              onDelete={() => handleDelete(n)}
              onTogglePin={() => handleTogglePin(n)}
              onToggleChecklistItem={(itemId) => handleToggleChecklistItem(n, itemId)}
            />
          ))}
        </div>
      )}

      {editorOpen && createPortal(
        <NoteEditorModal note={editingNote} onClose={() => setEditorOpen(false)} onSaved={handleSaved} />,
        document.body
      )}
    </div>
  );
}
