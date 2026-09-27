"use client";

import "./mentor.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Lock, Megaphone, Send, X } from "lucide-react";
import { faNum } from "@/lib/jalali";
import { publicUserName, type PublicUser } from "@/lib/mentorTypes";
import { NETWORK_ERROR, readApiError } from "@/lib/mentorFormat";
import { ConversationCipher, type Identity } from "@/lib/e2ee/client";
import { LockBodyScroll } from "./LockBodyScroll";
import { LoadingBlock, Spinner } from "./Spinner";
import { MentorE2EEGate } from "./MentorE2EEGate";
import { MentorEmpty, MentorField, MentorSection, MI, MI_STROKE } from "./MentorUI";
import { MentorDashError } from "./MentorDashKit";
import { SavedRepliesPicker } from "./MentorSavedReplies";

const FIELD = "wsearch-newform-name trade-glass-field";
const MAX_LEN = 2000;

type Recipient = { mentorshipId: string; student: PublicUser; key: { version: number; publicKey: string } | null; labelIds: string[] };
type RecipientsResponse = { recipients: Recipient[]; labels: { id: string; name: string }[] };
type SendResult = { sent: number; failed: { mentorshipId: string; code: string }[] };

/**
 * «ارسال گروهی» در داشبوردِ منتور — یک متن برای چند شاگردِ فعال. متن روی همین
 * دستگاه برای *هر* گفت‌وگو جداگانه رمز می‌شود (کلیدِ همان جفت)؛ سرور فقط
 * پیام‌های رمزشده‌ی مستقل می‌گیرد. خودکفا و قابلِ حذف: فقط همین فایل + /api/mentor/broadcast.
 */
export function MentorBroadcast({ activeCount }: { activeCount: number }) {
  const [open, setOpen] = useState(false);
  if (activeCount < 2) return null;
  return (
    <MentorSection
      title="ارسال گروهی"
      icon={<Megaphone size={MI.section} strokeWidth={MI_STROKE} aria-hidden />}
      desc="یک پیام برای چند شاگرد فعال؛ برای هر شاگرد جداگانه رمزگذاری سرتاسری می‌شود."
      action={
        <button type="button" className="account-outline-btn mentor-btn is-sm" onClick={() => setOpen(true)}>
          <Send size={MI.btnSm} strokeWidth={MI_STROKE} aria-hidden /> نوشتن پیام
        </button>
      }
    >
      {open && <BroadcastModal onClose={() => setOpen(false)} />}
    </MentorSection>
  );
}

function BroadcastModal({ onClose }: { onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  if (typeof document === "undefined") return null;
  return createPortal(
    <>
      <LockBodyScroll />
      <div className="modal-overlay open" onClick={() => !busy && onClose()} style={{ zIndex: 90 }} />
      <div className="modal-panel open mentor-modal" role="dialog" aria-modal="true" aria-label="ارسال گروهی" style={{ zIndex: 91, maxWidth: 480 }}>
        <div className="modal-head">
          <div className="modal-title">ارسال گروهی</div>
          <button type="button" className="trade-icon-btn" onClick={onClose} aria-label="بستن" disabled={busy}>
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>
        <MentorE2EEGate>{(identity) => <BroadcastForm identity={identity} busy={busy} setBusy={setBusy} onClose={onClose} />}</MentorE2EEGate>
      </div>
    </>,
    document.body
  );
}

function BroadcastForm({ identity, busy, setBusy, onClose }: { identity: Identity; busy: boolean; setBusy: (b: boolean) => void; onClose: () => void }) {
  const [data, setData] = useState<RecipientsResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [text, setText] = useState("");
  const [textErr, setTextErr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SendResult | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/mentor/broadcast", { cache: "no-store" });
      if (!res.ok) { setLoadError(await readApiError(res, "فهرست شاگردها دریافت نشد؛ دوباره تلاش کن")); return; }
      const d: RecipientsResponse = await res.json();
      setData(d);
      setSelected(new Set(d.recipients.filter((r) => r.key).map((r) => r.mentorshipId)));
    } catch {
      setLoadError(NETWORK_ERROR);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => (data?.recipients ?? []).filter((r) => !label || r.labelIds.includes(label)), [data, label]);
  const chosen = visible.filter((r) => r.key && selected.has(r.mentorshipId));
  const withoutKey = visible.filter((r) => !r.key).length;

  function toggle(id: string, on: boolean) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (on) n.add(id); else n.delete(id);
      return n;
    });
    setResult(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const body = text.trim();
    if (!body) { setTextErr("متن پیام را بنویس"); return; }
    if (body.length > MAX_LEN) { setTextErr(`پیام حداکثر ${faNum(MAX_LEN)} نویسه است`); return; }
    if (chosen.length === 0) { setError("حداقل یک شاگرد انتخاب کن"); return; }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      // برای هر گفت‌وگو جداگانه: کلیدِ همان جفت، IV و کلیدِ فرانکینگِ تازه
      const items = [];
      for (const r of chosen) {
        const c = new ConversationCipher(identity, r.mentorshipId, {
          mentorId: identity.userId,
          studentId: r.student.id,
          keys: {
            [identity.userId]: [{ version: identity.version, publicKey: identity.publicKey, current: true }],
            [r.student.id]: [{ version: r.key!.version, publicKey: r.key!.publicKey, current: true }],
          },
        });
        const { frankingKey: _fk, ...enc } = await c.encrypt(body);
        items.push({ mentorshipId: r.mentorshipId, ...enc });
      }
      const res = await fetch("/api/mentor/broadcast", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
      if (!res.ok) { setError(await readApiError(res, "پیام ارسال نشد؛ دوباره تلاش کن")); return; }
      const d: SendResult = await res.json();
      setResult(d);
      if (d.sent > 0 && d.failed.length === 0) setText("");
      if (d.failed.some((f) => f.code === "KEY_CHANGED" || f.code === "PEER_NO_KEY")) load();
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  }

  if (loadError) return <MentorDashError message={loadError} onRetry={load} />;
  if (!data) return <LoadingBlock />;
  if (data.recipients.length === 0) return <MentorEmpty>شاگرد فعالی برای ارسال نیست</MentorEmpty>;

  return (
    <form className="mentor-form" onSubmit={submit}>
      <p className="mentor-e2ee-line">
        <Lock size={13} strokeWidth={1.75} aria-hidden />
        <span>هر شاگرد پیام را در گفت‌وگوی خودش با تو می‌بیند؛ شاگردها از هم خبر ندارند</span>
      </p>

      {data.labels.length > 0 && (
        <MentorField label="گیرنده‌ها" htmlFor="bc-label">
          <select id="bc-label" className={FIELD} value={label} onChange={(e) => { setLabel(e.target.value); setResult(null); }}>
            <option value="">همه‌ی شاگردهای فعال</option>
            {data.labels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </MentorField>
      )}

      <div className="mentor-broadcast-list thin-scroll" role="group" aria-label="شاگردها">
        {visible.length === 0 ? (
          <MentorEmpty>شاگردی با این برچسب نیست</MentorEmpty>
        ) : visible.map((r) => (
          <label key={r.mentorshipId} className={`mentor-check${r.key ? "" : " is-disabled"}`}>
            <input type="checkbox" disabled={!r.key || busy} checked={!!r.key && selected.has(r.mentorshipId)} onChange={(e) => toggle(r.mentorshipId, e.target.checked)} />
            <span className="mentor-check-label">{publicUserName(r.student)}</span>
            {!r.key && <span className="mentor-check-kind">رمز گفت‌وگو ندارد</span>}
          </label>
        ))}
      </div>
      <p className="mentor-broadcast-summary">
        {faNum(chosen.length)} گیرنده
        {withoutKey > 0 ? `؛ ${faNum(withoutKey)} شاگرد تا فعال‌سازی رمز گفت‌وگو پیام نمی‌گیرد` : ""}
      </p>

      <SavedRepliesPicker onPick={(t) => { setText((d) => (d ? d + "\n" : "") + t); setTextErr(null); }} disabled={busy} />
      <MentorField label="متن پیام" htmlFor="bc-text" error={textErr}>
        <textarea id="bc-text" className={FIELD} rows={4} maxLength={MAX_LEN + 200} value={text} onChange={(e) => { setText(e.target.value); setTextErr(null); setResult(null); }} placeholder="مثلاً «برنامه‌ی هفته‌ی بعد از شنبه فعال می‌شود»" />
      </MentorField>

      {error && <div className="form-inline-error" role="alert">{error}</div>}
      {result && result.failed.length > 0 && (
        <div className="form-inline-error" role="alert">
          برای {faNum(result.failed.length)} شاگرد ارسال نشد{result.sent > 0 ? `؛ ${faNum(result.sent)} پیام ارسال شد` : ""}؛ دوباره تلاش کن
        </div>
      )}
      <div className="mentor-form-actions">
        <button type="button" className="account-outline-btn muted mentor-btn" onClick={onClose} disabled={busy}>بستن</button>
        <button type="submit" className="trade-primary-btn mentor-btn" disabled={busy || chosen.length === 0}>
          {busy ? <Spinner size={14} /> : result && result.sent > 0 && result.failed.length === 0 ? `برای ${faNum(result.sent)} شاگرد ارسال شد` : <><Send size={MI.btn} strokeWidth={MI_STROKE} aria-hidden /> ارسال</>}
        </button>
      </div>
    </form>
  );
}
