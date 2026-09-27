"use client";

import "./mentor.css";
import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { faNum } from "@/lib/jalali";
import {
  WrongPasscodeError,
  changePasscode,
  forgetThisDevice,
  passcodeProblem,
  refreshIdentity,
  resetIdentity,
  type Identity,
} from "@/lib/e2ee/client";
import { LockBodyScroll } from "./LockBodyScroll";
import { Spinner } from "./Spinner";
import { MentorConfirmDialog } from "./MentorConfirmDialog";
import { MentorField } from "./MentorUI";

const FIELD = "wsearch-newform-name trade-glass-field";

function errMsg(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

/**
 * جزئیات و مدیریتِ رمزگذاریِ سرتاسری: کدِ امنیتیِ همین گفت‌وگو (برای مقایسه با
 * طرفِ مقابل)، تغییرِ رمزِ گفت‌وگو، حذفِ کلید از این دستگاه، و ساختِ کلیدِ تازه.
 */
export function MentorE2EESettings({
  identity, persistent, peerName, safetyCode, onClose,
}: {
  identity: Identity;
  persistent: boolean;
  peerName?: string;
  safetyCode?: string | null;
  onClose: () => void;
}) {
  const [cur, setCur] = useState("");
  const [np, setNp] = useState("");
  const [nr, setNr] = useState("");
  const [errs, setErrs] = useState<{ cur: string | null; np: string | null; nr: string | null }>({ cur: null, np: null, nr: null });
  const [busy, setBusy] = useState<null | "change" | "forget" | "reset">(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState<null | "forget" | "reset">(null);

  async function submitChange(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setSaved(false);
    setError(null);
    const pErr = await passcodeProblem(np);
    const next = { cur: cur ? null : "رمز فعلی را وارد کن", np: pErr, nr: !pErr && np !== nr ? "تکرار رمز با رمز یکی نیست" : null };
    setErrs(next);
    if (next.cur || next.np || next.nr) return;
    setBusy("change");
    try {
      await changePasscode(identity, cur, np);
      setCur(""); setNp(""); setNr("");
      setSaved(true);
    } catch (e2) {
      if (e2 instanceof WrongPasscodeError) setErrs((x) => ({ ...x, cur: e2.message }));
      else setError(errMsg(e2, "رمز تغییر نکرد؛ دوباره تلاش کن"));
    } finally {
      setBusy(null);
    }
  }

  async function doForget() {
    setBusy("forget");
    try {
      await forgetThisDevice(identity.userId);
      onClose();
    } finally {
      setBusy(null);
    }
  }

  async function doReset() {
    const pErr = await passcodeProblem(np);
    if (pErr || np !== nr) {
      setConfirm(null);
      setErrs({ cur: null, np: pErr, nr: !pErr && np !== nr ? "تکرار رمز با رمز یکی نیست" : null });
      return;
    }
    setBusy("reset");
    setError(null);
    try {
      await resetIdentity(identity.userId, identity.version, np);
      onClose();
    } catch (e2) {
      setError(errMsg(e2, "کلید تازه ساخته نشد؛ دوباره تلاش کن"));
      await refreshIdentity();
    } finally {
      setBusy(null);
    }
  }

  if (typeof document === "undefined") return null;
  return createPortal(
    <>
      <LockBodyScroll />
      <div className="modal-overlay open" onClick={() => !busy && onClose()} style={{ zIndex: 90 }} />
      <div className="modal-panel open mentor-modal" role="dialog" aria-modal="true" aria-label="رمزگذاری سرتاسری" style={{ zIndex: 91, maxWidth: 460 }}>
        <div className="modal-head">
          <div className="modal-title">رمزگذاری سرتاسری</div>
          <button type="button" className="trade-icon-btn" onClick={onClose} aria-label="بستن" disabled={!!busy}>
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        <div className="mentor-form">
          {safetyCode && (
            <div className="mentor-e2ee-block">
              <div className="mentor-field-label">کد امنیتی این گفت‌وگو</div>
              <p className="mentor-e2ee-code" dir="ltr">{faNum(safetyCode)}</p>
              <p className="mentor-field-hint">
                اگر همین کد روی دستگاه {peerName || "طرف مقابل"} هم دیده می‌شود، پیام‌ها مستقیم بین شما دو نفر رمز شده‌اند. کد را حضوری یا از راه دیگری مقایسه کن.
              </p>
            </div>
          )}

          <form className="mentor-form mentor-e2ee-block" onSubmit={submitChange}>
            <div className="mentor-field-label">تغییر رمز گفت‌وگو</div>
            <MentorField label="رمز فعلی" htmlFor="e2ee-cur" error={errs.cur}>
              <input id="e2ee-cur" type="password" className={FIELD} autoComplete="current-password" value={cur} onChange={(e) => { setCur(e.target.value); setErrs((x) => ({ ...x, cur: null })); setSaved(false); }} />
            </MentorField>
            <div className="mentor-field-row">
              <MentorField label="رمز تازه" htmlFor="e2ee-new" error={errs.np} hint="حداقل 10 نویسه؛ با رمز حساب آریون یکی نباشد">
                <input id="e2ee-new" type="password" className={FIELD} autoComplete="new-password" value={np} onChange={(e) => { setNp(e.target.value); setErrs((x) => ({ ...x, np: null })); setSaved(false); }} />
              </MentorField>
              <MentorField label="تکرار رمز تازه" htmlFor="e2ee-new2" error={errs.nr}>
                <input id="e2ee-new2" type="password" className={FIELD} autoComplete="new-password" value={nr} onChange={(e) => { setNr(e.target.value); setErrs((x) => ({ ...x, nr: null })); setSaved(false); }} />
              </MentorField>
            </div>
            {error && !confirm && <div className="form-inline-error" role="alert">{error}</div>}
            <div className="mentor-form-actions">
              <button type="submit" className="trade-primary-btn mentor-btn" disabled={!!busy}>
                {busy === "change" ? <Spinner size={14} /> : saved ? "رمز تغییر کرد" : "تغییر رمز"}
              </button>
            </div>
          </form>

          <div className="mentor-e2ee-block">
            <p className="mentor-field-hint">
              {persistent
                ? "کلید این حساب روی همین مرورگر نگه داشته شده و با خروج از حساب پاک می‌شود."
                : "این مرورگر اجازه‌ی ذخیره‌ی کلید را نمی‌دهد؛ با بستن صفحه دوباره رمز گفت‌وگو لازم است."}
              {" "}کلید تازه فقط وقتی لازم است که رمز را فراموش کرده باشی؛ پیام‌های قبلی با آن خوانده نمی‌شوند و برای ساختش رمز تازه‌ی بالا به کار می‌رود.
            </p>
            <div className="mentor-btn-group">
              <button type="button" className="account-outline-btn muted mentor-btn is-sm" onClick={() => setConfirm("forget")} disabled={!!busy}>
                حذف از این دستگاه
              </button>
              <button type="button" className="trade-danger-btn mentor-btn is-sm" onClick={() => setConfirm("reset")} disabled={!!busy}>
                ساخت کلید تازه
              </button>
            </div>
          </div>
        </div>
      </div>

      {confirm === "forget" && (
        <MentorConfirmDialog
          message="کلید از این دستگاه حذف شود؟"
          hint="برای خواندن پیام‌ها روی این دستگاه دوباره رمز گفت‌وگو لازم است."
          confirmLabel="حذف از دستگاه"
          busy={busy === "forget"}
          onConfirm={doForget}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === "reset" && (
        <MentorConfirmDialog
          message="کلید تازه با رمز واردشده ساخته شود؟"
          hint="پیام‌های قبلی این حساب دیگر روی هیچ دستگاهی خوانده نمی‌شوند."
          confirmLabel="ساخت کلید تازه"
          danger
          busy={busy === "reset"}
          error={error}
          onConfirm={doReset}
          onCancel={() => { setConfirm(null); setError(null); }}
        />
      )}
    </>,
    document.body
  );
}
