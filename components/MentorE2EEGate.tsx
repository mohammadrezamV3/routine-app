"use client";

import "./mentor.css";
import { useState } from "react";
import { AlertTriangle, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import {
  WrongPasscodeError,
  passcodeProblem,
  refreshIdentity,
  resetIdentity,
  setupIdentity,
  unlockIdentity,
  useE2EEIdentity,
  type Identity,
  type IdentityState,
} from "@/lib/e2ee/client";
import { LoadingBlock, Spinner } from "./Spinner";
import { MentorErrorState } from "./MentorPageShell";
import { MentorConfirmDialog } from "./MentorConfirmDialog";
import { MentorEmpty, MentorField, MentorSection, MI, MI_STROKE } from "./MentorUI";

const FIELD = "wsearch-newform-name trade-glass-field";
const ICON_SEC = { size: MI.section, strokeWidth: MI_STROKE } as const;

/**
 * دروازه‌ی رمزگذاریِ سرتاسری: تا کلیدِ هویت روی این دستگاه آماده نباشد،
 * به‌جای children فرمِ «راه‌اندازی» یا «باز کردن» را نشان می‌دهد.
 *   none   → ساختِ رمزِ گفت‌وگو (بارِ اول)
 *   locked → واردکردنِ رمز روی دستگاهِ تازه، یا «فراموش کرده‌ام» → کلیدِ تازه
 */
export type GateContext = "chat" | "notes";
const UNLOCK_TITLE: Record<GateContext, string> = { chat: "باز کردن گفت‌وگو روی این دستگاه", notes: "باز کردن یادداشت‌ها روی این دستگاه" };
const UNLOCK_TEXT: Record<GateContext, string> = {
  chat: "پیام‌ها رمزگذاری سرتاسری دارند. رمز گفت‌وگویی را که بار اول ساختی وارد کن.",
  notes: "یادداشت‌های خصوصی رمزگذاری سرتاسری دارند و فقط با رمز گفت‌وگوی تو باز می‌شوند.",
};

export function MentorE2EEGate({
  children, context = "chat",
}: {
  children: (identity: Identity, s: Extract<IdentityState, { status: "ready" }>) => React.ReactNode;
  context?: GateContext;
}) {
  const s = useE2EEIdentity();
  if (s.status === "loading") return <LoadingBlock />;
  if (s.status === "unsupported") return <MentorEmpty icon={<AlertTriangle size={16} strokeWidth={MI_STROKE} aria-hidden />}>این مرورگر رمزگذاری سرتاسری را پشتیبانی نمی‌کند؛ مرورگر را به‌روز کن</MentorEmpty>;
  if (s.status === "error") return <MentorErrorState message={s.message} onRetry={() => refreshIdentity()} />;
  if (s.status === "none") return <SetupForm userId={s.userId} />;
  if (s.status === "locked") return <UnlockForm userId={s.userId} version={s.server.version} hasBackup={s.server.hasBackup} context={context} />;
  return <>{children(s.identity, s)}</>;
}

function PasscodePair({
  idPrefix, value, repeat, onValue, onRepeat, error, repeatError, label = "رمز گفت‌وگو",
}: {
  idPrefix: string; value: string; repeat: string; onValue: (v: string) => void; onRepeat: (v: string) => void;
  error: string | null; repeatError: string | null; label?: string;
}) {
  return (
    <div className="mentor-field-row">
      <MentorField label={label} htmlFor={`${idPrefix}-pass`} error={error} hint="حداقل 10 نویسه؛ با رمز حساب آریون یکی نباشد">
        <input id={`${idPrefix}-pass`} type="password" className={FIELD} autoComplete="new-password" value={value} onChange={(e) => onValue(e.target.value)} aria-invalid={!!error} />
      </MentorField>
      <MentorField label="تکرار رمز" htmlFor={`${idPrefix}-repeat`} error={repeatError}>
        <input id={`${idPrefix}-repeat`} type="password" className={FIELD} autoComplete="new-password" value={repeat} onChange={(e) => onRepeat(e.target.value)} aria-invalid={!!repeatError} />
      </MentorField>
    </div>
  );
}

async function validatePair(pass: string, repeat: string): Promise<{ pass: string | null; repeat: string | null }> {
  const p = await passcodeProblem(pass);
  return { pass: p, repeat: !p && pass !== repeat ? "تکرار رمز با رمز یکی نیست" : null };
}

function errMsg(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

function SetupForm({ userId }: { userId: string }) {
  const [pass, setPass] = useState("");
  const [repeat, setRepeat] = useState("");
  const [ack, setAck] = useState(false);
  const [errs, setErrs] = useState<{ pass: string | null; repeat: string | null; ack: string | null }>({ pass: null, repeat: null, ack: null });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    const v = await validatePair(pass, repeat);
    const ackErr = ack ? null : "برای ادامه، این مورد را تأیید کن";
    setErrs({ ...v, ack: ackErr });
    if (v.pass || v.repeat || ackErr) return;
    setBusy(true);
    try {
      await setupIdentity(userId, pass);
    } catch (e2) {
      setError(errMsg(e2, "رمزگذاری فعال نشد؛ دوباره تلاش کن"));
      await refreshIdentity();
    } finally {
      setBusy(false);
    }
  }

  return (
    <MentorSection title="فعال‌سازی رمزگذاری سرتاسری" icon={<ShieldCheck {...ICON_SEC} aria-hidden />}>
      <form className="mentor-form" onSubmit={submit}>
        <p className="mentor-muted">
          پیام‌های منتوری و یادداشت‌های خصوصی روی دستگاه تو رمز می‌شوند و فقط تو و طرف گفت‌وگو می‌توانید پیام‌ها را بخوانید؛ آریون و ادمین‌هایش به متن دسترسی ندارند، مگر پیامی که خودت گزارش کنی.
          رمز گفت‌وگو برای باز کردن آن‌ها روی دستگاه دیگر لازم است و روی سرور ذخیره نمی‌شود.
        </p>
        <PasscodePair idPrefix="e2ee-setup" value={pass} repeat={repeat} onValue={(v) => { setPass(v); setErrs((x) => ({ ...x, pass: null })); }} onRepeat={(v) => { setRepeat(v); setErrs((x) => ({ ...x, repeat: null })); }} error={errs.pass} repeatError={errs.repeat} />
        <div>
          <label className="mentor-check">
            <input type="checkbox" checked={ack} onChange={(e) => { setAck(e.target.checked); setErrs((x) => ({ ...x, ack: null })); }} />
            <span className="mentor-check-label">می‌دانم اگر این رمز را فراموش کنم، پیام‌های قبلی روی دستگاه تازه خوانده نمی‌شوند و آریون نمی‌تواند آن را بازیابی کند</span>
          </label>
          {errs.ack && <p className="mentor-field-error" role="alert">{errs.ack}</p>}
        </div>
        {error && <div className="form-inline-error" role="alert">{error}</div>}
        <div className="mentor-form-actions">
          <button type="submit" className="trade-primary-btn mentor-btn" disabled={busy}>
            {busy ? <Spinner size={14} /> : <><ShieldCheck size={MI.btn} strokeWidth={MI_STROKE} aria-hidden /> فعال‌سازی</>}
          </button>
        </div>
      </form>
    </MentorSection>
  );
}

function UnlockForm({ userId, version, hasBackup, context }: { userId: string; version: number; hasBackup: boolean; context: GateContext }) {
  const [mode, setMode] = useState<"unlock" | "reset">(hasBackup ? "unlock" : "reset");
  const [pass, setPass] = useState("");
  const [passErr, setPassErr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // بازنشانی
  const [np, setNp] = useState("");
  const [nr, setNr] = useState("");
  const [nerrs, setNerrs] = useState<{ pass: string | null; repeat: string | null }>({ pass: null, repeat: null });
  const [confirm, setConfirm] = useState(false);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!pass) { setPassErr("رمز گفت‌وگو را وارد کن"); return; }
    setBusy(true);
    setError(null);
    try {
      await unlockIdentity(userId, pass);
    } catch (e2) {
      if (e2 instanceof WrongPasscodeError) setPassErr(e2.message);
      else setError(errMsg(e2, "باز نشد؛ دوباره تلاش کن"));
    } finally {
      setBusy(false);
    }
  }

  async function askReset(e: React.FormEvent) {
    e.preventDefault();
    const v = await validatePair(np, nr);
    setNerrs(v);
    if (v.pass || v.repeat) return;
    setError(null);
    setConfirm(true);
  }

  async function doReset() {
    setBusy(true);
    setError(null);
    try {
      await resetIdentity(userId, version, np);
      setConfirm(false);
    } catch (e2) {
      setError(errMsg(e2, "کلید تازه ساخته نشد؛ دوباره تلاش کن"));
      await refreshIdentity();
    } finally {
      setBusy(false);
    }
  }

  if (mode === "reset") {
    return (
      <MentorSection title="کلید تازه برای گفت‌وگوها" icon={<KeyRound {...ICON_SEC} aria-hidden />}>
        <form className="mentor-form" onSubmit={askReset}>
          <p className="mentor-muted">
            با کلید تازه، پیام‌هایی که تا امروز رد و بدل شده روی هیچ دستگاهی خوانده نمی‌شوند؛ پیام‌های بعدی با رمز تازه باز می‌شوند.
            {hasBackup ? " اگر رمز قبلی را به یاد داری، به‌جای این کار همان را وارد کن." : ""}
          </p>
          <PasscodePair idPrefix="e2ee-reset" label="رمز گفت‌وگوی تازه" value={np} repeat={nr} onValue={(v) => { setNp(v); setNerrs((x) => ({ ...x, pass: null })); }} onRepeat={(v) => { setNr(v); setNerrs((x) => ({ ...x, repeat: null })); }} error={nerrs.pass} repeatError={nerrs.repeat} />
          {error && !confirm && <div className="form-inline-error" role="alert">{error}</div>}
          <div className="mentor-form-actions">
            {hasBackup && (
              <button type="button" className="account-outline-btn muted mentor-btn" onClick={() => { setMode("unlock"); setError(null); }} disabled={busy}>
                وارد کردن رمز قبلی
              </button>
            )}
            <button type="submit" className="trade-primary-btn mentor-btn" disabled={busy}>
              <KeyRound size={MI.btn} strokeWidth={MI_STROKE} aria-hidden /> ساخت کلید تازه
            </button>
          </div>
        </form>
        {confirm && (
          <MentorConfirmDialog
            message="کلید تازه ساخته شود؟"
            hint="پیام‌های قبلی این حساب دیگر روی هیچ دستگاهی خوانده نمی‌شوند."
            confirmLabel="ساخت کلید تازه"
            danger
            busy={busy}
            error={error}
            onConfirm={doReset}
            onCancel={() => { setConfirm(false); setError(null); }}
          />
        )}
      </MentorSection>
    );
  }

  return (
    <MentorSection title={UNLOCK_TITLE[context]} icon={<LockKeyhole {...ICON_SEC} aria-hidden />}>
      <form className="mentor-form" onSubmit={unlock}>
        <p className="mentor-muted">{UNLOCK_TEXT[context]}</p>
        <MentorField label="رمز گفت‌وگو" htmlFor="e2ee-unlock" error={passErr}>
          <input id="e2ee-unlock" type="password" className={FIELD} autoComplete="current-password" value={pass} onChange={(e) => { setPass(e.target.value); setPassErr(null); }} aria-invalid={!!passErr} />
        </MentorField>
        {error && <div className="form-inline-error" role="alert">{error}</div>}
        <div className="mentor-form-actions">
          <button type="button" className="account-outline-btn muted mentor-btn" onClick={() => { setMode("reset"); setError(null); }} disabled={busy}>
            رمز را فراموش کرده‌ام
          </button>
          <button type="submit" className="trade-primary-btn mentor-btn" disabled={busy}>
            {busy ? <Spinner size={14} /> : <><LockKeyhole size={MI.btn} strokeWidth={MI_STROKE} aria-hidden /> باز کردن</>}
          </button>
        </div>
      </form>
    </MentorSection>
  );
}
