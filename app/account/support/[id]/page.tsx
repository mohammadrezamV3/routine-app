"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { AccountBackButton } from "@/components/AccountBackButton";
import { PanelSkeleton } from "@/components/PanelSkeleton";
import { toJalali, faNum, J_MONTHS } from "@/lib/jalali";

type TicketStatus = "OPEN" | "ANSWERED" | "CLOSED";
type Message = { id: string; body: string; fromAdmin: boolean; createdAt: string };
type TicketDetail = { id: string; subject: string; status: TicketStatus; messages: Message[] };

const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "در انتظار پاسخ", ANSWERED: "پاسخ داده شد", CLOSED: "بسته‌شده",
};
const STATUS_CLASS: Record<TicketStatus, string> = { OPEN: "open", ANSWERED: "answered", CLOSED: "closed" };

function formatMsgTime(iso: string): string {
  const d = new Date(iso);
  const [jy, jm, jd] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const hh = faNum(String(d.getHours()).padStart(2, "0"));
  const mm = faNum(String(d.getMinutes()).padStart(2, "0"));
  return `${faNum(jd)} ${J_MONTHS[jm - 1]}، ${hh}:${mm}`;
}

export default function SupportTicketPage() {
  const params = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/support/tickets/${params.id}`);
    if (!res.ok) { setNotFound(true); return; }
    const data = await res.json();
    setTicket(data.ticket);
  }, [params.id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: "end" });
  }, [ticket?.messages.length]);

  async function send() {
    if (!reply.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/support/tickets/${params.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError(data?.error || "ارسال پیام ناموفق بود"); return; }
      setReply("");
      await load();
    } catch {
      setError("ارتباط با سرور برقرار نشد");
    } finally {
      setSending(false);
    }
  }

  if (notFound) {
    return (
      <section>
        <div className="acc-head"><AccountBackButton /><h1>تیکت پیدا نشد</h1></div>
      </section>
    );
  }

  if (!ticket) return <PanelSkeleton />;

  return (
    <section>
      <div className="acc-head">
        <AccountBackButton />
        <div className="support-head-row">
          <h1>{ticket.subject}</h1>
          <span className={`support-status ${STATUS_CLASS[ticket.status]}`}>{STATUS_LABEL[ticket.status]}</span>
        </div>
      </div>

      <div className="support-thread">
        {ticket.messages.map((m) => (
          <div key={m.id} className={`support-msg${m.fromAdmin ? " admin" : " mine"}`}>
            {m.body}
            <span className="support-msg-time mono" dir="ltr">{formatMsgTime(m.createdAt)}</span>
          </div>
        ))}
        <div ref={threadEndRef} />
      </div>

      {error && <div className="trade-form-error">{error}</div>}

      <div className="support-reply-row">
        <textarea
          className="wsearch-newform-name trade-glass-field"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }}
          maxLength={4000}
          placeholder="پیامت رو بنویس…"
        />
        <button type="button" className="support-reply-send" onClick={send} disabled={!reply.trim() || sending} aria-label="ارسال">
          {sending ? <Loader2 size={17} className="trade-spin" /> : <Send size={17} />}
        </button>
      </div>
    </section>
  );
}
