import { useState } from "react";
import { Plus, Pin, Trash2 } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import BottomSheet from "@/components/BottomSheet";
import { db, baseRow, touch, type TradeNoteRow } from "../db";
import { useLiveQuery } from "../lib/useLiveQuery";
import { tapHaptic } from "@/lib/haptics";

export default function Notes() {
  const [editing, setEditing] = useState<TradeNoteRow | "new" | null>(null);

  const notes =
    useLiveQuery(
      () =>
        db.notes
          .toArray()
          .then((rows) => rows.filter((n) => !n.deletedAt))
          .then((rows) => rows.sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())),
      [],
      [],
    ) ?? [];

  async function togglePin(n: TradeNoteRow) {
    await db.notes.put(touch({ ...n, pinned: !n.pinned }));
    await tapHaptic();
  }

  async function remove(n: TradeNoteRow) {
    await db.notes.put(touch({ ...n, deletedAt: new Date().toISOString() }));
    await tapHaptic();
  }

  return (
    <div>
      <AppHeader
        title="یادداشت‌ها"
        showBack
        right={
          <button
            onClick={() => setEditing("new")}
            className="flex items-center justify-center rounded-full"
            style={{ width: 40, height: 40, background: "var(--accent-dim)" }}
            aria-label="یادداشت جدید"
          >
            <Plus size={18} color="var(--accent)" />
          </button>
        }
      />
      <div className="flex flex-col gap-2.5 px-4 py-4">
        {notes.length === 0 && (
          <div className="rounded-card border px-4 py-8 text-center font-vazir text-[13px]" style={{ borderColor: "var(--surface-line)", color: "var(--muted)" }}>
            هنوز یادداشتی ثبت نشده.
          </div>
        )}
        {notes.map((n) => (
          <div
            key={n.id}
            className="flex flex-col gap-1.5 rounded-card border px-4 py-3"
            style={{ borderColor: "var(--surface-line)", background: "var(--surface-1)", borderInlineStart: `3px solid ${n.color}` }}
          >
            <div className="flex items-center gap-2">
              <button onClick={() => setEditing(n)} className="flex-1 text-start">
                <span className="font-vazir text-[14px] font-semibold" style={{ color: "var(--text)" }}>
                  {n.title || "بدون عنوان"}
                </span>
              </button>
              <button
                onClick={() => togglePin(n)}
                aria-label={n.pinned ? "برداشتنِ سنجاق" : "سنجاق کردن"}
                aria-pressed={n.pinned}
                style={{ width: 36, height: 36 }}
                className="flex items-center justify-center"
              >
                <Pin size={16} color={n.pinned ? "var(--accent)" : "var(--muted)"} fill={n.pinned ? "var(--accent)" : "none"} />
              </button>
              <button
                onClick={() => remove(n)}
                aria-label="حذفِ یادداشت"
                style={{ width: 36, height: 36 }}
                className="flex items-center justify-center"
              >
                <Trash2 size={16} color="var(--muted)" />
              </button>
            </div>
            {n.content && (
              <button onClick={() => setEditing(n)} className="text-start">
                <p className="line-clamp-3 font-vazir text-[13px]" style={{ color: "var(--muted)" }}>
                  {n.content}
                </p>
              </button>
            )}
          </div>
        ))}
      </div>

      <NoteEditorSheet note={editing === "new" ? null : editing} open={editing !== null} onClose={() => setEditing(null)} />
    </div>
  );
}

const NOTE_COLORS = ["#3E7BFA", "#16C79A", "#F5B841", "#EC4899", "#A855F7"];

function NoteEditorSheet({ note, open, onClose }: { note: TradeNoteRow | null; open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [color, setColor] = useState(note?.color ?? NOTE_COLORS[0]);

  const key = note?.id ?? "new";
  const [lastKey, setLastKey] = useState(key);
  if (lastKey !== key) {
    setLastKey(key);
    setTitle(note?.title ?? "");
    setContent(note?.content ?? "");
    setColor(note?.color ?? NOTE_COLORS[0]);
  }

  async function handleSave() {
    if (!title.trim() && !content.trim()) return;
    const row: TradeNoteRow = {
      ...(note ? touch(note) : (baseRow() as any)),
      title: title.trim(),
      content,
      color,
      pinned: note?.pinned ?? false,
      accountId: note?.accountId ?? null,
      entryId: note?.entryId ?? null,
      tagIds: note?.tagIds ?? [],
    };
    await db.notes.put(row);
    await tapHaptic();
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={note ? "ویرایش یادداشت" : "یادداشت جدید"}>
      <div className="flex flex-col gap-3 pt-1">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="عنوان"
          className="rounded-lg border px-3 font-vazir text-[14px]"
          style={{ height: 44, borderColor: "var(--surface-line)", background: "var(--input-bg)", color: "var(--text)" }}
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          placeholder="متن یادداشت..."
          className="rounded-lg border px-3 py-2 font-vazir text-[14px]"
          style={{ borderColor: "var(--surface-line)", background: "var(--input-bg)", color: "var(--text)" }}
        />
        <div className="flex gap-2">
          {NOTE_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="rounded-full"
              style={{ width: 30, height: 30, background: c, outline: color === c ? "2px solid var(--text)" : "none", outlineOffset: 2 }}
              aria-label={c}
            />
          ))}
        </div>
        <button
          onClick={handleSave}
          disabled={!title.trim() && !content.trim()}
          className="mt-1 rounded-lg py-3.5 font-vazir text-[14.5px] font-semibold"
          style={{ background: "var(--accent)", color: "#04140d", minHeight: 48 }}
        >
          ذخیره‌ی یادداشت
        </button>
      </div>
    </BottomSheet>
  );
}
