"use client";

import { useState } from "react";
import { Hourglass, ListPlus, LogOut, PartyPopper, Send, TimerOff, X } from "lucide-react";
import { MentorChip } from "./MentorUI";
import { MentorConfirmDialog } from "./MentorConfirmDialog";
import { MentorTermsAcceptance, isMentorTermsError, mentorTermsPayload, useMentorTermsStatus } from "./MentorTermsAcceptance";
import { Spinner } from "./Spinner";
import { NETWORK_ERROR, readApiError } from "@/lib/mentorFormat";
import { faNum } from "@/lib/jalali";
import { offerRemainingLabel, positionLabel } from "@/lib/mentorWaitlist";
import type { MyWaitlist } from "@/lib/mentorTypes";

const CHIP = { size: 13, strokeWidth: 1.75, "aria-hidden": true } as const;
const BTN = { size: 15, strokeWidth: 1.75, "aria-hidden": true } as const;
const BTN_SM = { size: 14, strokeWidth: 1.75, "aria-hidden": true } as const;

/**
 * صف انتظار روی پروفایل مربی پر (lib/mentorWaitlist.ts):
 *   بیرون صف → «ورود به صف» (با پذیرش شرایط اگر لازم باشد)
 *   WAITING   → «نفر N در صف» + «خروج از صف»
 *   OFFERED   → «نوبتت رسید» + «ارسال درخواست» (همان فرم درخواست عادی) / «رد نوبت»
 * فقط کلاس‌های دکمه‌ی خود سایت؛ بدون بک‌گراند تازه.
 */
export function MentorWaitlistAction({
  mentorId, mentorName, waitlist, waitlistCount, onChange, onRequest, onStale,
}: {
  mentorId: string;
  mentorName: string;
  waitlist: MyWaitlist | null;
  waitlistCount: number;
  onChange: (w: MyWaitlist | null) => void;
  /** باز کردن فرم درخواست عادی (پذیرش نوبت) */
  onRequest: () => void;
  onStale: () => void;
}) {
  const [busy, setBusy] = useState<"join" | "leave" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const terms = useMentorTermsStatus();
  const joining = !waitlist || waitlist.status === "EXPIRED";
  const needTerms = joining && !terms.loading && !terms.studentAccepted;
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);

  async function join() {
    if (needTerms && !termsAccepted) { setTermsError("برای ورود به صف، شرایط را بپذیر"); return; }
    setBusy("join");
    setError(null);
    try {
      const res = await fetch(`/api/mentors/${mentorId}/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mentorTermsPayload(needTerms && termsAccepted)),
      });
      if (res.status === 400) {
        const j = await res.json().catch(() => null);
        if (isMentorTermsError(j)) { setTermsAccepted(false); setTermsError(j.error); terms.refresh(); return; }
        setError(typeof j?.error === "string" ? j.error : NETWORK_ERROR);
        return;
      }
      if (!res.ok) {
        setError(await readApiError(res, "ورود به صف انجام نشد؛ دوباره تلاش کن"));
        if (res.status === 409 || res.status === 404) onStale();
        return;
      }
      const d = await res.json().catch(() => null);
      onChange(d?.waitlist ?? null);
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(null);
    }
  }

  async function leave() {
    setBusy("leave");
    setError(null);
    try {
      const res = await fetch(`/api/mentors/${mentorId}/waitlist`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) { setError(await readApiError(res, "انجام نشد؛ دوباره تلاش کن")); return; }
      setConfirmLeave(false);
      onChange(null);
      onStale();
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(null);
    }
  }

  let body: React.ReactNode;
  if (waitlist?.status === "OFFERED" && waitlist.offerExpiresAt) {
    body = (
      <>
        <MentorChip tone="ok" icon={<PartyPopper {...CHIP} />} title={`یه جا پیش ${mentorName} برات نگه داشته شده`}>
          نوبتت رسید · {offerRemainingLabel(waitlist.offerExpiresAt)}
        </MentorChip>
        <div className="mentor-btn-group" style={{ width: "100%" }}>
          <button type="button" className="account-outline-btn muted mentor-btn" onClick={() => { setError(null); setConfirmLeave(true); }} disabled={!!busy}>
            <X {...BTN} /> رد نوبت
          </button>
          <button type="button" className="trade-primary-btn mentor-btn" onClick={onRequest} disabled={!!busy}>
            <Send {...BTN} /> ارسال درخواست
          </button>
        </div>
      </>
    );
  } else if (waitlist?.status === "WAITING") {
    body = (
      <>
        <MentorChip tone="info" icon={<Hourglass {...CHIP} />} title="وقتی جا خالی بشه خبرت می‌کنیم">
          {waitlist.position ? positionLabel(waitlist.position) : "توی صفی"}
        </MentorChip>
        <button type="button" className="account-outline-btn muted mentor-btn is-sm" onClick={() => { setError(null); setConfirmLeave(true); }} disabled={!!busy}>
          <LogOut {...BTN_SM} /> خروج از صف
        </button>
      </>
    );
  } else {
    body = (
      <>
        {waitlist?.status === "EXPIRED" ? (
          <MentorChip tone="neutral" icon={<TimerOff {...CHIP} />}>مهلت نوبتت تموم شد</MentorChip>
        ) : (
          <MentorChip tone="neutral" icon={<Hourglass {...CHIP} />}>
            {waitlistCount > 0 ? `ظرفیت تکمیل · ${faNum(waitlistCount)} نفر در صف` : "ظرفیت تکمیل"}
          </MentorChip>
        )}
        {needTerms && (
          <div style={{ width: "100%" }}>
            <MentorTermsAcceptance
              role="student"
              checked={termsAccepted}
              onChange={(v) => { setTermsAccepted(v); setTermsError(null); }}
              error={termsError}
              disabled={!!busy}
            />
          </div>
        )}
        <button type="button" className="trade-primary-btn mentor-btn" onClick={join} disabled={!!busy || terms.loading}>
          {busy === "join" ? <Spinner size={14} /> : <><ListPlus {...BTN} /> ورود به صف</>}
        </button>
      </>
    );
  }

  const offered = waitlist?.status === "OFFERED";
  return (
    <>
      {error && !confirmLeave && <div className="form-inline-error" role="alert">{error}</div>}
      <div className="mentor-hero-actions">{body}</div>
      {confirmLeave && (
        <MentorConfirmDialog
          message={offered ? "نوبتت رو رد می‌کنی؟" : "از صف بیرون میای؟"}
          hint={offered ? "جا به نفر بعدی صف می‌رسه." : "اگه دوباره بیای، از ته صف شروع می‌کنی."}
          confirmLabel={offered ? "رد نوبت" : "خروج از صف"}
          busy={busy === "leave"}
          error={error}
          onConfirm={leave}
          onCancel={() => { setConfirmLeave(false); setError(null); }}
        />
      )}
    </>
  );
}
