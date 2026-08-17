"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, BellOff, Check, ListChecks, Plus, Type, X } from "lucide-react";
import { ChecklistItem, NoteItem, createNote, updateNote } from "@/lib/notes";
import { formatJalali, jalaliToGregorianApprox, toJalali, JalaliDate } from "@/lib/jalali";
import { JalaliDatePicker } from "./JalaliDatePicker";
import { TimeInput } from "./TimeInput";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";

const now = new Date();
const jNow = toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());

function makeChecklistItem(): ChecklistItem {
  return { id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, text: "", done: false };
}

// پاپ‌آپِ ساخت/ویرایشِ یادداشت — یادداشت یا متنِ ساده‌ست یا چک‌لیست (سوییچِ
// بالای فرم تعیین می‌کنه)، تگ‌های آزاد داره، و یک یادآوریِ اختیاری (تاریخِ
// جلالی + ساعت) که با سیستمِ نوتیفیکیشنِ مرورگرِ موجودِ اپ هماهنگه.
export function NoteEditorModal({
  note,
  onClose,
  onSaved,
}: {
  note?: NoteItem | null;
  onClose: () => void;
  onSaved: (note: NoteItem) => void;
}) {
  useLockBodyScroll();
  const isEdit = !!note;
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [isChecklist, setIsChecklist] = useState(!!note?.checklist);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(note?.checklist?.length ? note.checklist : [makeChecklistItem()]);
  const [tags, setTags] = useState<string[]>(note?.tags ?? []);
  const [tagInput, setTagInput] = useState("");

  const initialReminder = note?.reminderAt ? new Date(note.reminderAt) : null;
  const [hasReminder, setHasReminder] = useState(!!initialReminder);
  const [reminderJalali, setReminderJalali] = useState<JalaliDate | null>(
    initialReminder ? toJalali(initialReminder.getFullYear(), initialReminder.getMonth() + 1, initialReminder.getDate()) : null
  );
  const [reminderTime, setReminderTime] = useState(
    initialReminder ? `${String(initialReminder.getHours()).padStart(2, "0")}:${String(initialReminder.getMinutes()).padStart(2, "0")}` : "09:00"
  );
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function addTag() {
    const v = tagInput.trim();
    if (!v) return;
    if (tags.length >= 12) return;
    if (!tags.includes(v)) setTags((t) => [...t, v]);
    setTagInput("");
  }
  function removeTag(t: string) {
    setTags((arr) => arr.filter((x) => x !== t));
  }

  function updateChecklistItem(id: string, patch: Partial<ChecklistItem>) {
    setChecklist((items) => items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }
  function addChecklistItem() {
    if (checklist.length >= 60) return;
    setChecklist((items) => [...items, makeChecklistItem()]);
  }
  function removeChecklistItem(id: string) {
    setChecklist((items) => (items.length > 1 ? items.filter((it) => it.id !== id) : items));
  }

  async function save() {
    const t = title.trim();
    if (!t) { setError("عنوان لازمه"); return; }

    let reminderAt: string | null = null;
    if (hasReminder && reminderJalali) {
      const [h, m] = reminderTime.split(":").map(Number);
      const d = jalaliToGregorianApprox(reminderJalali[0], reminderJalali[1], reminderJalali[2]);
      d.setHours(h || 0, m || 0, 0, 0);
      reminderAt = d.toISOString();
    }

    const payload = {
      title: t,
      content: isChecklist ? "" : content,
      tags,
      checklist: isChecklist ? checklist.filter((it) => it.text.trim()) : null,
      reminderAt,
    };
    if (isChecklist && payload.checklist!.length === 0) { setError("حداقل یک آیتم برای چک‌لیست وارد کن"); return; }

    setError(null);
    setSaving(true);
    const res = isEdit ? await updateNote(note!.id, payload) : await createNote(payload);
    setSaving(false);
    if (res.error || !res.note) { setError(res.error || "خطایی پیش آمد"); return; }
    onSaved(res.note);
    onClose();
  }

  return (
    <>
      <div className="modal-overlay open" onClick={onClose} />
      <div className="modal-panel liquid-glass-panel dash-scope open">
        <div className="modal-head">
          <div className="modal-title">{isEdit ? "ویرایش یادداشت" : "یادداشت جدید"}</div>
          <button className="nav-close" onClick={onClose} aria-label="بستن">×</button>
        </div>
        <div className="modal-body">
          <input
            type="text"
            className="wsearch-newform-name calorie-glass-field w-full"
            placeholder="عنوان"
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />

          <div className="note-type-toggle">
            <button type="button" className={!isChecklist ? "on" : ""} onClick={() => setIsChecklist(false)}>
              <Type size={13} /> متن
            </button>
            <button type="button" className={isChecklist ? "on" : ""} onClick={() => setIsChecklist(true)}>
              <ListChecks size={13} /> چک‌لیست
            </button>
          </div>

          {!isChecklist ? (
            <textarea
              className="calorie-glass-field note-content-textarea mt-2.5"
              placeholder="متنِ یادداشت…"
              maxLength={20000}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          ) : (
            <div className="mt-2.5 flex flex-col gap-1.5">
              {checklist.map((item) => (
                <div key={item.id} className="note-checklist-row">
                  <button
                    type="button"
                    className={`note-checklist-check${item.done ? " done" : ""}`}
                    onClick={() => updateChecklistItem(item.id, { done: !item.done })}
                    aria-label={item.done ? "انجام‌نشده علامت بزن" : "انجام‌شده علامت بزن"}
                  >
                    {item.done && <Check size={11} strokeWidth={3} />}
                  </button>
                  <input
                    type="text"
                    className="note-checklist-input"
                    placeholder="آیتم چک‌لیست…"
                    maxLength={200}
                    value={item.text}
                    onChange={(e) => updateChecklistItem(item.id, { text: e.target.value })}
                  />
                  <button type="button" onClick={() => removeChecklistItem(item.id)} aria-label="حذفِ آیتم" className="note-checklist-remove">
                    <X size={13} />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addChecklistItem} className="flex items-center gap-1 self-start text-[11px] font-semibold text-dash-green transition hover:brightness-110">
                <Plus size={13} /> افزودن آیتم
              </button>
            </div>
          )}

          <div className="mt-3">
            <div className="note-tag-input-row">
              <input
                type="text"
                className="calorie-glass-field note-tag-input"
                placeholder="افزودنِ تگ…"
                maxLength={24}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              />
              <button type="button" onClick={addTag} className="note-tag-add-btn">
                <Plus size={14} />
              </button>
            </div>
            {tags.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span key={t} className="note-tag-pill">
                    {t}
                    <button type="button" onClick={() => removeTag(t)} aria-label="حذفِ تگ"><X size={11} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3">
            <button type="button" className="note-reminder-toggle" onClick={() => setHasReminder((v) => !v)}>
              {hasReminder ? <Bell size={14} /> : <BellOff size={14} />}
              یادآوری/الرت
              <span className={`note-reminder-switch${hasReminder ? " on" : ""}`} />
            </button>
            {hasReminder && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: "hidden" }}
              >
                <div className="mt-2 flex gap-2">
                  <button type="button" className={`jdate-btn${reminderJalali ? "" : " placeholder"}`} onClick={() => setDatePickerOpen(true)}>
                    {reminderJalali ? formatJalali(reminderJalali) : "انتخابِ تاریخ"}
                  </button>
                  <TimeInput value={reminderTime} onChange={setReminderTime} className="wsearch-newform-name calorie-glass-field" placeholder="ساعت" />
                </div>
              </motion.div>
            )}
          </div>

          {error && <div className="field-error-msg" style={{ display: "block", marginTop: 10 }}>{error}</div>}

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[13.5px] font-bold disabled:opacity-40"
            style={{ background: "var(--accent)", color: "var(--bg)", boxShadow: "0 8px 22px rgba(var(--accent-rgb),.3)" }}
          >
            {saving ? "در حال ثبت…" : isEdit ? "ثبتِ تغییرات" : "ثبتِ یادداشت"}
          </button>
        </div>
      </div>

      {datePickerOpen && (
        <JalaliDatePicker
          initial={reminderJalali || jNow}
          title="تاریخِ یادآوری"
          disablePast
          onPick={(d) => { setReminderJalali(d); setDatePickerOpen(false); }}
          onClose={() => setDatePickerOpen(false)}
        />
      )}
    </>
  );
}
