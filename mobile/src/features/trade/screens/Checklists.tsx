import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import BottomSheet from "@/components/BottomSheet";
import { db, baseRow, touch, type TradeChecklistRow, type TradeChecklistItemRow } from "../db";
import { newId, nowIso } from "../lib/id";
import { useLiveQuery } from "../lib/useLiveQuery";
import { MIN_CHECKLIST_ITEMS } from "../lib/types";
import { tapHaptic } from "@/lib/haptics";

export default function Checklists() {
  const [editing, setEditing] = useState<TradeChecklistRow | "new" | null>(null);

  const checklists =
    useLiveQuery(
      () => db.checklists.toArray().then((rows) => rows.filter((c) => !c.deletedAt && !c.archived).sort((a, b) => a.order - b.order)),
      [],
      [],
    ) ?? [];

  const itemCounts =
    useLiveQuery(
      () =>
        db.checklistItems
          .toArray()
          .then((rows) => rows.filter((i) => !i.deletedAt))
          .then((rows) => {
            const map: Record<string, number> = {};
            for (const r of rows) map[r.checklistId] = (map[r.checklistId] || 0) + 1;
            return map;
          }),
      [],
      {},
    ) ?? {};

  async function archiveChecklist(c: TradeChecklistRow) {
    await db.checklists.put(touch({ ...c, archived: true }));
    await tapHaptic();
  }

  return (
    <div>
      <AppHeader
        title="چک‌لیست‌ها"
        showBack
        right={
          <button
            onClick={() => setEditing("new")}
            className="flex items-center justify-center rounded-full"
            style={{ width: 40, height: 40, background: "var(--accent-dim)" }}
            aria-label="چک‌لیست جدید"
          >
            <Plus size={18} color="var(--accent)" />
          </button>
        }
      />
      <div className="flex flex-col gap-2.5 px-4 py-4">
        {checklists.length === 0 && (
          <div className="rounded-card border px-4 py-8 text-center font-vazir text-[13px]" style={{ borderColor: "var(--surface-line)", color: "var(--muted)" }}>
            هنوز چک‌لیستی نساخته‌ای.
          </div>
        )}
        {checklists.map((c) => (
          <button
            key={c.id}
            onClick={() => setEditing(c)}
            className="flex w-full items-center gap-3 rounded-card border px-4 py-3.5 text-start"
            style={{ borderColor: "var(--surface-line)", background: "var(--surface-1)" }}
          >
            <span className="rounded-full" style={{ width: 10, height: 10, background: c.color }} />
            <div className="flex flex-1 flex-col">
              <span className="font-vazir text-[14px] font-semibold" style={{ color: "var(--text)" }}>
                {c.name}
              </span>
              <span className="font-vazir text-[11.5px]" style={{ color: "var(--muted)" }}>
                {itemCounts[c.id] || 0} مورد{c.required ? " · الزامی" : ""}
              </span>
            </div>
            <span
              onClick={(e) => {
                e.stopPropagation();
                void archiveChecklist(c);
              }}
              className="flex items-center justify-center rounded-full"
              style={{ width: 36, height: 36 }}
            >
              <Trash2 size={16} color="var(--muted)" />
            </span>
          </button>
        ))}
      </div>

      <ChecklistEditorSheet checklist={editing === "new" ? null : editing} open={editing !== null} onClose={() => setEditing(null)} />
    </div>
  );
}

function ChecklistEditorSheet({ checklist, open, onClose }: { checklist: TradeChecklistRow | null; open: boolean; onClose: () => void }) {
  const items =
    useLiveQuery(
      () =>
        checklist
          ? db.checklistItems
              .where("checklistId")
              .equals(checklist.id)
              .toArray()
              .then((rows) => rows.filter((r) => !r.deletedAt).sort((a, b) => a.order - b.order))
          : Promise.resolve([] as TradeChecklistItemRow[]),
      [checklist?.id],
      [],
    ) ?? [];

  const [name, setName] = useState(checklist?.name ?? "");
  const [required, setRequired] = useState(checklist?.required ?? false);
  const [draftItems, setDraftItems] = useState<{ id: string; text: string }[]>(
    items.length ? items.map((i) => ({ id: i.id, text: i.text })) : [{ id: newId(), text: "" }, { id: newId(), text: "" }],
  );

  // بازسازیِ حالت محلی هر بار که چک‌لیست انتخابی عوض می‌شود (باز شدن دوباره‌ی شیت)
  const key = checklist?.id ?? "new";
  const [lastKey, setLastKey] = useState(key);
  if (lastKey !== key) {
    setLastKey(key);
    setName(checklist?.name ?? "");
    setRequired(checklist?.required ?? false);
    setDraftItems(items.length ? items.map((i) => ({ id: i.id, text: i.text })) : [{ id: newId(), text: "" }, { id: newId(), text: "" }]);
  }

  function updateItemText(id: string, text: string) {
    setDraftItems((list) => list.map((i) => (i.id === id ? { ...i, text } : i)));
  }
  function addItem() {
    setDraftItems((list) => [...list, { id: newId(), text: "" }]);
  }
  function removeItem(id: string) {
    setDraftItems((list) => (list.length <= MIN_CHECKLIST_ITEMS ? list : list.filter((i) => i.id !== id)));
  }

  async function handleSave() {
    if (!name.trim()) return;
    const nonEmpty = draftItems.filter((i) => i.text.trim());
    if (nonEmpty.length < MIN_CHECKLIST_ITEMS) return;

    const row: TradeChecklistRow = {
      ...(checklist ? touch(checklist) : (baseRow() as any)),
      name: name.trim(),
      color: checklist?.color ?? "#3E7BFA",
      required,
      archived: checklist?.archived ?? false,
      order: checklist?.order ?? 0,
      note: checklist?.note ?? null,
    };
    await db.checklists.put(row);

    // طبق رفتار وب: ویرایش تعریفِ چک‌لیست، همه‌ی آیتم‌ها را حذف/بازسازی می‌کند
    // (این عمدا تیک‌های «اجرای زنده‌»ی فعلی را هم پاک می‌کند).
    if (checklist) {
      const existingItems = await db.checklistItems.where("checklistId").equals(checklist.id).toArray();
      const ts = nowIso();
      for (const it of existingItems) {
        await db.checklistItems.put({ ...it, deletedAt: ts, updatedAt: ts, dirty: 1 });
      }
    }
    for (let i = 0; i < nonEmpty.length; i++) {
      const it = nonEmpty[i];
      const itemRow: TradeChecklistItemRow = {
        ...(baseRow() as any),
        id: it.id.startsWith("m") && it.id.length >= 25 ? it.id : newId(),
        checklistId: row.id,
        text: it.text.trim(),
        order: i,
        checked: false,
      };
      await db.checklistItems.put(itemRow);
    }
    await tapHaptic();
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={checklist ? "ویرایش چک‌لیست" : "چک‌لیست جدید"}>
      <div className="flex flex-col gap-3 pt-1">
        <label className="flex flex-col gap-1">
          <span className="font-vazir text-[12px]" style={{ color: "var(--muted)" }}>
            نام چک‌لیست
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border px-3 font-vazir text-[14px]"
            style={{ height: 44, borderColor: "var(--surface-line)", background: "var(--input-bg)", color: "var(--text)" }}
          />
        </label>

        <button
          onClick={() => setRequired((v) => !v)}
          className="flex items-center gap-2 self-start rounded-full px-3 py-1.5 font-vazir text-[12.5px]"
          style={{ background: required ? "var(--accent-dim)" : "var(--surface-2)", color: required ? "var(--accent)" : "var(--muted)" }}
        >
          {required ? "الزامی است" : "الزامی نیست"}
        </button>

        <div className="flex flex-col gap-2">
          <span className="font-vazir text-[12px]" style={{ color: "var(--muted)" }}>
            آیتم‌ها (حداقل {MIN_CHECKLIST_ITEMS} مورد)
          </span>
          {draftItems.map((it, i) => (
            <div key={it.id} className="flex items-center gap-2">
              <input
                value={it.text}
                onChange={(e) => updateItemText(it.id, e.target.value)}
                placeholder={`آیتم ${i + 1}`}
                className="flex-1 rounded-lg border px-3 font-vazir text-[14px]"
                style={{ height: 44, borderColor: "var(--surface-line)", background: "var(--input-bg)", color: "var(--text)" }}
              />
              <button
                onClick={() => removeItem(it.id)}
                disabled={draftItems.length <= MIN_CHECKLIST_ITEMS}
                className="flex items-center justify-center rounded-full"
                style={{ width: 40, height: 40, background: "var(--surface-2)", opacity: draftItems.length <= MIN_CHECKLIST_ITEMS ? 0.4 : 1 }}
              >
                <X size={16} color="var(--muted)" />
              </button>
            </div>
          ))}
          <button
            onClick={addItem}
            className="flex items-center justify-center gap-1.5 rounded-lg py-2.5 font-vazir text-[13px]"
            style={{ background: "var(--surface-2)", color: "var(--text)" }}
          >
            <Plus size={15} /> افزودن آیتم
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={!name.trim() || draftItems.filter((i) => i.text.trim()).length < MIN_CHECKLIST_ITEMS}
          className="mt-1 rounded-lg py-3.5 font-vazir text-[14.5px] font-semibold"
          style={{ background: "var(--accent)", color: "#04140d", minHeight: 48 }}
        >
          ذخیره‌ی چک‌لیست
        </button>
      </div>
    </BottomSheet>
  );
}
