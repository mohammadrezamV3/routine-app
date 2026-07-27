"use client";

import { useEffect, useState } from "react";

type Idea = {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
};

export function IdeasPanel() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  async function loadIdeas() {
    setLoading(true);
    const res = await fetch("/api/ideas");
    const data = await res.json();
    setIdeas(data.ideas || []);
    setLoading(false);
  }

  useEffect(() => { loadIdeas(); }, []);

  async function addIdea() {
    if (!title.trim()) return;
    setSaving(true);
    const res = await fetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: description || undefined }),
    });
    setSaving(false);
    if (res.ok) {
      setTitle("");
      setDescription("");
      loadIdeas();
    }
  }

  function startEdit(idea: Idea) {
    setEditingId(idea.id);
    setEditTitle(idea.title);
    setEditDescription(idea.description || "");
  }

  async function saveEdit(id: string) {
    if (!editTitle.trim()) return;
    const res = await fetch(`/api/ideas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle, description: editDescription }),
    });
    if (res.ok) {
      setEditingId(null);
      loadIdeas();
    }
  }

  async function removeIdea(id: string) {
    setIdeas((list) => list.filter((i) => i.id !== id));
    await fetch(`/api/ideas/${id}`, { method: "DELETE" });
  }

  return (
    <div style={{ marginTop: 10 }}>
      <div className="tm-extra" style={{ marginTop: 0 }}>
        <div className="domain-sub">ثبت ایده جدید</div>
        <input
          className="wsearch-newform-name"
          placeholder="عنوان ایده"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="wsearch-newform-name"
          style={{ marginTop: 8, minHeight: 70, resize: "vertical", fontFamily: "inherit", display: "block", width: "100%" }}
          placeholder="توضیح (اختیاری)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button
          onClick={addIdea}
          disabled={saving || !title.trim()}
          style={{ marginTop: 10, borderColor: "var(--accent)", color: "var(--accent)" }}
        >
          {saving ? "در حال ثبت…" : "ثبت ایده"}
        </button>
      </div>

      <div className="rm-grid" style={{ marginTop: 20 }}>
        {loading && <div className="item-line">در حال بارگذاری…</div>}
        {!loading && !ideas.length && <div className="item-line empty">هنوز ایده‌ای ثبت نشده</div>}

        {ideas.map((idea) => (
          <div
            key={idea.id}
            className="rm-box"
            style={{ cursor: "default", flexDirection: "column", alignItems: "stretch", justifyContent: "flex-start", gap: 8 }}
          >
            {editingId === idea.id ? (
              <>
                <input
                  className="wsearch-newform-name"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
                <textarea
                  className="wsearch-newform-name"
                  style={{ minHeight: 70, resize: "vertical", fontFamily: "inherit", display: "block", width: "100%" }}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button className="small" onClick={() => setEditingId(null)}>لغو</button>
                  <button className="small" onClick={() => saveEdit(idea.id)} style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>ذخیره</button>
                </div>
              </>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div>
                  <div className="rm-box-title">{idea.title}</div>
                  {idea.description && (
                    <div className="rm-box-desc" style={{ whiteSpace: "pre-wrap" }}>{idea.description}</div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button className="small" onClick={() => startEdit(idea)}>ویرایش</button>
                  <button className="small" onClick={() => removeIdea(idea.id)} style={{ borderColor: "#E05252", color: "#E05252" }}>×</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
