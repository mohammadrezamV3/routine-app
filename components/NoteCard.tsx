"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, Check, MoreVertical, Pin } from "lucide-react";
import { NoteItem } from "@/lib/notes";
import { faNum, toJalali, J_MONTHS } from "@/lib/jalali";

function formatReminder(iso: string): string {
  const d = new Date(iso);
  const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${faNum(j[2])} ${J_MONTHS[j[1] - 1]} — ${faNum(hh)}:${faNum(mm)}`;
}

export function NoteCard({
  note,
  onEdit,
  onDelete,
  onTogglePin,
  onToggleChecklistItem,
  delay,
}: {
  note: NoteItem;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onToggleChecklistItem: (itemId: string) => void;
  delay?: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const doneCount = note.checklist?.filter((i) => i.done).length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay }}
      className="note-card"
    >
      <div className="note-card-head">
        <div className="flex min-w-0 items-center gap-1.5">
          {note.pinned && <Pin size={12} className="shrink-0 text-dash-green" fill="currentColor" />}
          <h3 className="truncate text-[13.5px] font-bold text-dash-text">{note.title}</h3>
        </div>
        <div className="relative shrink-0">
          <button type="button" onClick={() => setMenuOpen((v) => !v)} aria-label="گزینه‌ها" className="note-card-menu-btn">
            <MoreVertical size={15} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-[19]" onClick={() => setMenuOpen(false)} />
              <div className="note-card-menu">
                <button type="button" onClick={() => { onEdit(); setMenuOpen(false); }}>ویرایش</button>
                <button type="button" onClick={() => { onTogglePin(); setMenuOpen(false); }}>{note.pinned ? "برداشتنِ سنجاق" : "سنجاق کردن"}</button>
                <button type="button" className="note-card-menu-danger" onClick={() => { onDelete(); setMenuOpen(false); }}>حذف</button>
              </div>
            </>
          )}
        </div>
      </div>

      {note.checklist?.length ? (
        <div className="note-card-checklist">
          {note.checklist.slice(0, 6).map((item) => (
            <div key={item.id} className="note-checklist-row note-checklist-row-view" onClick={() => onToggleChecklistItem(item.id)}>
              <span className={`note-checklist-check${item.done ? " done" : ""}`}>
                {item.done && <Check size={11} strokeWidth={3} />}
              </span>
              <span className={`truncate text-[12px]${item.done ? " note-checklist-text-done" : " text-dash-text"}`}>{item.text}</span>
            </div>
          ))}
          {note.checklist.length > 6 && (
            <div className="text-[10.5px] text-dash-muted">و {faNum(note.checklist.length - 6)} موردِ دیگر…</div>
          )}
          <div className="mt-1 text-[10px] text-dash-muted">{faNum(doneCount)} از {faNum(note.checklist.length)} انجام‌شده</div>
        </div>
      ) : (
        note.content && <p className="note-card-content">{note.content}</p>
      )}

      {(note.tags.length > 0 || note.reminderAt) && (
        <div className="note-card-footer">
          {note.reminderAt && (
            <span className="note-card-reminder">
              <Bell size={11} />
              {formatReminder(note.reminderAt)}
            </span>
          )}
          {note.tags.map((t) => (
            <span key={t} className="note-tag-pill note-tag-pill-view">{t}</span>
          ))}
        </div>
      )}
    </motion.div>
  );
}
