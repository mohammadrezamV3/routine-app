import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import { useNetworkStatus } from "@/lib/useNetworkStatus";
import { SUPPORT_MESSAGE_MAX, SUPPORT_SUBJECT_MAX } from "@/lib/account-contract";
import { describeAccountError, useAccountApi } from "../api";
import { accountRoutePaths } from "../paths";
import { ErrorBox, PrimaryButton } from "../components/Ui";

const fieldStyle = { background: "var(--input-bg)", color: "var(--text)", border: "1px solid var(--surface-line)" } as const;

export default function SupportNew() {
  const api = useAccountApi();
  const navigate = useNavigate();
  const online = useNetworkStatus();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = subject.trim().length > 0 && message.trim().length > 0 && !busy && online;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSend) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.createTicket(subject.trim(), message.trim());
      navigate(accountRoutePaths.ticket(r.ticket.id), { replace: true });
    } catch (err) {
      setError(describeAccountError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <AppHeader title="تیکتِ جدید" showBack />
      <form onSubmit={submit} className="flex flex-col gap-3 px-4 pb-8 pt-4 font-vazir">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px]" style={{ color: "var(--muted)" }}>
            موضوع
          </span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={SUPPORT_SUBJECT_MAX}
            className="rounded-card px-3 text-[14px] outline-none"
            style={{ ...fieldStyle, minHeight: 46 }}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px]" style={{ color: "var(--muted)" }}>
            پیام
          </span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={SUPPORT_MESSAGE_MAX}
            rows={7}
            className="rounded-card px-3 py-2 text-[14px] leading-7 outline-none"
            style={fieldStyle}
          />
          <span className="text-[11px] tabular-nums" style={{ color: "var(--muted)" }}>
            {message.length}/{SUPPORT_MESSAGE_MAX}
          </span>
        </label>
        {error && <ErrorBox message={error} />}
        <PrimaryButton type="submit" disabled={!canSend}>
          {busy ? "در حال ارسال…" : online ? "ارسالِ تیکت" : "آفلاین — ارسال ممکن نیست"}
        </PrimaryButton>
      </form>
    </div>
  );
}
