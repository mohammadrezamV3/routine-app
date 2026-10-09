"use client";

import "./mentor.css";
import { useState } from "react";
import { ChevronDown, Lock } from "lucide-react";
import { faNum } from "@/lib/jalali";
import { tr } from "@/lib/i18n";
import { forgetThisDevice, removeDevice, useE2EEIdentity, type Identity } from "@/lib/e2ee/client";
import { MentorSheet } from "./MentorSheet";
import { MentorConfirmDialog } from "./MentorConfirmDialog";

/**
 * امنیت گفت‌وگو: کد تایید همین گفت‌وگو (برای مقایسه با طرف مقابل)،
 * دستگاه‌هایی که پیام‌ها برایشان رمز می‌شود، و حذف کلید از همین مرورگر.
 * هیچ رمزی ساخته یا خواسته نمی‌شود (docs/mentor-e2ee.md).
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
  const s = useE2EEIdentity();
  const devices = s.status === "ready" ? s.devices : [];
  const [busy, setBusy] = useState<null | "forget" | number>(null);
  const [confirm, setConfirm] = useState<null | "forget" | { version: number; label: string }>(null);
  const [error, setError] = useState<string | null>(null);
  const [more, setMore] = useState(false);

  async function doForget() {
    setBusy("forget");
    try {
      await forgetThisDevice(identity.userId);
      onClose();
    } finally {
      setBusy(null);
    }
  }

  async function doRemove(version: number) {
    setBusy(version);
    setError(null);
    try {
      await removeDevice(version);
      setConfirm(null);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : tr("حذف نشد؛ دوباره تلاش کن", "Couldn't remove it. Try again"));
    } finally {
      setBusy(null);
    }
  }

  const labelOf = (d: (typeof devices)[number]) =>
    d.version === identity.version ? tr("همین دستگاه", "This device") : d.kind === "SYNCED" ? tr("دستگاه‌هایی که با رمز عبور وارد می‌شن", "Devices you sign in to with your password") : d.deviceLabel || tr("دستگاه دیگر", "Another device");

  return (
    <>
      <MentorSheet open onClose={onClose} title={tr("امنیت گفت‌وگو", "Chat security")} dismissible={busy === null && !confirm}>
        <div className="mv2-ms-secure">
          <span className="mv2-ms-secure-lock" aria-hidden><Lock size={34} strokeWidth={1.75} /></span>
          <p className="mv2-ms-secure-title">{tr(`فقط تو و ${peerName || "طرف مقابل"} این پیام‌ها رو می‌بینید`, `Only you and ${peerName || "the other person"} can see these messages`)}</p>
          <p className="mv2-ms-secure-text">{tr("حتی آریون هم نمی‌تونه بخونه‌شون. لازم نیست کاری بکنی؛ همه‌چیز خودکاره.", "Not even Arion can read them. You don't need to do anything; it's all automatic.")}</p>
          <button type="button" className="mentor-text-btn mv2-ms-more" aria-expanded={more} aria-controls="mv2-ms-more-body" onClick={() => setMore((v) => !v)}>
            {tr("جزئیات بیشتر", "More details")} <ChevronDown size={16} strokeWidth={1.75} className={more ? "is-open" : ""} aria-hidden />
          </button>
        </div>
        {more && (
          <div id="mv2-ms-more-body" className="mentor-form">
            {safetyCode && (
              <div className="mentor-e2ee-block">
                <div className="mentor-field-label">{tr("کد تایید", "Verification code")}</div>
                <p className="mentor-e2ee-code" dir="ltr">{faNum(safetyCode)}</p>
                <p className="mentor-field-hint">
                  {tr(`اگه همین کد روی دستگاه ${peerName || "طرف مقابل"} هم دیده می‌شه، همه‌چیز درسته. کد رو حضوری یا از یه راه دیگه با هم مقایسه کنید.`, `If the same code shows on ${peerName || "the other person"}'s device, everything is fine. Compare the code in person or another way.`)}
                </p>
              </div>
            )}

            {devices.length > 0 && (
              <div className="mentor-e2ee-block">
                <div className="mentor-field-label">{tr("پیام‌های تو روی این دستگاه‌ها باز می‌شن", "Your messages open on these devices")}</div>
                <ul className="mentor-e2ee-devices">
                  {devices.map((d) => (
                    <li key={d.version}>
                      <span>{labelOf(d)}</span>
                      {d.kind === "DEVICE" && d.version !== identity.version && (
                        <button type="button" className="mentor-text-btn" disabled={busy !== null} onClick={() => setConfirm({ version: d.version, label: labelOf(d) })}>
                          {tr("حذف", "Remove")}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mentor-e2ee-block">
              <p className="mentor-field-hint">
                {persistent
                  ? identity.kind === "SYNCED"
                    ? tr("پیام‌های تو با رمز عبورت محافظت می‌شن و روی هر دستگاهی که با رمز وارد بشی خودکار باز می‌شن.", "Your messages are protected by your password and open automatically on any device you sign in to.")
                    : tr("پیام‌های تو فقط روی همین مرورگر باز می‌شن؛ با خروج از حساب پاک نمی‌شن تا سابقه‌ی گفت‌وگو همین‌جا بمونه.", "Your messages only open in this browser. They aren't removed when you sign out, so your chat history stays here.")
                  : tr("این مرورگر اجازه‌ی نگه‌داشتن اطلاعات رو نمی‌ده؛ با بستن صفحه، گفت‌وگو دوباره از اول آماده می‌شه.", "This browser doesn't allow saving data. When you close the page, chat will be set up again from scratch.")}
              </p>
              <div className="mentor-btn-group">
                <button type="button" className="account-outline-btn muted mentor-btn is-sm" onClick={() => setConfirm("forget")} disabled={busy !== null}>
                  {tr("پاک کردن از این دستگاه", "Remove from this device")}
                </button>
              </div>
            </div>
          </div>
        )}
      </MentorSheet>

      {confirm === "forget" && (
        <MentorConfirmDialog
          message={tr("گفت‌وگوها از این دستگاه پاک بشن؟", "Remove chats from this device?")}
          hint={identity.kind === "SYNCED" ? tr("با ورود دوباره با رمز عبور، همه‌چیز دوباره باز می‌شه.", "Everything will open again when you sign in with your password.") : tr("پیام‌هایی که فقط روی این دستگاه بودن، دیگه این‌جا باز نمی‌شن.", "Messages that were only on this device will no longer open here.")}
          confirmLabel={tr("پاک کردن", "Remove")}
          busy={busy === "forget"}
          onConfirm={doForget}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm && confirm !== "forget" && (
        <MentorConfirmDialog
          message={tr(`«${confirm.label}» حذف بشه؟`, `Remove "${confirm.label}"?`)}
          hint={tr("پیام‌های بعدی دیگه روی اون دستگاه باز نمی‌شن.", "New messages will no longer open on that device.")}
          confirmLabel={tr("حذف دستگاه", "Remove device")}
          busy={busy === confirm.version}
          error={error}
          onConfirm={() => doRemove(confirm.version)}
          onCancel={() => { setConfirm(null); setError(null); }}
        />
      )}
    </>
  );
}
