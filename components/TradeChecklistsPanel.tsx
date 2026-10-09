"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ClipboardList, Copy, Pencil, Trash2 } from "lucide-react";
import { faNum } from "@/lib/jalali";
import { PanelSkeleton } from "./PanelSkeleton";
import { takePreloaded } from "@/lib/preload";
import { useAsyncAction } from "@/lib/useAsyncAction";
import { TradeKebabMenu } from "./TradeKebabMenu";
import { ChecklistEditor } from "./ChecklistEditor";
import { useLiveRefresh } from "@/lib/liveSync";
import { tr } from "@/lib/i18n";

type Item = { id: string; text: string; order: number };
type Checklist = { id: string; name: string; color: string; required: boolean; archived: boolean; order: number; note: string | null; items: Item[] };

// مثل حساب‌ها: فهرست فشرده‌ی چک‌لیست‌ها، نه کارت‌های باز همیشه‌گسترده.
// انتخاب یک چک‌لیست به صفحه‌ی اختصاصی‌اش می‌رود (/trade/checklists/[id]) —
// آنجاست که آیتم‌ها تیک می‌خورند و معامله شروع می‌شود، نه این‌جا.
export function TradeChecklistsPanel({
  creating,
  onCreatingChange,
}: {
  creating: boolean;
  onCreatingChange: (v: boolean) => void;
}) {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Checklist | null>(null);
  const { pendingKey, error: actionError, run } = useAsyncAction();

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // پرانتز لازم است: بدون آن `takePreloaded(...) ?? await fetch(...)` یعنی
      // اگر پیش‌درخواستی وجود داشت، خود Promise (نه مقدار resolve شده) توی
      // cRes می‌نشست و `cRes?.checklists` همیشه undefined می‌شد — یعنی لیست
      // با وجود داشتن داده، خالی نشان داده می‌شد.
      const cRes = await (takePreloaded("/api/trade/checklists") ?? fetch("/api/trade/checklists").then((r) => (r.ok ? r.json() : null)));
      setChecklists(cRes?.checklists || []);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  // زنده: ثبت/ویرایش/حذف از هرجا (مودال، تب دیگه، همگام‌سازی متاتریدر) → آمار همون لحظه
  useLiveRefresh("trade", () => { load(true); });

  async function duplicate(id: string) {
    const ok = await run(`dup:${id}`, () =>
      fetch("/api/trade/checklists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duplicateOf: id }),
      })
    );
    if (ok) load(true);
  }

  async function remove(id: string) {
    setChecklists((prev) => prev.filter((c) => c.id !== id));
    const ok = await run(`del:${id}`, () => fetch(`/api/trade/checklists?id=${id}`, { method: "DELETE" }));
    load(true);
    if (!ok) return;
  }

  if (loading) return <PanelSkeleton />;

  return (
    <div>
      {actionError && <div className="trade-form-error">{actionError}</div>}

      {!checklists.length && (
        <div className="trade-empty-state">
          <ClipboardList size={32} />
          <p>{tr("هنوز چک‌لیستی نساختی", "You have not created a checklist yet")}</p>
        </div>
      )}

      {/* همه‌ی چک‌لیست‌ها داخل یک باکس واحدند، نه هرکدام یک کارت شناور روی
          بک‌گراند اصلی (درخواست صریح). */}
      {!!checklists.length && (
        <div className="trade-surface trade-checklist-box trade-page-box">
          {checklists.map((c, idx) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: Math.min(idx, 8) * 0.04, ease: [0.22, 1, 0.36, 1] }}
              className="trade-checklist-row"
            >
              <div className="trade-checklist-row-kebab">
                <TradeKebabMenu
                  label={tr(`گزینه‌های ${c.name}`, `Options for ${c.name}`)}
                  actions={[
                    { label: tr("ویرایش", "Edit"), icon: <Pencil size={14} />, onClick: () => setEditing(c) },
                    { label: tr("کپی", "Duplicate"), icon: <Copy size={14} />, onClick: () => duplicate(c.id), disabled: pendingKey === `dup:${c.id}` },
                    { label: tr("حذف", "Delete"), icon: <Trash2 size={14} />, onClick: () => remove(c.id), danger: true },
                  ]}
                />
              </div>
              <Link href={`/trade/checklists/${c.id}`} prefetch className="trade-checklist-row-main">
                <span className="trade-account-name">{c.name}</span>
                {/* توپ رنگی سمت چپ اسم (بلافاصله بعدش در RTL) — نه گوشه‌ی
                    مطلق کارت. هم‌قاعده‌ی فهرست حساب‌های معاملاتی. */}
                <span className="trade-account-dot" style={{ background: c.color }} />
                {c.required && <span className="trade-account-type">{tr("الزامی", "Required")}</span>}
                <span className="trade-checklist-row-count mono">{tr(`${faNum(c.items.length)} مورد`, `${c.items.length} ${c.items.length === 1 ? "item" : "items"}`)}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <ChecklistEditor
          checklist={editing}
          onClose={() => { onCreatingChange(false); setEditing(null); }}
          onSaved={() => { onCreatingChange(false); setEditing(null); load(); }}
        />
      )}
    </div>
  );
}
