"use client";

import { MentorList, MentorListItem, MentorSheet } from "./MentorMotion";
import { useCallback, useEffect, useState } from "react";
import { Check, MessageSquareQuote, Pencil, Plus, Trash2, X } from "lucide-react";
import { LoadingBlock, Spinner } from "./Spinner";
import { MentorConfirmDialog } from "./MentorConfirmDialog";
import { MentorDashError, fa, mentorApi } from "./MentorDashKit";
import { MI, MI_STROKE, MentorEmpty, MentorEmptyState, MentorField, MentorRow } from "./MentorUI";
import type { SavedRepliesResponse, SavedReply } from "@/lib/mentorToolsTypes";
import { tr, trv } from "@/lib/i18n";

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
    if (!t) f.title = tr("عنوان لازمه", "A title is required");
    if (!b) f.body = tr("متن پیام لازمه", "Message text is required");
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
      <MentorField label={tr("عنوان", "Title")} htmlFor={`rp-title-${id}`} error={errs.title} hint={tr("فقط تو تو فهرست پیام‌های آماده می‌بینی", "Only you see this in your saved replies")}>
        <input
          id={`rp-title-${id}`} type="text" className="wsearch-newform-name trade-glass-field" maxLength={TITLE_MAX} value={title}
          placeholder={tr("مثلا یادآوری ثبت روزانه", "For example: Daily logging reminder")} autoFocus
          onChange={(e) => { setTitle(e.target.value); setErrs((x) => ({ ...x, title: undefined })); }}
        />
      </MentorField>
      <MentorField label={tr("متن پیام", "Message text")} htmlFor={`rp-body-${id}`} error={errs.body} hint={tr(`${fa(body.length)} از ${fa(BODY_MAX)} حرف`, `${fa(body.length)} of ${fa(BODY_MAX)} characters`)}>
        <textarea
          id={`rp-body-${id}`} className="wsearch-newform-name trade-glass-field" rows={3} maxLength={BODY_MAX} value={body}
          placeholder={tr("مثلا «برنامه‌ی این هفته را دیدم؛ ست آخر را با وزنه‌ی سبک‌تر انجام بده»", `For example: "I saw this week's plan; do the last set with a lighter weight"`)}
          onChange={(e) => { setBody(e.target.value); setErrs((x) => ({ ...x, body: undefined })); }}
        />
      </MentorField>
      {error && <div className="form-inline-error" role="alert">{error}</div>}
      <div className="mentor-btn-group is-end">
        <button type="button" className="account-outline-btn muted mentor-btn is-sm" onClick={onCancel} disabled={busy}>{tr("انصراف", "Cancel")}</button>
        <button type="submit" className="trade-primary-btn mentor-btn is-sm" disabled={busy}>
          {busy ? <Spinner size={14} /> : <>{ic(Check, MI.btnSm)} {initial ? tr("ذخیره", "Save") : tr("افزودن پیام", "Add message")}</>}
        </button>
      </div>
    </form>
  );
}

/**
 * مدیریت پیام‌های آماده‌ی منتور (افزودن، ویرایش، حذف). درج در گفت‌وگو با
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
  const editingReply = editing ? list.find((x) => x.id === editing) : undefined;
  const sheetOpen = adding || !!editingReply;
  const closeSheet = () => { setAdding(false); setEditing(null); };
  return (
    <>
      <div className="mv2-pg-toolbar">
        {!full && (
          <button type="button" className="account-outline-btn mentor-btn is-sm" onClick={() => { setAdding(true); setEditing(null); }}>
            {ic(Plus, MI.btnSm)} {tr("پیام آماده‌ی تازه", "New saved reply")}
          </button>
        )}
      </div>
      {list.length === 0 ? (
        <MentorEmptyState
          icon={ic(MessageSquareQuote, MI.empty)}
          title={tr("هنوز پیام آماده‌ای نداری", "You have no saved replies yet")}
          text={tr("جواب‌هایی که زیاد می‌دی رو اینجا بنویس تا تو گفت‌وگو با یک زدن بفرستی", "Write the answers you give often here so you can send them with one tap in the chat")}
        />
      ) : (
        <div className="mv2-pg-plain">
          <MentorList>
            {list.map((r) => (
              <MentorListItem key={r.id}>
                <MentorRow
                  title={r.title}
                  sub={<span className="mentor-reply-preview">{r.body}</span>}
                  end={
                    <>
                      <button type="button" className="trade-icon-btn" onClick={() => { setEditing(r.id); setAdding(false); }} aria-label={tr(`ویرایش پیام ${r.title}`, `Edit message ${r.title}`)} title={tr("ویرایش", "Edit")}>
                        <Pencil size={MI.btnSm} strokeWidth={MI_STROKE} aria-hidden />
                      </button>
                      <button type="button" className="trade-icon-btn danger" onClick={() => { setDelError(null); setConfirm(r); }} aria-label={tr(`حذف پیام ${r.title}`, `Delete message ${r.title}`)} title={tr("حذف", "Delete")}>
                        <Trash2 size={MI.btnSm} strokeWidth={MI_STROKE} aria-hidden />
                      </button>
                    </>
                  }
                />
              </MentorListItem>
            ))}
          </MentorList>
        </div>
      )}
      {full && <MentorEmpty>{tr(`به سقف ${fa(MAX_REPLIES)} پیام رسیدی؛ برای افزودن، یکی رو حذف کن`, `You have reached the limit of ${fa(MAX_REPLIES)} replies. Delete one to add another.`)}</MentorEmpty>}
      <MentorSheet open={sheetOpen} onClose={closeSheet} title={editingReply ? tr("ویرایش پیام آماده", "Edit saved reply") : tr("پیام آماده‌ی تازه", "New saved reply")} size="md">
        {sheetOpen && (
          <ReplyForm
            key={editingReply?.id ?? "new"}
            initial={editingReply}
            onCancel={closeSheet}
            onSaved={(nr) => {
              setList((xs) => (editingReply ? (xs ?? []).map((x) => (x.id === nr.id ? nr : x)) : [...(xs ?? []), nr]));
              closeSheet();
              invalidateSavedReplies();
            }}
          />
        )}
      </MentorSheet>
      {confirm && (
        <MentorConfirmDialog
          message={tr(`پیام «${confirm.title}» حذف بشه؟`, `Delete the message "${confirm.title}"?`)}
          hint={tr("پیام‌هایی که قبلا باهاش فرستادی تغییر نمی‌کنن", "Messages you already sent with it are not changed")}
          confirmLabel={tr("حذف پیام", "Delete message")}
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
        {ic(MessageSquareQuote, MI.btnSm)} {tr("پاسخ آماده", "Saved reply")}
      </button>
      {open && (
        error ? (
          <div className="form-inline-error" role="alert">{error}</div>
        ) : !list ? (
          <Spinner size={14} />
        ) : list.length === 0 ? (
          <MentorEmpty>
            {trv(<>هنوز پاسخ آماده‌ای نیست؛ از <a href="/mentor/templates?tab=replies" className="mentor-link">قالب‌ها</a> اضافه کن</>, <>No saved replies yet; add some from <a href="/mentor/templates?tab=replies" className="mentor-link">Templates</a></>)}
          </MentorEmpty>
        ) : (
          <div className="mentor-btn-group" role="list" aria-label={tr("پاسخ‌های آماده", "Saved replies")}>
            {list.map((r) => (
              <button
                key={r.id} type="button" role="listitem" className="account-outline-btn mentor-btn is-sm" title={r.body}
                onClick={() => { onPick(r.body); setOpen(false); }}
              >
                {r.title}
              </button>
            ))}
            <button type="button" className="trade-icon-btn" onClick={() => setOpen(false)} aria-label={tr("بستن پاسخ‌های آماده", "Close saved replies")}>
              <X size={MI.btnSm} strokeWidth={MI_STROKE} aria-hidden />
            </button>
          </div>
        )
      )}
    </div>
  );
}
