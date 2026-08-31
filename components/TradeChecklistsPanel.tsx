"use client";

import { useCallback, useEffect, useState } from "react";
import { Reorder, motion } from "framer-motion";
import { Copy, GripVertical, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { faNum } from "@/lib/jalali";
import { getSetting } from "@/lib/storage";
import { PanelSkeleton } from "./PanelSkeleton";
import { takePreloaded } from "@/lib/preload";
import { useAsyncAction } from "@/lib/useAsyncAction";
import { LockBodyScroll } from "./LockBodyScroll";
import { TradeFormModal } from "./TradeFormModal";
import {
  CAL_SYSTEM_KEY, CalSystem, MAX_CHECKLISTS, MAX_CHECKLIST_ITEMS, TAG_COLORS,
  TradeAccount, TradeTag,
} from "@/lib/tradeTypes";

type Item = { id: string; text: string; order: number };
type Checklist = { id: string; name: string; color: string; required: boolean; archived: boolean; order: number; items: Item[] };

// مدیریتِ چک‌لیست‌ها. دکمه‌ی «معامله» داخلِ هر چک‌لیست همان فرمِ ثبتِ معامله
// را باز می‌کند با همان چک‌لیست از قبل انتخاب‌شده — مسیرِ
// «چک‌لیست → تصمیم → معامله»ی اسپک. تکمیل‌نبودنِ چک‌لیست هیچ‌وقت این دکمه را
// غیرفعال نمی‌کند.
export function TradeChecklistsPanel() {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [accounts, setAccounts] = useState<TradeAccount[]>([]);
  const [tags, setTags] = useState<TradeTag[]>([]);
  const [calSystem, setCalSystem] = useState<CalSystem>("jalali");
  const [loading, setLoading] = useState(true);
  const [checkedState, setCheckedState] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Checklist | null>(null);
  const [creating, setCreating] = useState(false);
  const [tradeFor, setTradeFor] = useState<{ checklistId: string; account: TradeAccount } | null>(null);
  const [pickAccountFor, setPickAccountFor] = useState<string | null>(null);
  const { pendingKey, error: actionError, run } = useAsyncAction();

  // silent = تازه‌سازی بدونِ نشان‌دادنِ اسکلت (بعد از کپی/حذف)
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [cRes, aRes, tRes] = await Promise.all([
        takePreloaded("/api/trade/checklists") ?? fetch("/api/trade/checklists").then((r) => (r.ok ? r.json() : null)),
        takePreloaded("/api/trade/accounts?archived=0") ?? fetch("/api/trade/accounts?archived=0").then((r) => (r.ok ? r.json() : null)),
        takePreloaded("/api/trade/tags") ?? fetch("/api/trade/tags").then((r) => (r.ok ? r.json() : null)),
      ]);
      setChecklists(cRes?.checklists || []);
      setAccounts(aRes?.accounts || []);
      setTags(tRes?.tags || []);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); getSetting<CalSystem>(CAL_SYSTEM_KEY, "jalali").then(setCalSystem); }, [load]);

  async function duplicate(c: Checklist) {
    const ok = await run(`dup:${c.id}`, () =>
      fetch("/api/trade/checklists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duplicateOf: c.id }),
      })
    );
    if (ok) load(true);
  }

  async function remove(id: string) {
    // حذف خوش‌بینانه است (فوراً از لیست می‌رود)، ولی اگر سرور رد کند لیست
    // برمی‌گردد و پیام دیده می‌شود — نه اینکه بی‌صدا دوباره ظاهر شود.
    setChecklists((prev) => prev.filter((c) => c.id !== id));
    const ok = await run(`del:${id}`, () => fetch(`/api/trade/checklists?id=${id}`, { method: "DELETE" }));
    load(true);
    if (!ok) return;
  }

  function startTrade(checklistId: string) {
    const active = accounts.filter((a) => !a.archived);
    if (active.length === 1) { setTradeFor({ checklistId, account: active[0] }); return; }
    setPickAccountFor(checklistId);
  }

  if (loading) return <PanelSkeleton />;

  const activeCount = checklists.filter((c) => !c.archived).length;

  return (
    <div>
      {actionError && <div className="trade-form-error">{actionError}</div>}

      {!checklists.length && <div className="item-line empty">هنوز چک‌لیستی نساختی</div>}

      <div className="trade-checklist-grid">
        {checklists.map((c, idx) => {
          const done = c.items.filter((i) => checkedState[i.id]).length;
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: idx * 0.045, ease: [0.22, 1, 0.36, 1] }}
              className="trade-surface trade-checklist-card"
            >
              <span className="trade-account-stripe" style={{ background: c.color }} />

              <div className="trade-checklist-card-head">
                <div className="trade-account-title-row">
                  <span className="trade-account-name">{c.name}</span>
                  {c.required && <span className="trade-account-type">الزامی</span>}
                </div>
                <div className="trade-account-actions">
                  <button type="button" className="trade-icon-btn" onClick={() => setEditing(c)} aria-label="ویرایش"><Pencil size={15} /></button>
                  <button
                    type="button"
                    className="trade-icon-btn"
                    onClick={() => duplicate(c)}
                    disabled={pendingKey === `dup:${c.id}`}
                    aria-label="کپی"
                  >
                    {pendingKey === `dup:${c.id}` ? <Loader2 size={15} className="trade-spin" /> : <Copy size={15} />}
                  </button>
                  <button type="button" className="trade-icon-btn danger" onClick={() => remove(c.id)} aria-label="حذف"><Trash2 size={15} /></button>
                </div>
              </div>

              <div className="trade-checklist-items">
                {c.items.map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    className={`trade-check-row${checkedState[i.id] ? " done" : ""}`}
                    onClick={() => setCheckedState((s) => ({ ...s, [i.id]: !s[i.id] }))}
                  >
                    <span className="trade-check-box" />
                    <span>{i.text}</span>
                  </button>
                ))}
                {!c.items.length && <div className="item-line empty">این چک‌لیست هنوز آیتمی ندارد</div>}
              </div>

              <div className="trade-checklist-card-foot">
                <span className="mono">{faNum(done)} / {faNum(c.items.length)}</span>
                <button type="button" className="trade-primary-btn" onClick={() => startTrade(c.id)} disabled={!accounts.filter((a) => !a.archived).length}>
                  معامله
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {activeCount < MAX_CHECKLISTS && (
        <button type="button" className="trade-add-account-btn" onClick={() => setCreating(true)}>
          <Plus size={18} /> چک‌لیست جدید
        </button>
      )}

      {(creating || editing) && (
        <ChecklistEditor
          checklist={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); load(); }}
        />
      )}

      {pickAccountFor && (
        <>
          <div className="modal-overlay open" onClick={() => setPickAccountFor(null)} />
          <div className="modal-panel open" role="dialog" aria-modal="true">
            <div className="modal-head"><div className="modal-title">معامله در کدام حساب؟</div></div>
            {!accounts.filter((a) => !a.archived).length && <div className="item-line empty">اول باید یک حساب بسازی</div>}
            <div className="trade-account-picker">
              {accounts.filter((a) => !a.archived).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="trade-account-pick"
                  onClick={() => { setTradeFor({ checklistId: pickAccountFor, account: a }); setPickAccountFor(null); }}
                >
                  <span className="trade-tag-dot" style={{ background: a.color }} />
                  {a.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {tradeFor && (
        <TradeFormModal
          account={tradeFor.account}
          entry={null}
          tags={tags}
          calSystem={calSystem}
          presetChecklistId={tradeFor.checklistId}
          onTagCreated={(t) => setTags((p) => [...p, t])}
          onClose={() => setTradeFor(null)}
          onSaved={() => setTradeFor(null)}
        />
      )}
    </div>
  );
}

// ویرایشگرِ چک‌لیست — آیتم‌ها با درگِ واقعی جابه‌جا می‌شوند (نه دکمه‌ی
// بالا/پایین) و کلِ لیست یکجا ذخیره می‌شود.
function ChecklistEditor({
  checklist,
  onClose,
  onSaved,
}: {
  checklist: Checklist | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(checklist?.name || "");
  const [color, setColor] = useState(checklist?.color || TAG_COLORS[3]);
  const [required, setRequired] = useState(checklist?.required || false);
  const [items, setItems] = useState<{ key: string; text: string }[]>(
    checklist?.items.map((i) => ({ key: i.id, text: i.text })) || []
  );
  const [newText, setNewText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addItem() {
    const t = newText.trim();
    if (!t || items.length >= MAX_CHECKLIST_ITEMS) return;
    setItems((prev) => [...prev, { key: `new-${Date.now()}-${prev.length}`, text: t }]);
    setNewText("");
  }

  async function save() {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    const body = {
      id: checklist?.id,
      name: name.trim(),
      color,
      required,
      items: items.map((i) => i.text),
    };
    const res = await fetch("/api/trade/checklists", {
      method: checklist ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) { setError(data?.error || "خطا در ذخیره چک‌لیست"); return; }
    onSaved();
  }

  return (
    <>
      <LockBodyScroll />
      <div className="modal-overlay open" onClick={onClose} />
      <div className="modal-panel open" role="dialog" aria-modal="true">
        <div className="modal-head">
          <div className="modal-title">{checklist ? "ویرایش چک‌لیست" : "چک‌لیست جدید"}</div>
          <button type="button" className="trade-icon-btn" onClick={onClose} aria-label="بستن"><X size={16} /></button>
        </div>

        <label className="exercise-form-label">نام چک‌لیست</label>
        <input className="wsearch-newform-name trade-glass-field" autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="مثلاً London Breakout" />

        <label className="exercise-form-label">رنگ</label>
        <div className="trade-color-row">
          {TAG_COLORS.map((c) => (
            <button key={c} type="button" className={`trade-color-dot${c === color ? " active" : ""}`} style={{ background: c }} onClick={() => setColor(c)} aria-label={c} />
          ))}
        </div>

        <label className="exercise-form-label">الزام تکمیل برای ورود طبق پلن</label>
        <button type="button" className={`trade-toggle${required ? " on" : ""}`} onClick={() => setRequired((v) => !v)}>
          <span className="trade-toggle-knob" />
          <span className="trade-toggle-label">
            {required ? "تکمیل‌نکردنش فقط هشدار می‌دهد — جلوی ثبت معامله را نمی‌گیرد" : "بدون الزام"}
          </span>
        </button>

        <label className="exercise-form-label">موارد ({faNum(items.length)}/{faNum(MAX_CHECKLIST_ITEMS)})</label>
        <Reorder.Group axis="y" values={items} onReorder={setItems} className="trade-checklist-edit-list">
          {items.map((it) => (
            <Reorder.Item key={it.key} value={it} className="trade-checklist-edit-row">
              <GripVertical size={15} className="trade-grip" />
              <input className="wsearch-newform-name trade-glass-field"
                value={it.text}
                onChange={(e) => setItems((prev) => prev.map((p) => (p.key === it.key ? { ...p, text: e.target.value } : p)))}
                maxLength={200}
              />
              <button type="button" className="trade-icon-btn danger" onClick={() => setItems((prev) => prev.filter((p) => p.key !== it.key))} aria-label="حذف">
                <Trash2 size={14} />
              </button>
            </Reorder.Item>
          ))}
        </Reorder.Group>

        {items.length < MAX_CHECKLIST_ITEMS && (
          <div className="trade-checklist-add-row">
            <input className="wsearch-newform-name trade-glass-field"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem()}
              maxLength={200}
              placeholder="مورد جدید..."
            />
            <button type="button" className="trade-icon-btn" onClick={addItem} aria-label="افزودن"><Plus size={16} /></button>
          </div>
        )}

        {error && <div className="trade-form-error">{error}</div>}

        <div className="trade-modal-actions">
          <button type="button" className="account-outline-btn" onClick={onClose}>لغو</button>
          <button type="button" className="trade-primary-btn" onClick={save} disabled={!name.trim() || saving}>
            {saving ? "..." : "ذخیره"}
          </button>
        </div>
      </div>
    </>
  );
}
