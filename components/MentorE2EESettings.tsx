"use client";

import "./mentor.css";
import { useState } from "react";
import { ChevronDown, Lock } from "lucide-react";
import { faNum } from "@/lib/jalali";
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
      setError(e instanceof Error && e.message ? e.message : "حذف نشد؛ دوباره تلاش کن");
    } finally {
      setBusy(null);
    }
  }

  const labelOf = (d: (typeof devices)[number]) =>
    d.version === identity.version ? "همین دستگاه" : d.kind === "SYNCED" ? "دستگاه‌هایی که با رمز عبور وارد می‌شن" : d.deviceLabel || "دستگاه دیگر";

  return (
    <>
      <MentorSheet open onClose={onClose} title="امنیت گفت‌وگو" dismissible={busy === null && !confirm}>
        <div className="mv2-ms-secure">
          <span className="mv2-ms-secure-lock" aria-hidden><Lock size={34} strokeWidth={1.75} /></span>
          <p className="mv2-ms-secure-title">فقط تو و {peerName || "طرف مقابل"} این پیام‌ها رو می‌بینید</p>
          <p className="mv2-ms-secure-text">حتی آریون هم نمی‌تونه بخونه‌شون. لازم نیست کاری بکنی؛ همه‌چیز خودکاره.</p>
          <button type="button" className="mentor-text-btn mv2-ms-more" aria-expanded={more} aria-controls="mv2-ms-more-body" onClick={() => setMore((v) => !v)}>
            جزئیات بیشتر <ChevronDown size={16} strokeWidth={1.75} className={more ? "is-open" : ""} aria-hidden />
          </button>
        </div>
        {more && (
          <div id="mv2-ms-more-body" className="mentor-form">
            {safetyCode && (
              <div className="mentor-e2ee-block">
                <div className="mentor-field-label">کد تایید</div>
                <p className="mentor-e2ee-code" dir="ltr">{faNum(safetyCode)}</p>
                <p className="mentor-field-hint">
                  اگه همین کد روی دستگاه {peerName || "طرف مقابل"} هم دیده می‌شه، همه‌چیز درسته. کد رو حضوری یا از یه راه دیگه با هم مقایسه کنید.
                </p>
              </div>
            )}

            {devices.length > 0 && (
              <div className="mentor-e2ee-block">
                <div className="mentor-field-label">پیام‌های تو روی این دستگاه‌ها باز می‌شن</div>
                <ul className="mentor-e2ee-devices">
                  {devices.map((d) => (
                    <li key={d.version}>
                      <span>{labelOf(d)}</span>
                      {d.kind === "DEVICE" && d.version !== identity.version && (
                        <button type="button" className="mentor-text-btn" disabled={busy !== null} onClick={() => setConfirm({ version: d.version, label: labelOf(d) })}>
                          حذف
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
                    ? "پیام‌های تو با رمز عبورت محافظت می‌شن و روی هر دستگاهی که با رمز وارد بشی خودکار باز می‌شن."
                    : "پیام‌های تو فقط روی همین مرورگر باز می‌شن؛ با خروج از حساب پاک نمی‌شن تا سابقه‌ی گفت‌وگو همین‌جا بمونه."
                  : "این مرورگر اجازه‌ی نگه‌داشتن اطلاعات رو نمی‌ده؛ با بستن صفحه، گفت‌وگو دوباره از اول آماده می‌شه."}
              </p>
              <div className="mentor-btn-group">
                <button type="button" className="account-outline-btn muted mentor-btn is-sm" onClick={() => setConfirm("forget")} disabled={busy !== null}>
                  پاک کردن از این دستگاه
                </button>
              </div>
            </div>
          </div>
        )}
      </MentorSheet>

      {confirm === "forget" && (
        <MentorConfirmDialog
          message="گفت‌وگوها از این دستگاه پاک بشن؟"
          hint={identity.kind === "SYNCED" ? "با ورود دوباره با رمز عبور، همه‌چیز دوباره باز می‌شه." : "پیام‌هایی که فقط روی این دستگاه بودن، دیگه این‌جا باز نمی‌شن."}
          confirmLabel="پاک کردن"
          busy={busy === "forget"}
          onConfirm={doForget}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm && confirm !== "forget" && (
        <MentorConfirmDialog
          message={`«${confirm.label}» حذف بشه؟`}
          hint="پیام‌های بعدی دیگه روی اون دستگاه باز نمی‌شن."
          confirmLabel="حذف دستگاه"
          busy={busy === confirm.version}
          error={error}
          onConfirm={() => doRemove(confirm.version)}
          onCancel={() => { setConfirm(null); setError(null); }}
        />
      )}
    </>
  );
}
