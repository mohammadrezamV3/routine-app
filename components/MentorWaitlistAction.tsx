"use client";

import { tr } from "@/lib/i18n";
import { useState } from "react";
import { Hourglass, ListPlus, LogOut, PartyPopper, Send, TimerOff, X } from "lucide-react";
import { MentorChip } from "./MentorUI";
import { MentorConfirmDialog } from "./MentorConfirmDialog";
import { MentorTermsAcceptance, isMentorTermsError, mentorTermsPayload, useMentorTermsStatus } from "./MentorTermsAcceptance";
import { Spinner } from "./Spinner";
import { networkError, readApiError } from "@/lib/mentorFormat";
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
    if (needTerms && !termsAccepted) { setTermsError(tr("برای ورود به صف، شرایط را بپذیر", "Accept the terms to join the waitlist")); return; }
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
        setError(typeof j?.error === "string" ? j.error : networkError());
        return;
      }
      if (!res.ok) {
        setError(await readApiError(res, tr("ورود به صف انجام نشد؛ دوباره تلاش کن", "Could not join the waitlist. Try again.")));
        if (res.status === 409 || res.status === 404) onStale();
        return;
      }
      const d = await res.json().catch(() => null);
      onChange(d?.waitlist ?? null);
    } catch {
      setError(networkError());
    } finally {
      setBusy(null);
    }
  }

  async function leave() {
    setBusy("leave");
    setError(null);
    try {
      const res = await fetch(`/api/mentors/${mentorId}/waitlist`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) { setError(await readApiError(res, tr("انجام نشد؛ دوباره تلاش کن", "Something went wrong. Try again."))); return; }
      setConfirmLeave(false);
      onChange(null);
      onStale();
    } catch {
      setError(networkError());
    } finally {
      setBusy(null);
    }
  }

  let body: React.ReactNode;
  if (waitlist?.status === "OFFERED" && waitlist.offerExpiresAt) {
    body = (
      <>
        <MentorChip tone="ok" icon={<PartyPopper {...CHIP} />} title={tr(`یه جا پیش ${mentorName} برات نگه داشته شده`, `A spot with ${mentorName} is being held for you`)}>
          {tr("نوبتت رسید", "It is your turn")} · {offerRemainingLabel(waitlist.offerExpiresAt)}
        </MentorChip>
        <div className="mentor-btn-group" style={{ width: "100%" }}>
          <button type="button" className="account-outline-btn muted mentor-btn" onClick={() => { setError(null); setConfirmLeave(true); }} disabled={!!busy}>
            <X {...BTN} /> {tr("رد نوبت", "Decline turn")}
          </button>
          <button type="button" className="trade-primary-btn mentor-btn" onClick={onRequest} disabled={!!busy}>
            <Send {...BTN} className="dir-flip" /> {tr("ارسال درخواست", "Send request")}
          </button>
        </div>
      </>
    );
  } else if (waitlist?.status === "WAITING") {
    body = (
      <>
        <MentorChip tone="info" icon={<Hourglass {...CHIP} />} title={tr("وقتی جا خالی بشه خبرت می‌کنیم", "We will let you know when a spot opens")}>
          {waitlist.position ? positionLabel(waitlist.position) : tr("توی صفی", "You are in line")}
        </MentorChip>
        <button type="button" className="account-outline-btn muted mentor-btn is-sm" onClick={() => { setError(null); setConfirmLeave(true); }} disabled={!!busy}>
          <LogOut {...BTN_SM} /> {tr("خروج از صف", "Leave waitlist")}
        </button>
      </>
    );
  } else {
    body = (
      <>
        {waitlist?.status === "EXPIRED" ? (
          <MentorChip tone="neutral" icon={<TimerOff {...CHIP} />}>{tr("مهلت نوبتت تموم شد", "Your time is up")}</MentorChip>
        ) : (
          <MentorChip tone="neutral" icon={<Hourglass {...CHIP} />}>
            {waitlistCount > 0 ? tr(`ظرفیت تکمیل · ${faNum(waitlistCount)} نفر در صف`, `Full · ${faNum(waitlistCount)} in line`) : tr("ظرفیت تکمیل", "Full")}
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
          {busy === "join" ? <Spinner size={14} /> : <><ListPlus {...BTN} /> {tr("ورود به صف", "Join waitlist")}</>}
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
          message={offered ? tr("نوبتت رو رد می‌کنی؟", "Decline your turn?") : tr("از صف بیرون میای؟", "Leave the waitlist?")}
          hint={offered ? tr("جا به نفر بعدی صف می‌رسه.", "The spot goes to the next person in line.") : tr("اگه دوباره بیای، از ته صف شروع می‌کنی.", "If you come back, you start at the end of the line.")}
          confirmLabel={offered ? tr("رد نوبت", "Decline turn") : tr("خروج از صف", "Leave")}
          busy={busy === "leave"}
          error={error}
          onConfirm={leave}
          onCancel={() => { setConfirmLeave(false); setError(null); }}
        />
      )}
    </>
  );
}
