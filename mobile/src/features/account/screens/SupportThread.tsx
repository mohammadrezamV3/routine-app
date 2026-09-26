import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { Send } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { useNetworkStatus } from "@/lib/useNetworkStatus";
import { SUPPORT_MESSAGE_MAX, type MobileTicketDetailResponse } from "@/lib/account-contract";
import { describeAccountError, useAccountApi } from "../api";
import { formatIsoJalali, TICKET_STATUS_LABELS } from "../logic";
import { ErrorBox, Loading } from "../components/Ui";

type Ticket = MobileTicketDetailResponse["ticket"];

export default function SupportThread() {
  const { id = "" } = useParams();
  const api = useAccountApi();
  const online = useNetworkStatus();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api.getTicket(id).then((r) => setTicket(r.ticket), (e) => setError(describeAccountError(e)));
  }, [api, id]);

  useEffect(() => {
    if (online) load();
  }, [online, load]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending || !ticket) return;
    setSending(true);
    setSendError(null);
    try {
      const r = await api.replyTicket(ticket.id, text);
      setTicket({ ...ticket, status: r.status, messages: [...ticket.messages, r.message] });
      setDraft("");
    } catch (err) {
      setSendError(describeAccountError(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader title={ticket?.subject ?? "تیکت"} showBack />
      <main className="flex-1 px-4 pb-4 pt-3 font-vazir">
        {error && <ErrorBox message={error} onRetry={load} />}
        {!ticket && !error && <Loading />}
        {ticket && (
          <>
            <p className="pb-3 text-[12px]" style={{ color: "var(--muted)" }}>
              وضعیت: {TICKET_STATUS_LABELS[ticket.status]}
            </p>
            <ol className="flex flex-col gap-2.5" aria-live="polite">
              {ticket.messages.map((m) => (
                <li
                  key={m.id}
                  className="max-w-[85%] rounded-card border px-3 py-2"
                  style={{
                    alignSelf: m.fromAdmin ? "flex-end" : "flex-start",
                    borderColor: m.fromAdmin ? "var(--accent)" : "var(--surface-line)",
                  }}
                >
                  <div className="text-[11.5px] font-semibold" style={{ color: m.fromAdmin ? "var(--accent)" : "var(--muted)" }}>
                    {m.fromAdmin ? "پشتیبانی" : "شما"}
                  </div>
                  <p className="whitespace-pre-wrap break-words text-[13.5px] leading-7" style={{ color: "var(--text)" }}>
                    {m.body}
                  </p>
                  <div className="text-[10.5px] tabular-nums" style={{ color: "var(--muted)" }}>
                    {formatIsoJalali(m.createdAt)}
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </main>
      {ticket && (
        <form
          onSubmit={send}
          className="sticky bottom-0 flex items-end gap-2 border-t px-4 pt-2"
          style={{ borderColor: "var(--surface-line)", background: "var(--surface-1)", paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}
        >
          <div className="flex-1">
            {sendError && (
              <p className="pb-1 font-vazir text-[12px]" style={{ color: "var(--pnl-loss)" }}>
                {sendError}
              </p>
            )}
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={SUPPORT_MESSAGE_MAX}
              rows={2}
              placeholder={ticket.status === "CLOSED" ? "پیامِ تازه تیکت را دوباره باز می‌کند" : "پیامت را بنویس…"}
              aria-label="متنِ پیام"
              className="w-full rounded-card px-3 py-2 font-vazir text-[14px] leading-6 outline-none"
              style={{ background: "var(--input-bg)", color: "var(--text)", border: "1px solid var(--surface-line)" }}
            />
          </div>
          <button
            type="submit"
            disabled={!draft.trim() || sending || !online}
            aria-label="ارسال"
            className="mb-1 flex items-center justify-center"
            style={{ width: 44, height: 44, opacity: !draft.trim() || sending || !online ? 0.4 : 1 }}
          >
            <Send size={20} color="var(--accent)" style={{ transform: "scaleX(-1)" }} />
          </button>
        </form>
      )}
    </div>
  );
}
