"use client";

import { MentorList, MentorListItem } from "./MentorMotion";
import { useCallback, useEffect, useState } from "react";
import { Check, MessageSquareQuote, Pencil, Plus, Trash2, X } from "lucide-react";
import { LoadingBlock, Spinner } from "./Spinner";
import { MentorConfirmDialog } from "./MentorConfirmDialog";
import { MentorDashError, fa, mentorApi } from "./MentorDashKit";
import { MI, MI_STROKE, MentorEmpty, MentorField, MentorRow, MentorSection } from "./MentorUI";
import type { SavedRepliesResponse, SavedReply } from "@/lib/mentorToolsTypes";

const ic = (Icon: typeof Check, size: number) => <Icon size={size} strokeWidth={MI_STROKE} aria-hidden />;
const TITLE_MAX = 40;
const BODY_MAX = 2000;
const MAX_REPLIES = 50;

/** فرم افزودن/ویرایش یک پاسخ آماده */
function ReplyForm({
  initial, onCancel, onSaved,
}: { initial?: SavedReply; onCancel: () => void; onSaved: (r: SavedReply) => void }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [errs, setErrs] = useState<{ title?: string; body?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const t = title.trim();
    const b = body.trim();
    const f: typeof errs = {};
    if (!t) f.title = "عنوان لازم است";
    if (!b) f.body = "متن پاسخ لازم است";
    setErrs(f);
    if (f.title || f.body) return;
    setBusy(true);
    setError(null);
    const r = initial
      ? await mentorApi<{ reply: SavedReply }>(`/api/mentor/replies/${encodeURIComponent(initial.id)}`, { method: "PATCH", body: { title: t, body: b } })
      : await mentorApi<{ reply: SavedReply }>("/api/mentor/replies", { method: "POST", body: { title: t, body: b } });
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    onSaved(r.data.reply);
  }

  const id = initial?.id ?? "new";
  return (
    <form className="mentor-form" onSubmit={submit} noValidate>
      <MentorField label="عنوان" htmlFor={`rp-title-${id}`} error={errs.title} hint="فقط برای خودت در فهرست پاسخ‌ها دیده می‌شود">
        <input
          id={`rp-title-${id}`} type="text" className="wsearch-newform-name trade-glass-field" maxLength={TITLE_MAX} value={title}
          placeholder="مثلا یادآوری ثبت روزانه" autoFocus
          onChange={(e) => { setTitle(e.target.value); setErrs((x) => ({ ...x, title: undefined })); }}
        />
      </MentorField>
      <MentorField label="متن پاسخ" htmlFor={`rp-body-${id}`} error={errs.body} hint={`${fa(body.length)} از ${fa(BODY_MAX)} نویسه`}>
        <textarea
          id={`rp-body-${id}`} className="wsearch-newform-name trade-glass-field" rows={3} maxLength={BODY_MAX} value={body}
          placeholder="مثلا «برنامه‌ی این هفته را دیدم؛ ست آخر را با وزنه‌ی سبک‌تر انجام بده»"
          onChange={(e) => { setBody(e.target.value); setErrs((x) => ({ ...x, body: undefined })); }}
        />
      </MentorField>
      {error && <div className="form-inline-error" role="alert">{error}</div>}
      <div className="mentor-btn-group is-end">
        <button type="button" className="account-outline-btn muted mentor-btn is-sm" onClick={onCancel} disabled={busy}>انصراف</button>
        <button type="submit" className="trade-primary-btn mentor-btn is-sm" disabled={busy}>
          {busy ? <Spinner size={14} /> : <>{ic(Check, MI.btnSm)} {initial ? "ذخیره‌ی تغییرات" : "افزودن پاسخ"}</>}
        </button>
      </div>
    </form>
  );
}

/**
 * مدیریت پاسخ‌های آماده‌ی منتور (افزودن، ویرایش، حذف). درج در گفت‌وگو با
 * `SavedRepliesPicker` انجام می‌شود.
 */
export function MentorSavedRepliesManager() {
  const [list, setList] = useState<SavedReply[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<SavedReply | null>(null);
  const [delBusy, setDelBusy] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const r = await mentorApi<SavedRepliesResponse>("/api/mentor/replies");
    if (!r.ok) { setError(r.error); return; }
    setList(r.data.replies);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function remove() {
    if (!confirm || delBusy) return;
    setDelBusy(true);
    setDelError(null);
    const r = await mentorApi<unknown>(`/api/mentor/replies/${encodeURIComponent(confirm.id)}`, { method: "DELETE" });
    setDelBusy(false);
    if (!r.ok && r.status !== 404) { setDelError(r.error); return; }
    setList((xs) => (xs ?? []).filter((x) => x.id !== confirm.id));
    invalidateSavedReplies();
    setConfirm(null);
  }

  if (error && !list) return <MentorDashError message={error} onRetry={load} />;
  if (!list) return <LoadingBlock />;

  const full = list.length >= MAX_REPLIES;
  return (
    <>
      <MentorSection
        title="پاسخ‌های آماده" icon={ic(MessageSquareQuote, MI.section)} count={list.length ? fa(list.length) : undefined} flush
        action={!adding && !full ? (
          <button type="button" className="mentor-text-btn" onClick={() => { setAdding(true); setEditing(null); }}>
            {ic(Plus, MI.btnSm)} پاسخ جدید
          </button>
        ) : undefined}
      >
        {adding && (
          <div className="mentor-row is-stacked">
            <ReplyForm
              onCancel={() => setAdding(false)}
              onSaved={(r) => { setList((xs) => [...(xs ?? []), r]); setAdding(false); invalidateSavedReplies(); }}
            />
          </div>
        )}
        {list.length === 0 && !adding && <MentorEmpty>هنوز پاسخ آماده‌ای ذخیره نکرده‌ای</MentorEmpty>}
        <MentorList>
        {list.map((r) => (
          <MentorListItem key={r.id}>{
          editing === r.id ? (
            <div className="mentor-row is-stacked">
              <ReplyForm
                initial={r}
                onCancel={() => setEditing(null)}
                onSaved={(nr) => { setList((xs) => (xs ?? []).map((x) => (x.id === nr.id ? nr : x))); setEditing(null); invalidateSavedReplies(); }}
              />
            </div>
          ) : (
            <MentorRow
              title={r.title}
              sub={<span className="mentor-reply-preview">{r.body}</span>}
              end={
                <>
                  <button type="button" className="trade-icon-btn" onClick={() => { setEditing(r.id); setAdding(false); }} aria-label={`ویرایش پاسخ ${r.title}`} title="ویرایش">
                    <Pencil size={MI.btnSm} strokeWidth={MI_STROKE} aria-hidden />
                  </button>
                  <button type="button" className="trade-icon-btn danger" onClick={() => { setDelError(null); setConfirm(r); }} aria-label={`حذف پاسخ ${r.title}`} title="حذف">
                    <Trash2 size={MI.btnSm} strokeWidth={MI_STROKE} aria-hidden />
                  </button>
                </>
              }
            />
          )
          }</MentorListItem>
        ))}
        </MentorList>
        {full && <MentorEmpty>به سقف {fa(MAX_REPLIES)} پاسخ رسیده‌ای؛ برای افزودن، یکی را حذف کن</MentorEmpty>}
      </MentorSection>
      {confirm && (
        <MentorConfirmDialog
          message={`پاسخ «${confirm.title}» حذف شود؟`}
          hint="پیام‌هایی که قبلا با آن فرستاده‌ای تغییر نمی‌کنند"
          confirmLabel="حذف پاسخ"
          busy={delBusy}
          error={delError}
          onConfirm={remove}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
}

// ───────────────────────── انتخاب در گفت‌وگو ─────────────────────────

// کش سبک همین نشست تا بازکردن دوباره‌ی فهرست در گفت‌وگو درخواست تازه نزند
let cache: SavedReply[] | null = null;
function invalidateSavedReplies() { cache = null; }

/**
 * دکمه‌ی «پاسخ آماده» برای کادر پیام منتور. با کلیک فهرست عنوان‌ها باز
 * می‌شود و انتخاب هر کدام `onPick(body)` را صدا می‌زند؛ خود درج (و هر
 * رمزنگاری/ارسال) با میزبان است. فقط برای منتور سوار شود.
 *
 *   <SavedRepliesPicker onPick={(text) => setDraft((d) => (d ? d + "\n" : "") + text)} />
 */
export function SavedRepliesPicker({ onPick, disabled }: { onPick: (text: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<SavedReply[] | null>(cache);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next || cache) { if (cache) setList(cache); return; }
    setError(null);
    const r = await mentorApi<SavedRepliesResponse>("/api/mentor/replies");
    if (!r.ok) { setError(r.error); return; }
    cache = r.data.replies;
    setList(r.data.replies);
  }

  return (
    <div className="mentor-replies-picker">
      <button type="button" className="mentor-text-btn" onClick={toggle} disabled={disabled} aria-expanded={open}>
        {ic(MessageSquareQuote, MI.btnSm)} پاسخ آماده
      </button>
      {open && (
        error ? (
          <div className="form-inline-error" role="alert">{error}</div>
        ) : !list ? (
          <Spinner size={14} />
        ) : list.length === 0 ? (
          <MentorEmpty>
            هنوز پاسخ آماده‌ای نیست؛ از <a href="/mentor/templates?tab=replies" className="mentor-link">قالب‌ها</a> اضافه کن
          </MentorEmpty>
        ) : (
          <div className="mentor-btn-group" role="list" aria-label="پاسخ‌های آماده">
            {list.map((r) => (
              <button
                key={r.id} type="button" role="listitem" className="account-outline-btn mentor-btn is-sm" title={r.body}
                onClick={() => { onPick(r.body); setOpen(false); }}
              >
                {r.title}
              </button>
            ))}
            <button type="button" className="trade-icon-btn" onClick={() => setOpen(false)} aria-label="بستن پاسخ‌های آماده">
              <X size={MI.btnSm} strokeWidth={MI_STROKE} aria-hidden />
            </button>
          </div>
        )
      )}
    </div>
  );
}
