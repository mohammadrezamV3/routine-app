"use client";

import "./mentor.css";
import { Fragment, useEffect, useState } from "react";
import { AlertTriangle, History, KeyRound } from "lucide-react";
import {
  WrongPasscodeError,
  approveHistoryLink,
  cancelHistoryLink,
  refreshIdentity,
  requestHistoryLink,
  skipLegacyPasscode,
  unlockLegacyPasscode,
  useE2EEIdentity,
  type E2EENotice,
  type Identity,
  type IdentityState,
  type LinkState,
} from "@/lib/e2ee/client";
import { faNum } from "@/lib/jalali";
import { tr } from "@/lib/i18n";
import { LoadingBlock, Spinner } from "./Spinner";
import { MentorConfirmDialog } from "./MentorConfirmDialog";

const FIELD = "wsearch-newform-name trade-glass-field";
const ICON = { size: 13, strokeWidth: 1.75 } as const;
type Ready = Extract<IdentityState, { status: "ready" }>;

export { useE2EEReady } from "@/lib/e2ee/client";

/**
 * راه‌انداز نامرئی گفت‌وگوی خصوصی (docs/mentor-e2ee.md). کاربر هیچ رمزی
 * نمی‌سازد و هیچ فرمی نمی‌بیند: کلید در پس‌زمینه ساخته/باز می‌شود و children با
 * کلید آماده رندر می‌شود. فقط در این حالت‌ها یک خط کوچک دیده می‌شود:
 *   • خطای واقعی (شبکه/سرور) — با «تلاش دوباره»
 *   • پشتیبان قدیمی «رمز گفت‌وگو» — یک بار آخر، سپس هرگز
 *   • دستگاهی که سابقه‌ی قبلی را ندارد — یک جمله، و برای حساب بی‌رمز «انتقال سابقه»
 *   • تایید انتقال سابقه روی دستگاه قدیمی (با کد کوتاه)
 */
export type GateContext = "chat" | "notes";

export function MentorE2EEGate({
  children,
}: {
  children: (identity: Identity, s: Ready) => React.ReactNode;
  context?: GateContext;
}) {
  const s = useE2EEIdentity();
  if (s.status === "loading") return <LoadingBlock />;
  if (s.status === "unsupported") {
    return (
      <p className="mentor-e2ee-line is-warn" role="status">
        <AlertTriangle {...ICON} aria-hidden />
        <span>{tr("برای گفت‌وگو، مرورگرت رو به‌روز کن", "Update your browser to use chat")}</span>
      </p>
    );
  }
  if (s.status === "error") {
    return (
      <p className="mentor-e2ee-line is-warn" role="alert">
        <AlertTriangle {...ICON} aria-hidden />
        <span>{s.message}</span>
        <button type="button" className="mentor-text-btn" onClick={() => refreshIdentity()}>{tr("تلاش دوباره", "Try again")}</button>
      </p>
    );
  }
  return (
    <>
      {s.notice && <NoticeLine notice={s.notice} link={s.link} />}
      {s.link?.role === "requester" && <RequesterLine link={s.link} />}
      {s.link?.role === "approver" && <ApproveDialog link={s.link} />}
      <Fragment key={s.epoch}>{children(s.identity, s)}</Fragment>
    </>
  );
}

function errMsg(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

function NoticeLine({ notice, link }: { notice: E2EENotice; link: LinkState | null }) {
  const [busy, setBusy] = useState(false);
  if (notice.kind === "legacy-passcode") return <LegacyPasscode version={notice.version} />;
  if (notice.kind === "history-relogin") {
    return (
      <p className="mentor-e2ee-line" role="status">
        <History {...ICON} aria-hidden />
        <span>{tr("پیام‌های قبلی بعد از ورود دوباره با رمز عبور، روی این دستگاه هم باز می‌شن", "Earlier messages will open on this device after you sign in again with your password")}</span>
      </p>
    );
  }
  if (link?.role === "requester" && link.status === "PENDING") return null;
  return (
    <p className="mentor-e2ee-line" role="status">
      <History {...ICON} aria-hidden />
      <span>{tr("پیام‌های قبلی روی یه دستگاه دیگه‌ته", "Your earlier messages are on another device")}</span>
      <button
        type="button"
        className="mentor-text-btn"
        disabled={busy}
        onClick={async () => { setBusy(true); try { await requestHistoryLink(); } finally { setBusy(false); } }}
      >
        {busy ? <Spinner size={12} /> : tr("آوردن پیام‌های قبلی", "Bring earlier messages")}
      </button>
    </p>
  );
}

function RequesterLine({ link }: { link: Extract<LinkState, { role: "requester" }> }) {
  // تا دستگاه قدیمی تایید کند، وضعیت هر چند ثانیه تازه می‌شود
  useEffect(() => {
    if (link.status !== "PENDING") return;
    const t = setInterval(() => { if (document.visibilityState === "visible") refreshIdentity(); }, 5000);
    return () => clearInterval(t);
  }, [link.status]);
  if (link.status === "DECLINED") {
    return (
      <p className="mentor-e2ee-line" role="status">
        <History {...ICON} aria-hidden />
        <span>{tr("آوردن پیام‌های قبلی روی دستگاه دیگه رد شد", "Bringing earlier messages was declined on the other device")}</span>
      </p>
    );
  }
  if (link.status !== "PENDING") return null;
  return (
    <p className="mentor-e2ee-line" role="status">
      <History {...ICON} aria-hidden />
      <span>
        {tr("روی دستگاه دیگه‌ات بخش مربی رو باز کن و این کد رو تایید کن: ", "On your other device, open the mentor section and confirm this code: ")}<b className="mono" dir="ltr">{faNum(link.code)}</b>
      </span>
      <button type="button" className="mentor-text-btn" onClick={() => cancelHistoryLink(link.id)}>{tr("لغو", "Cancel")}</button>
    </p>
  );
}

function ApproveDialog({ link }: { link: Extract<LinkState, { role: "approver" }> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moved, setMoved] = useState(0);
  return (
    <MentorConfirmDialog
      message={tr("آوردن پیام‌های قبلی به دستگاه تازه", "Bring earlier messages to the new device")}
      hint={tr(`کد روی ${link.deviceLabel || "دستگاه تازه"}: ${faNum(link.code)}. فقط اگه همین کد رو اون‌جا می‌بینی تایید کن.`, `Code on ${link.deviceLabel || "the new device"}: ${faNum(link.code)}. Only confirm if you see the same code there.`)}
      confirmLabel={busy ? (moved ? tr(`${faNum(moved)} مورد آورده شد`, `${faNum(moved)} brought over`) : tr("در حال آوردن", "Bringing over")) : tr("تایید", "Confirm")}
      danger={false}
      busy={busy}
      error={error}
      onConfirm={async () => {
        setBusy(true);
        setError(null);
        try {
          await approveHistoryLink(link, setMoved);
        } catch (e) {
          setError(errMsg(e, tr("انجام نشد؛ دوباره تلاش کن", "Something went wrong. Try again")));
        } finally {
          setBusy(false);
        }
      }}
      onCancel={() => { if (!busy) cancelHistoryLink(link.id); }}
    />
  );
}

/** پشتیبان قدیمی «رمز گفت‌وگو»: یک بار رمز قدیمی، بعد انتقال به روش تازه و دیگر هرگز */
function LegacyPasscode({ version }: { version: number }) {
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmSkip, setConfirmSkip] = useState(false);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!pass) { setError(tr("رمز قبلی پیام‌ها رو وارد کن", "Enter the old password for your messages")); return; }
    setBusy(true);
    setError(null);
    try {
      await unlockLegacyPasscode(pass);
    } catch (e2) {
      setError(e2 instanceof WrongPasscodeError ? e2.message : errMsg(e2, tr("باز نشد؛ دوباره تلاش کن", "Couldn't unlock. Try again")));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="mentor-e2ee-line mentor-e2ee-legacy" onSubmit={unlock}>
      <KeyRound {...ICON} aria-hidden />
      <span>
        {tr("پیام‌های قبلی با رمزی که قبلا برای اون‌ها ساخته بودی قفل‌ان. یه بار واردش کن تا باز بشن؛ بعدش دیگه رمز جداگانه‌ای لازم نیست.", "Your earlier messages are locked with a password you set for them before. Enter it once to open them; after that you won't need a separate password.")}
        <span className="mentor-e2ee-legacy-row">
          <input
            type="password"
            className={FIELD}
            autoComplete="off"
            aria-label={tr("رمز قبلی پیام‌ها", "Old messages password")}
            value={pass}
            onChange={(e) => { setPass(e.target.value); setError(null); }}
            aria-invalid={!!error}
          />
          <button type="submit" className="trade-primary-btn mentor-btn is-sm" disabled={busy}>
            {busy ? <Spinner size={14} /> : tr("باز کردن", "Unlock")}
          </button>
          <button type="button" className="account-outline-btn muted mentor-btn is-sm" disabled={busy} onClick={() => setConfirmSkip(true)}>
            {tr("بی‌خیال پیام‌های قبلی", "Skip earlier messages")}
          </button>
        </span>
        {error && <span className="mentor-field-error" role="alert">{error}</span>}
      </span>
      {confirmSkip && (
        <MentorConfirmDialog
          message={tr("بدون پیام‌های قبلی ادامه بدیم؟", "Continue without earlier messages?")}
          hint={tr("پیام‌های قبلی دیگه روی این حساب باز نمی‌شن.", "Earlier messages will no longer open on this account.")}
          confirmLabel={tr("ادامه", "Continue")}
          busy={busy}
          onConfirm={async () => {
            setBusy(true);
            try {
              await skipLegacyPasscode(version);
            } finally {
              setBusy(false);
              setConfirmSkip(false);
            }
          }}
          onCancel={() => setConfirmSkip(false)}
        />
      )}
    </form>
  );
}
