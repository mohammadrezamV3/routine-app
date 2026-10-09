"use client";

import { CSSProperties, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, X } from "lucide-react";
import { LockBodyScroll } from "./LockBodyScroll";
import { TAG_COLORS, TradeTag } from "@/lib/tradeTypes";
import { Spinner } from "./Spinner";
import { tr } from "@/lib/i18n";

// انتخاب برچسب + ساخت برچسب جدید در همان لحظه.
// برچسب‌ها بین حساب و معامله مشترک‌اند، پس این کامپوننت هر دو جا استفاده
// می‌شود و لیست برچسب‌ها را از والد می‌گیرد (نه اینکه خودش دوباره فچ کند).
export function TradeTagField({
  tags,
  value,
  onChange,
  onCreated,
}: {
  tags: TradeTag[];
  value: string[];
  onChange: (ids: string[]) => void;
  onCreated: (tag: TradeTag) => void;
}) {
  const [creating, setCreating] = useState(false);

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  return (
    <>
      <div className="trade-tag-row">
        {tags.map((t) => {
          const active = value.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              className={`trade-tag-chip${active ? " active" : ""}`}
              style={active ? ({ "--tag-c": t.color } as CSSProperties) : undefined}
              onClick={() => toggle(t.id)}
            >
              {/* توپ برچسب سمت چپ نامش (در RTL یعنی بعد از متن) */}
              {t.name}
              <span className="trade-tag-dot" style={{ background: t.color }} />
            </button>
          );
        })}
        <button type="button" className="trade-tag-chip trade-tag-add" onClick={() => setCreating(true)}>
          <Plus size={13} /> {tr("افزودن برچسب", "Add tag")}
        </button>
      </div>

      {creating && (
        <TradeTagCreateModal
          onClose={() => setCreating(false)}
          onCreated={(tag) => {
            onCreated(tag);
            onChange([...value, tag.id]);
            setCreating(false);
          }}
        />
      )}
    </>
  );
}

export function TradeTagCreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (tag: TradeTag) => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(TAG_COLORS[TAG_COLORS.length - 1]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/trade/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, color }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError(data?.error || tr("خطا در ساخت برچسب", "Could not create the tag")); return; }
      onCreated(data.tag);
    } catch {
      setError(tr("ارتباط با سرور برقرار نشد — دوباره تلاش کن", "Could not reach the server. Try again"));
    } finally {
      setSaving(false);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <LockBodyScroll />
      <div className="modal-overlay open" onClick={onClose} />
      <div className="modal-panel open" role="dialog" aria-modal="true">
        <div className="modal-head">
          <div className="modal-title">{tr("ایجاد برچسب", "Create tag")}</div>
          <button type="button" className="trade-icon-btn" onClick={onClose} aria-label={tr("بستن", "Close")}><X size={16} /></button>
        </div>

        <label className="exercise-form-label">{tr("نام برچسب", "Tag name")}</label>
        <input className="wsearch-newform-name trade-glass-field"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          maxLength={30}
          placeholder={tr("مثلا بریک‌اوت", "e.g. Breakout")}
        />

        <label className="exercise-form-label">{tr("رنگ برچسب", "Tag color")}</label>
        <div className="trade-color-row">
          {TAG_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`trade-color-dot${c === color ? " active" : ""}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={c}
            />
          ))}
        </div>

        {error && <div className="trade-form-error" style={{ marginTop: 10 }}>{error}</div>}

        <div className="trade-modal-actions">
          <button type="button" className="account-outline-btn" onClick={onClose}>{tr("لغو", "Cancel")}</button>
          <button type="button" className="trade-primary-btn" onClick={save} disabled={!name.trim() || saving}>
            {saving ? <Spinner size={14} /> : tr("ایجاد", "Create")}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
