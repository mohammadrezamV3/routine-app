"use client";

import { MentorCollapse, MentorList, MentorListItem } from "./MentorMotion";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarCheck, Check, ClipboardList, Dumbbell, LayoutTemplate, Pencil, Plus, Trash2, X } from "lucide-react";
import { LoadingBlock, Spinner } from "./Spinner";
import { MentorConfirmDialog } from "./MentorConfirmDialog";
import { MentorDashError, fa, mentorApi } from "./MentorDashKit";
import { MI, MI_STROKE, MentorEmptyState, MentorField, MentorRow, MentorSection } from "./MentorUI";
import { fmtRelative } from "@/lib/mentorFormat";
import { FA_WEEKDAY } from "@/lib/jalali";
import { WEEK_ORDER } from "@/lib/schedule";
import type { TemplateDetail, TemplateItem, TemplateRow, TemplatesResponse, TemplateResponse } from "@/lib/mentorToolsTypes";

const ic = (Icon: typeof Check, size: number) => <Icon size={size} strokeWidth={MI_STROKE} aria-hidden />;
const NAME_MAX = 80;

function daysLabel(it: TemplateItem): string {
  if (it.repeat === "DAILY" || it.days.length === 7) return "هر روز";
  return WEEK_ORDER.filter((o) => it.days.includes(o.jsDay)).map((o) => FA_WEEKDAY[o.jsDay]).join("، ");
}

/** فهرست قالب‌های برنامه: ساخت برنامه از قالب، دیدن آیتم‌ها، تغییر نام و حذف */
export function MentorTemplatesList() {
  const [list, setList] = useState<TemplateRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<TemplateRow | null>(null);
  const [delBusy, setDelBusy] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const r = await mentorApi<TemplatesResponse>("/api/mentor/templates");
    if (!r.ok) { setError(r.error); return; }
    setList(r.data.templates);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function remove() {
    if (!confirm || delBusy) return;
    setDelBusy(true);
    setDelError(null);
    const r = await mentorApi<unknown>(`/api/mentor/templates/${encodeURIComponent(confirm.id)}`, { method: "DELETE" });
    setDelBusy(false);
    if (!r.ok && r.status !== 404) { setDelError(r.error); return; }
    setList((xs) => (xs ?? []).filter((t) => t.id !== confirm.id));
    setConfirm(null);
  }

  if (error && !list) return <MentorDashError message={error} onRetry={load} />;
  if (!list) return <LoadingBlock />;
  if (list.length === 0) {
    return (
      <MentorEmptyState
        icon={ic(LayoutTemplate, MI.empty)}
        title="هنوز قالبی نساخته‌ای"
        text="در ویرایشگر یا صفحه‌ی هر برنامه، «ذخیره به‌عنوان قالب» را بزن"
      />
    );
  }

  return (
    <>
      <MentorSection title="قالب‌های برنامه" icon={ic(LayoutTemplate, MI.section)} count={fa(list.length)} flush>
        <MentorList>
        {list.map((t) => (
          <MentorListItem key={t.id}>
          <TemplateRowView
            t={t}
            onRenamed={(nt) => setList((xs) => (xs ?? []).map((x) => (x.id === nt.id ? nt : x)))}
            onDelete={() => { setDelError(null); setConfirm(t); }}
          />
          </MentorListItem>
        ))}
        </MentorList>
      </MentorSection>
      {confirm && (
        <MentorConfirmDialog
          message={`قالب «${confirm.name}» حذف شود؟`}
          hint="برنامه‌هایی که از این قالب ساخته شده‌اند تغییر نمی‌کنند"
          confirmLabel="حذف قالب"
          busy={delBusy}
          error={delError}
          onConfirm={remove}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
}

function TemplateRowView({ t, onRenamed, onDelete }: { t: TemplateRow; onRenamed: (t: TemplateRow) => void; onDelete: () => void }) {
  const [mode, setMode] = useState<"idle" | "rename" | "items">("idle");
  const [name, setName] = useState(t.name);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [detail, setDetail] = useState<TemplateDetail | null>(null);

  async function rename(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const n = name.trim();
    if (!n) { setErr("نام قالب لازم است"); return; }
    setBusy(true);
    setErr(null);
    const r = await mentorApi<{ template: TemplateRow }>(`/api/mentor/templates/${encodeURIComponent(t.id)}`, { method: "PATCH", body: { name: n } });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    onRenamed(r.data.template);
    setMode("idle");
  }

  async function toggleItems() {
    if (mode === "items") { setMode("idle"); return; }
    setMode("items");
    if (detail) return;
    setBusy(true);
    setErr(null);
    const r = await mentorApi<TemplateResponse>(`/api/mentor/templates/${encodeURIComponent(t.id)}`);
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setDetail(r.data.template);
  }

  const word = t.type === "WORKOUT" ? "حرکت" : "آیتم";
  return (
    <MentorRow
      lead={t.type === "WORKOUT" ? ic(Dumbbell, MI.row) : ic(CalendarCheck, MI.row)}
      title={t.name}
      sub={
        <>
          {t.title !== t.name && <span>{t.title}</span>}
          <span>{fa(t.itemCount)} {word}</span>
          {t.durationDays != null && <span>{fa(t.durationDays + 1)} روز</span>}
          <span>{t.usedCount > 0 ? `${fa(t.usedCount)} بار استفاده` : "استفاده‌نشده"}</span>
          <span>ویرایش {fmtRelative(t.updatedAt)}</span>
        </>
      }
      end={
        <button type="button" className="trade-icon-btn danger" onClick={onDelete} aria-label={`حذف قالب ${t.name}`} title="حذف قالب">
          <Trash2 size={MI.btnSm} strokeWidth={MI_STROKE} aria-hidden />
        </button>
      }
      below={
        mode === "rename" ? (
          <form className="mentor-form" onSubmit={rename} noValidate>
            <MentorField label="نام قالب" htmlFor={`tpl-name-${t.id}`} error={err}>
              <input
                id={`tpl-name-${t.id}`} type="text" className="wsearch-newform-name trade-glass-field" maxLength={NAME_MAX} value={name} autoFocus
                onChange={(e) => { setName(e.target.value); setErr(null); }}
              />
            </MentorField>
            <div className="mentor-btn-group is-end">
              <button type="button" className="account-outline-btn muted mentor-btn is-sm" onClick={() => { setMode("idle"); setName(t.name); setErr(null); }} disabled={busy}>
                {ic(X, MI.btnSm)} انصراف
              </button>
              <button type="submit" className="trade-primary-btn mentor-btn is-sm" disabled={busy}>
                {busy ? <Spinner size={14} /> : <>{ic(Check, MI.btnSm)} ذخیره‌ی نام</>}
              </button>
            </div>
          </form>
        ) : (
          <>
            <MentorCollapse open={mode === "items"}>{(
              busy ? <Spinner size={14} /> : err ? <div className="form-inline-error" role="alert">{err}</div> : detail && (
                <div>
                  {detail.items.map((it, i) => (
                    <div key={i} className="mentor-item">
                      <div className="mentor-item-title">{fa(i + 1)}. {it.title}</div>
                      <div className="mentor-item-meta">
                        <span>{daysLabel(it)}</span>
                        {it.startTime && <span className="mono">{fa(it.startTime)}</span>}
                        {it.durationMin != null && <span>{fa(it.durationMin)} دقیقه</span>}
                        {it.sets != null && <span>{fa(it.sets)} ست{it.reps ? ` × ${fa(it.reps)}` : ""}</span>}
                        {it.weightKg != null && <span>{fa(it.weightKg)} کیلوگرم</span>}
                        {it.restSec != null && <span>استراحت {fa(it.restSec)} ثانیه</span>}
                      </div>
                      {it.details && <p className="mentor-item-details">{it.details}</p>}
                    </div>
                  ))}
                  {detail.note && <p className="mentor-quote">{detail.note}</p>}
                </div>
              )
            )}</MentorCollapse>
            <div className="mentor-btn-group is-end">
              <button type="button" className="account-outline-btn muted mentor-btn is-sm" onClick={toggleItems} aria-expanded={mode === "items"}>
                {ic(ClipboardList, MI.btnSm)} {mode === "items" ? "بستن آیتم‌ها" : "نمایش آیتم‌ها"}
              </button>
              <button type="button" className="account-outline-btn muted mentor-btn is-sm" onClick={() => { setMode("rename"); setErr(null); }}>
                {ic(Pencil, MI.btnSm)} تغییر نام
              </button>
              <Link href={`/mentor/programs/new?templateId=${encodeURIComponent(t.id)}`} prefetch={false} className="account-outline-btn mentor-btn is-sm">
                {ic(Plus, MI.btnSm)} ساخت برنامه
              </Link>
            </div>
          </>
        )
      }
    />
  );
}
