"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2, Send, CheckCircle2 } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { formatDateTime } from "@/lib/adminFormat";

type TicketStatus = "OPEN" | "ANSWERED" | "CLOSED";
type Message = { id: string; body: string; fromAdmin: boolean; createdAt: string };
type TicketDetail = {
  id: string; subject: string; status: TicketStatus;
  user: { id: string; name: string | null; lastName: string | null; username: string | null; email: string | null; phone: string | null };
  messages: Message[];
};

const STATUS_BADGE: Record<TicketStatus, "amber" | "green" | "gray"> = { OPEN: "amber", ANSWERED: "green", CLOSED: "gray" };
const STATUS_LABEL: Record<TicketStatus, string> = { OPEN: "در انتظار پاسخ", ANSWERED: "پاسخ داده‌شده", CLOSED: "بسته‌شده" };

export default function AdminSupportTicketPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/support/${params.id}`);
    if (!res.ok) { setNotFound(true); return; }
    const data = await res.json();
    setTicket(data.ticket);
  }, [params.id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { threadEndRef.current?.scrollIntoView({ block: "end" }); }, [ticket?.messages.length]);

  async function send() {
    if (!reply.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/support/${params.id}/messages`, {
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

  async function closeTicket() {
    if (closing) return;
    setClosing(true);
    try {
      const res = await fetch(`/api/admin/support/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED" }),
      });
      if (res.ok) await load();
    } finally {
      setClosing(false);
    }
  }

  if (notFound) return <EmptyState message="تیکت پیدا نشد" />;
  if (!ticket) return <div className="admin-empty is-loading">در حال بارگذاری…</div>;

  const u = ticket.user;
  const userLabel = [u.name, u.lastName].filter(Boolean).join(" ") || u.username || u.email || u.phone || "کاربر";

  return (
    <section>
      <button type="button" className="admin-btn" style={{ marginBottom: 16 }} onClick={() => router.back()}>
        <ArrowRight size={14} /> بازگشت
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>{ticket.subject}</h1>
          <Link href={`/admin/users/${u.id}`} style={{ color: "var(--adm-accent)", fontSize: 12.5 }}>{userLabel}</Link>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className={`admin-badge ${STATUS_BADGE[ticket.status]}`}>{STATUS_LABEL[ticket.status]}</span>
          {ticket.status !== "CLOSED" && (
            <button type="button" className="admin-btn" onClick={closeTicket} disabled={closing}>
              {closing ? <Loader2 size={14} className="trade-spin" /> : <CheckCircle2 size={14} />} بستن تیکت
            </button>
          )}
        </div>
      </div>

      <div className="support-thread" style={{ marginTop: 18 }}>
        {ticket.messages.map((m) => (
          <div key={m.id} className={`support-msg${m.fromAdmin ? " mine" : " admin"}`}>
            {m.body}
            <span className="support-msg-time mono" dir="ltr">{formatDateTime(m.createdAt)}</span>
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
          maxLength={4000}
          placeholder="جواب رو بنویس…"
        />
        <button type="button" className="support-reply-send" onClick={send} disabled={!reply.trim() || sending} aria-label="ارسال">
          {sending ? <Loader2 size={17} className="trade-spin" /> : <Send size={17} />}
        </button>
      </div>
    </section>
  );
}
