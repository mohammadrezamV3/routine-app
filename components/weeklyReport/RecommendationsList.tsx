"use client";

import { useState } from "react";
import { Target, Check, X, Pencil } from "lucide-react";

type Recommendation = { title: string; description: string; priority: string; domain: string | null };

const PRIORITY_LABEL: Record<string, string> = { high: "اولویت بالا", medium: "اولویت متوسط", low: "اولویت کم" };

function RecCard({
  rec, weekStart, onAccepted,
}: { rec: Recommendation; weekStart: string; onAccepted: (index: number) => void; index?: number }) {
  const [state, setState] = useState<"idle" | "editing" | "accepted" | "rejected">("idle");
  const [title, setTitle] = useState(rec.title);
  const [description, setDescription] = useState(rec.description);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept(edited: boolean) {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/weekly/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart, domain: rec.domain, title, description, wasEdited: edited }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "خطایی پیش اومد"); return; }
      setState("accepted");
    } catch {
      setError("مشکلی در اتصال به سرور پیش اومد");
    } finally {
      setSaving(false);
    }
  }

  if (state === "rejected") return null;

  return (
    <div className="wr-rec-card">
      <div className="wr-rec-head">
        <span className="wr-rec-title">{state === "editing" ? "ویرایش هدف" : title}</span>
        <span className={`wr-rec-priority ${rec.priority}`}>{PRIORITY_LABEL[rec.priority] || rec.priority}</span>
      </div>

      {state === "editing" ? (
        <div className="wr-rec-edit">
          <input className="wsearch-newform-name" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="wsearch-newform-name" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} style={{ marginTop: 6 }} />
        </div>
      ) : (
        <div className="wr-rec-desc">{description}</div>
      )}

      {error && <div className="field-error-msg" style={{ display: "block", marginTop: 6 }}>{error}</div>}

      {state === "accepted" ? (
        <div className="wr-rec-accepted"><Check size={13} /> به‌عنوان هدف این هفته ثبت شد</div>
      ) : (
        <div className="wr-rec-actions">
          {state === "editing" ? (
            <button type="button" className="wr-rec-action-btn primary" onClick={() => accept(true)} disabled={saving || !title.trim() || !description.trim()}>
              {saving ? "در حال ثبت…" : "ثبت نسخه‌ی ویرایش‌شده"}
            </button>
          ) : (
            <>
              <button type="button" className="wr-rec-action-btn primary" onClick={() => accept(false)} disabled={saving}><Check size={13} /> قبول</button>
              <button type="button" className="wr-rec-action-btn" onClick={() => setState("editing")} disabled={saving}><Pencil size={13} /> ویرایش</button>
              <button type="button" className="wr-rec-action-btn muted" onClick={() => setState("rejected")} disabled={saving}><X size={13} /> رد</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// پیشنهادهای AI برای هفته‌ی بعد — فقط با کلیک قبول/ویرایش هدف ثبت می‌شه
// (بند ۳۶: AI مستقیم هدف فعال نمی‌کنه).
export function RecommendationsList({ items, weekStart }: { items: Recommendation[] | null; weekStart: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="wr-block">
      <div className="wr-block-title"><Target size={15} /> تمرکز هفته‌ی آینده</div>
      <div className="wr-rec-list">
        {items.map((r, i) => <RecCard key={i} rec={r} weekStart={weekStart} onAccepted={() => {}} />)}
      </div>
    </div>
  );
}
