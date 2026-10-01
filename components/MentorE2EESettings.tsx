"use client";

import "./mentor.css";
import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { faNum } from "@/lib/jalali";
import { forgetThisDevice, removeDevice, useE2EEIdentity, type Identity } from "@/lib/e2ee/client";
import { LockBodyScroll } from "./LockBodyScroll";
import { MentorConfirmDialog } from "./MentorConfirmDialog";

/**
 * جزئیات رمزگذاری سرتاسری: کد امنیتی همین گفت‌وگو (برای مقایسه با طرف مقابل)،
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
    d.version === identity.version ? "همین دستگاه" : d.kind === "SYNCED" ? "دستگاه‌هایی که با رمز عبور وارد می‌شوند" : d.deviceLabel || "دستگاه دیگر";

  if (typeof document === "undefined") return null;
  return createPortal(
    <>
      <LockBodyScroll />
      <div className="modal-overlay open" onClick={() => busy === null && onClose()} style={{ zIndex: 90 }} />
      <div className="modal-panel open mentor-modal" role="dialog" aria-modal="true" aria-label="رمزگذاری سرتاسری" style={{ zIndex: 91, maxWidth: 460 }}>
        <div className="modal-head">
          <div className="modal-title">رمزگذاری سرتاسری</div>
          <button type="button" className="trade-icon-btn" onClick={onClose} aria-label="بستن" disabled={busy !== null}>
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        <div className="mentor-form">
          {safetyCode && (
            <div className="mentor-e2ee-block">
              <div className="mentor-field-label">کد امنیتی این گفت‌وگو</div>
              <p className="mentor-e2ee-code" dir="ltr">{faNum(safetyCode)}</p>
              <p className="mentor-field-hint">
                اگر همین کد روی دستگاه {peerName || "طرف مقابل"} هم دیده می‌شود، پیام‌ها فقط برای دستگاه‌های شما دو نفر رمز شده‌اند. کد را حضوری یا از راه دیگری مقایسه کن.
              </p>
            </div>
          )}

          {devices.length > 0 && (
            <div className="mentor-e2ee-block">
              <div className="mentor-field-label">پیام‌های تو برای این دستگاه‌ها رمز می‌شوند</div>
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
                  ? "کلید این حساب با رمز عبورت محافظت می‌شود و روی هر دستگاهی که با رمز وارد شوی خودکار باز می‌شود."
                  : "کلید این دستگاه فقط روی همین مرورگر است؛ با خروج از حساب پاک نمی‌شود تا سابقه‌ی گفت‌وگو این‌جا بماند."
                : "این مرورگر اجازه‌ی ذخیره‌ی کلید را نمی‌دهد؛ با بستن صفحه کلید تازه‌ای ساخته می‌شود."}
            </p>
            <div className="mentor-btn-group">
              <button type="button" className="account-outline-btn muted mentor-btn is-sm" onClick={() => setConfirm("forget")} disabled={busy !== null}>
                حذف از این دستگاه
              </button>
            </div>
          </div>
        </div>
      </div>

      {confirm === "forget" && (
        <MentorConfirmDialog
          message="کلیدها از این دستگاه حذف شوند؟"
          hint={identity.kind === "SYNCED" ? "با ورود دوباره با رمز عبور، همه‌چیز دوباره باز می‌شود." : "پیام‌هایی که فقط روی این دستگاه بودند دیگر این‌جا خوانده نمی‌شوند."}
          confirmLabel="حذف از دستگاه"
          busy={busy === "forget"}
          onConfirm={doForget}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm && confirm !== "forget" && (
        <MentorConfirmDialog
          message={`«${confirm.label}» حذف شود؟`}
          hint="پیام‌های بعدی دیگر برای آن دستگاه رمز نمی‌شوند."
          confirmLabel="حذف دستگاه"
          busy={busy === confirm.version}
          error={error}
          onConfirm={() => doRemove(confirm.version)}
          onCancel={() => { setConfirm(null); setError(null); }}
        />
      )}
    </>,
    document.body
  );
}
