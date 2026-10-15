"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Send, CheckCircle2 } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/admin/EmptyState";
import { ConfirmModal } from "@/components/admin/AdminModal";
import { useAdminAccess } from "@/components/admin/AdminAccess";
import { useAdminToast } from "@/components/admin/useAdminToast";
import { formatDateTime } from "@/lib/adminFormat";
import { Spinner } from "@/components/Spinner";
import { tr } from "@/lib/i18n";

type TicketStatus = "OPEN" | "ANSWERED" | "CLOSED";
type Message = { id: string; body: string; fromAdmin: boolean; createdAt: string };
type TicketDetail = {
  id: string; subject: string; status: TicketStatus;
  user: { id: string; name: string | null; lastName: string | null; username: string | null; email: string | null; phone: string | null };
  messages: Message[];
};

const STATUS_BADGE: Record<TicketStatus, "amber" | "green" | "gray"> = { OPEN: "amber", ANSWERED: "green", CLOSED: "gray" };
const statusLabels = (): Record<TicketStatus, string> => ({
  OPEN: tr("در انتظار پاسخ", "Awaiting reply"),
  ANSWERED: tr("پاسخ داده‌شده", "Answered"),
  CLOSED: tr("بسته‌شده", "Closed"),
});
const MAX_REPLY = 4000;

export default function AdminSupportTicketPage() {
  const params = useParams<{ id: string }>();
  const toast = useAdminToast();
  const { can } = useAdminAccess();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ok" | "notfound" | "error">("loading");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  // state برای جلوگیری از دوبار ارسال کافی نیست — دو Enter پشت‌سرهم قبل
  // از رندر بعدی هر دو `sending=false` رو می‌بینن.
  const sendingRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/support/${params.id}`);
      if (res.status === 404) { setLoadState("notfound"); return; }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTicket(data.ticket);
      setLoadState("ok");
    } catch {
      // اگه قبلا تیکت لود شده بود، خطای رفرش بعدی نباید کل صفحه رو خالی کنه.
      setLoadState((s) => (s === "ok" ? s : "error"));
    }
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  // خود ترد اسکرول می‌خوره (نه کل صفحه با scrollIntoView) تا با هر پیام
  // جدید، هدر و دکمه‌ها از دید خارج نشن.
  useLayoutEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [ticket?.messages.length]);

  async function send() {
    const body = reply.trim();
    if (!body || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/support/${params.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: body }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError(data?.error || tr("ارسال پیام ناموفق بود", "Couldn't send the message")); return; }
      setReply("");
      await load();
    } catch {
      setError(tr("ارتباط با سرور برقرار نشد", "Couldn't reach the server"));
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  async function closeTicket() {
    try {
      const res = await fetch(`/api/admin/support/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { toast(data?.error || tr("بستن تیکت ناموفق بود", "Couldn't close the ticket"), "err"); return; }
      toast(tr("تیکت بسته شد", "Ticket closed"));
      setConfirmClose(false);
      await load();
    } catch {
      toast(tr("ارتباط با سرور برقرار نشد", "Couldn't reach the server"), "err");
    }
  }

  const back = (
    <Link href="/admin/support" className="admin-btn sm admin-back-btn">
      <ArrowRight size={14} className="dir-flip" /> {tr("بازگشت به تیکت‌ها", "Back to tickets")}
    </Link>
  );

  if (loadState === "notfound") return <section>{back}<EmptyState message={tr("تیکت پیدا نشد", "Ticket not found")} /></section>;
  if (loadState === "error" || (!ticket && loadState !== "loading")) {
    return (
      <section>
        {back}
        <ErrorState onRetry={() => { setLoadState("loading"); load(); }} />
      </section>
    );
  }
  if (!ticket) return <LoadingState />;

  const u = ticket.user;
  const userLabel = [u.name, u.lastName].filter(Boolean).join(" ") || u.username || u.email || u.phone || tr("کاربر", "User");
  const canSend = !!reply.trim() && !sending;

  return (
    <section>
      {back}

      <div className="admin-page-head">
        <div style={{ minWidth: 0 }}>
          <div className="admin-page-kicker admin-support-subject">{ticket.subject}</div>
          {can("users.view")
            ? <Link href={`/admin/users/${u.id}`} className="admin-link admin-support-user">{userLabel}</Link>
            : <span className="admin-muted admin-support-user">{userLabel}</span>}
        </div>
        <div className="admin-head-actions">
          <span className={`admin-badge ${STATUS_BADGE[ticket.status]}`}>{statusLabels()[ticket.status]}</span>
          {ticket.status !== "CLOSED" && (
            <button type="button" className="admin-btn sm" onClick={() => setConfirmClose(true)}>
              <CheckCircle2 size={14} /> {tr("بستن تیکت", "Close ticket")}
            </button>
          )}
        </div>
      </div>

      <div className="support-thread admin-support-thread thin-scroll" ref={threadRef}>
        {ticket.messages.length === 0 && <div className="admin-empty">{tr("پیامی در این تیکت نیست", "No messages in this ticket")}</div>}
        {/* قرارداد .support-msg: توی پنل ادمین «mine» = پیام ادمین (راست/اکسنت)،
            «admin» = طرف مقابل یعنی کاربر. */}
        {ticket.messages.map((m) => (
          <div key={m.id} className={`support-msg${m.fromAdmin ? " mine" : " admin"}`}>
            {m.body}
            <span className="support-msg-time mono" dir="ltr">{formatDateTime(m.createdAt)}</span>
          </div>
        ))}
      </div>

      {error && <div className="admin-form-error">{error}</div>}

      <form className="admin-support-composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <textarea
          className="admin-input"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => {
            // Enter = ارسال، Shift+Enter = خط جدید. حین ترکیب IME (کیبورد
            // موبایل/فارسی) Enter مال خود ترکیبه، نه ارسال.
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); }
          }}
          maxLength={MAX_REPLY}
          rows={2}
          disabled={sending}
          placeholder={ticket.status === "CLOSED" ? tr("جواب بدی، تیکت دوباره باز می‌شه…", "Replying will reopen the ticket…") : tr("جواب رو بنویس…", "Write your reply…")}
          aria-label={tr("متن پاسخ", "Reply text")}
        />
        <button type="submit" className="admin-btn primary" disabled={!canSend} aria-label={tr("ارسال", "Send")}>
          {sending ? <Spinner size={14} /> : <Send size={15} />}
          <span className="admin-support-send-label">{tr("ارسال", "Send")}</span>
        </button>
      </form>
      <div className="admin-support-hint">{tr("Enter برای ارسال · Shift+Enter برای خط جدید", "Enter to send · Shift+Enter for a new line")}</div>

      {confirmClose && (
        <ConfirmModal
          title={tr("بستن تیکت", "Close ticket")}
          message={tr("تیکت بسته می‌شه؛ اگه کاربر دوباره پیام بده، خودکار باز می‌شه.", "The ticket will be closed. If the user sends another message, it reopens automatically.")}
          confirmLabel={tr("بستن تیکت", "Close ticket")}
          danger={false}
          onConfirm={closeTicket}
          onClose={() => setConfirmClose(false)}
        />
      )}
    </section>
  );
}
