"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { faNum } from "@/lib/jalali";
import { PanelSkeleton } from "./PanelSkeleton";
import { ChecklistEditor } from "./ChecklistEditor";

type Item = { id: string; text: string; order: number; checked: boolean };
type Checklist = { id: string; name: string; color: string; required: boolean; archived: boolean; order: number; note: string | null; items: Item[] };

// صفحه‌ی اختصاصی یک چک‌لیست — دقیقا هم‌الگوی صفحه‌ی یک حساب: انتخاب از
// فهرست، نه پاپ‌آپ. این‌جا آیتم‌ها واقعا تیک می‌خورند. شروع معامله و اخبار
// پیش‌رو طبق درخواست صریح از این صفحه حذف شدند — این‌جا فقط چک‌لیست است.
export function TradeChecklistDetailView({ checklistId }: { checklistId: string }) {
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [checkedState, setCheckedState] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cRes = await fetch("/api/trade/checklists").then((r) => (r.ok ? r.json() : null));
      const found = (cRes?.checklists || []).find((c: Checklist) => c.id === checklistId) || null;
      if (!found) { setNotFound(true); return; }
      setChecklist(found);
      // تیک‌ها از سرور می‌آیند (persist شده‌اند)، نه از صفر — این دقیقاً
      // همان چیزی است که قبلاً نبود («چک‌لیستم ذخیره نمیشه»).
      setCheckedState(Object.fromEntries(found.items.map((i: Item) => [i.id, i.checked])));
    } finally {
      setLoading(false);
    }
  }, [checklistId]);

  useEffect(() => { load(); }, [load]);

  function toggleItem(itemId: string) {
    const next = !checkedState[itemId];
    setCheckedState((s) => ({ ...s, [itemId]: next }));
    fetch(`/api/trade/checklists/${checklistId}/items`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, checked: next }),
    }).catch(() => {});
  }

  if (loading) return <PanelSkeleton />;
  if (notFound || !checklist) return <div className="item-line empty">این چک‌لیست پیدا نشد.</div>;

  const done = checklist.items.filter((i) => checkedState[i.id]).length;

  return (
    <div>
      {/* طبقِ درخواستِ صریح: یک باکسِ واحد — نه هدر جدا از لیست. نام چک‌لیست
          و ویرایش هم‌ردیف بالای باکس، لیست زیرش. */}
      <div className="trade-surface trade-page-box trade-checklist-detail-box">
        <div className="trade-checklist-detail-head">
          <span className="trade-account-stripe" style={{ background: checklist.color }} />
          <div className="trade-checklist-detail-title">
            <h1 style={{ margin: 0 }}>{checklist.name}</h1>
            {checklist.required && <span className="trade-account-type">الزامی</span>}
          </div>
          <button type="button" className="trade-title-add-btn" onClick={() => setEditing(true)}>
            <Pencil size={13} /> ویرایش
          </button>
        </div>

        <div className="trade-checklist-items">
          {checklist.items.map((i) => (
            <button
              key={i.id}
              type="button"
              className={`trade-check-row${checkedState[i.id] ? " done" : ""}`}
              onClick={() => toggleItem(i.id)}
            >
              <span className="trade-check-box" />
              <span>{i.text}</span>
            </button>
          ))}
          {!checklist.items.length && <div className="item-line empty">این چک‌لیست هنوز آیتمی ندارد</div>}
        </div>

        <div className="trade-checklist-card-foot" style={{ marginTop: 14 }}>
          <span className="mono">{faNum(done)} / {faNum(checklist.items.length)}</span>
        </div>
      </div>

      {editing && (
        <ChecklistEditor
          checklist={checklist}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); load(); }}
        />
      )}
    </div>
  );
}
