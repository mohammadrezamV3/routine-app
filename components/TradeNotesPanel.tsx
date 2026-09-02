"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Pin, PinOff, Search, StickyNote, Trash2, X } from "lucide-react";
import { faNum } from "@/lib/jalali";
import { getSetting } from "@/lib/storage";
import { formatTradeDateTime } from "@/lib/tradeDateTime";
import { PanelSkeleton } from "./PanelSkeleton";
import { useAsyncAction } from "@/lib/useAsyncAction";
import { LockBodyScroll } from "./LockBodyScroll";
import { TradeTagField } from "./TradeTagField";
import { CAL_SYSTEM_KEY, CalSystem, TAG_COLORS, TradeTag } from "@/lib/tradeTypes";

type Note = {
  id: string; title: string; content: string; color: string; pinned: boolean;
  accountId: string | null; entryId: string | null;
  createdAt: string; updatedAt: string; tags: TradeTag[];
};

// یادداشت‌های آزادِ تریدر: جست‌وجو، فیلترِ برچسب، رنگ و سنجاق‌کردن.
// برچسب‌ها همان برچسب‌های ماژولِ ترید هستند (مشترک با حساب و معامله)، نه یک
// لیستِ جدا — تا کاربر مجبور نباشد «Psychology» را دو بار بسازد.
export function TradeNotesPanel({
  creating,
  onCreatingChange,
}: {
  creating: boolean;
  onCreatingChange: (v: boolean) => void;
}) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<TradeTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [calSystem, setCalSystem] = useState<CalSystem>("jalali");
  const [editing, setEditing] = useState<Note | null>(null);
  const { pendingKey, error: actionError, run } = useAsyncAction();

  useEffect(() => { getSetting<CalSystem>(CAL_SYSTEM_KEY, "jalali").then(setCalSystem); }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (query.trim()) qs.set("q", query.trim());
      if (filterTags.length) qs.set("tags", filterTags.join(","));
      const [nRes, tRes] = await Promise.all([
        fetch(`/api/trade/notes?${qs}`),
        fetch("/api/trade/tags"),
      ]);
      setNotes(nRes.ok ? (await nRes.json()).notes || [] : []);
      setTags(tRes.ok ? (await tRes.json()).tags || [] : []);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [query, filterTags]);

  // جست‌وجو با تأخیر — تا هر حرفی که تایپ می‌شود یک درخواست نفرستد
  useEffect(() => {
    const t = setTimeout(load, query ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, query]);

  async function togglePin(n: Note) {
    setNotes((prev) => prev.map((x) => (x.id === n.id ? { ...x, pinned: !x.pinned } : x)));
    const ok = await run(`pin:${n.id}`, () =>
      fetch("/api/trade/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...n, pinned: !n.pinned, tagIds: n.tags.map((t) => t.id) }),
      })
    );
    load(true);
    if (!ok) return;
  }

  async function remove(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    const ok = await run(`del:${id}`, () => fetch(`/api/trade/notes?id=${id}`, { method: "DELETE" }));
    if (!ok) load(true); // برگرداندنِ یادداشتی که حذفش نشد
  }

  return (
    <div>
      <div className="trade-list-head" style={{ marginTop: 6 }}>
        <div className="trade-search" style={{ flex: 1 }}>
          <input className="wsearch-newform-name trade-glass-field" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جست‌وجو در یادداشت‌ها" style={{ width: "100%" }} />
          <button type="button" className="trade-search-btn" onClick={() => load()} aria-label="جست‌وجو"><Search size={14} /></button>
        </div>
      </div>

      {!!tags.length && (
        <div className="trade-tag-row" style={{ marginTop: 10 }}>
          {tags.map((t) => {
            const active = filterTags.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                className={`trade-tag-chip${active ? " active" : ""}`}
                style={active ? { borderColor: t.color, color: t.color } : undefined}
                onClick={() => setFilterTags((p) => (p.includes(t.id) ? p.filter((x) => x !== t.id) : [...p, t.id]))}
              >
                <span className="trade-tag-dot" style={{ background: t.color }} />
                {t.name}
              </button>
            );
          })}
        </div>
      )}

      {actionError && <div className="trade-form-error">{actionError}</div>}

      {loading && <PanelSkeleton />}
      {!loading && !notes.length && (
        <div className="trade-empty-state">
          <StickyNote size={32} />
          <p>{query || filterTags.length ? "یادداشتی با این فیلتر پیدا نشد" : "هنوز یادداشتی اضافه نشده"}</p>
        </div>
      )}

      <div className="trade-note-grid">
        {notes.map((n, i) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: Math.min(i, 8) * 0.04, ease: [0.22, 1, 0.36, 1] }}
            className="trade-surface trade-note-card"
            onClick={() => setEditing(n)}
          >
            <span className="trade-account-stripe" style={{ background: n.color }} />
            <div className="trade-note-head">
              <span className="trade-note-title">{n.title}</span>
              <div className="trade-account-actions" style={{ margin: 0 }} onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="trade-icon-btn"
                  onClick={() => togglePin(n)}
                  disabled={pendingKey === `pin:${n.id}`}
                  aria-label={n.pinned ? "برداشتن سنجاق" : "سنجاق"}
                >
                  {pendingKey === `pin:${n.id}`
                    ? <Loader2 size={14} className="trade-spin" />
                    : n.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                </button>
                <button type="button" className="trade-icon-btn danger" onClick={() => remove(n.id)} aria-label="حذف"><Trash2 size={14} /></button>
              </div>
            </div>
            {n.content && <p className="trade-note-body">{n.content.slice(0, 220)}{n.content.length > 220 ? "…" : ""}</p>}
            <div className="trade-note-foot">
              <span>{formatTradeDateTime(n.updatedAt, calSystem)}</span>
              {!!n.tags.length && (
                <span className="trade-tag-row">
                  {n.tags.map((t) => (
                    <span key={t.id} className="trade-tag-chip active" style={{ borderColor: t.color, color: t.color }}>{t.name}</span>
                  ))}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {(creating || editing) && (
        <NoteEditor
          note={editing}
          tags={tags}
          onTagCreated={(t) => setTags((p) => [...p, t])}
          onClose={() => { onCreatingChange(false); setEditing(null); }}
          onSaved={() => { onCreatingChange(false); setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function NoteEditor({
  note, tags, onTagCreated, onClose, onSaved,
}: {
  note: Note | null;
  tags: TradeTag[];
  onTagCreated: (t: TradeTag) => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(note?.title || "");
  const [content, setContent] = useState(note?.content || "");
  const [color, setColor] = useState(note?.color || TAG_COLORS[9]);
  const [tagIds, setTagIds] = useState<string[]>(note?.tags.map((t) => t.id) || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (saving) return;
    if (!title.trim()) { setError("عنوان یادداشت را وارد کن"); return; }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/trade/notes", {
      method: note ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: note?.id, title: title.trim(), content, color,
        pinned: note?.pinned ?? false, tagIds,
      }),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) { setError(data?.error || "خطا در ذخیره یادداشت"); return; }
    onSaved();
  }

  return (
    <>
      <LockBodyScroll />
      <div className="modal-overlay open" onClick={onClose} />
      <div className="modal-panel open" role="dialog" aria-modal="true">
        <div className="modal-head">
          <div className="modal-title">{note ? "ویرایش یادداشت" : "یادداشت جدید"}</div>
          <button type="button" className="trade-icon-btn" onClick={onClose} aria-label="بستن"><X size={16} /></button>
        </div>

        <label className="exercise-form-label">عنوان</label>
        <input className="wsearch-newform-name trade-glass-field" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />

        <label className="exercise-form-label">متن</label>
        <textarea className="wsearch-newform-name trade-glass-field" rows={8} value={content} onChange={(e) => setContent(e.target.value)} maxLength={20000} />

        <label className="exercise-form-label">رنگ</label>
        <div className="trade-color-row">
          {TAG_COLORS.map((c) => (
            <button key={c} type="button" className={`trade-color-dot${c === color ? " active" : ""}`} style={{ background: c }} onClick={() => setColor(c)} aria-label={c} />
          ))}
        </div>

        <label className="exercise-form-label">برچسب‌ها</label>
        <TradeTagField tags={tags} value={tagIds} onChange={setTagIds} onCreated={onTagCreated} />

        {error && <div className="trade-form-error">{error}</div>}

        <div className="trade-modal-actions">
          <button type="button" className="account-outline-btn" onClick={onClose}>لغو</button>
          <button type="button" className="trade-primary-btn" onClick={save} disabled={saving}>
            {saving ? <Loader2 size={15} className="trade-spin" /> : "ذخیره"}
          </button>
        </div>
      </div>
    </>
  );
}
