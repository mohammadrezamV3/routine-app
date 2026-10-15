"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Mic, Send, Square } from "lucide-react";
import { AccountBackButton } from "@/components/AccountBackButton";
import { PanelSkeleton } from "@/components/PanelSkeleton";
import { toJalali, faNum, jMonthName } from "@/lib/jalali";
import { useVoiceRecorder, VOICE_CONSTRAINTS, VOICE_MAX_BYTES } from "@/components/useVoiceRecorder";
import { tr } from "@/lib/i18n";

type TicketStatus = "OPEN" | "ANSWERED" | "CLOSED";
type Message = { id: string; body: string; fromAdmin: boolean; createdAt: string };
type TicketDetail = { id: string; subject: string; status: TicketStatus; messages: Message[] };

const statusLabel = (): Record<TicketStatus, string> => ({
  OPEN: tr("در انتظار پاسخ", "Awaiting reply"), ANSWERED: tr("پاسخ داده شد", "Answered"), CLOSED: tr("بسته‌شده", "Closed"),
});
const STATUS_CLASS: Record<TicketStatus, string> = { OPEN: "open", ANSWERED: "answered", CLOSED: "closed" };

function formatMsgTime(iso: string): string {
  const d = new Date(iso);
  const [jy, jm, jd] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const hh = faNum(String(d.getHours()).padStart(2, "0"));
  const mm = faNum(String(d.getMinutes()).padStart(2, "0"));
  return tr(`${faNum(jd)} ${jMonthName(jm - 1)}، ${hh}:${mm}`, `${faNum(jd)} ${jMonthName(jm - 1)}, ${hh}:${mm}`);
}

// طبق درخواست صریح: نوار نوشتن پیام پشتیبانی دقیقا مثل «مدیربرنامه»ست —
// همان قرص ورودی + همان دکمه‌ی سه‌حالته (میکروفون → ضبط → ارسال)، حتی
// همان کلاس‌های CSS (routine-ai-*) تا دو جای اپ دو ظاهر متفاوت نداشته
// باشند. ویس این‌جا هم مثل آن‌جا فقط به متن تبدیل می‌شود (نه یک پیوست
// صوتی جدا که مدل داده‌ی تیکت اصلا پشتیبانی نمی‌کند) و همان لحظه فرستاده
// می‌شود.
export default function SupportTicketPage() {
  const params = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorder = useVoiceRecorder(() => streamRef.current);
  const listening = recorder.state === "recording";

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

  // میکروفون که پنل بسته/کامپوننت آنمانت شد باید آزاد شود — چراغ ضبط
  // مرورگر نباید بدون دلیل روشن بماند.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  async function send(text?: string) {
    const body = (text ?? reply).trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/support/tickets/${params.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: body }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError(data?.error || tr("ارسال پیام ناموفق بود", "Could not send the message")); return; }
      setReply("");
      await load();
    } catch {
      setError(tr("ارتباط با سرور برقرار نشد", "Could not reach the server"));
    } finally {
      setSending(false);
    }
  }

  async function toggleVoice() {
    if (listening) {
      const blob = await recorder.stop();
      if (!blob) { setError(tr("چیزی ضبط نشد. دوباره امتحان کن.", "Nothing was recorded. Please try again.")); return; }
      if (blob.size > VOICE_MAX_BYTES) { setError(tr("ویس خیلی طولانی است. کوتاه‌تر بگو.", "The voice message is too long. Keep it shorter.")); return; }
      setSending(true);
      setError(null);
      try {
        const fd = new FormData();
        fd.append("audio", blob, "voice.webm");
        const res = await fetch("/api/support/tickets/voice", { method: "POST", body: fd });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.text) { setError(data?.error || tr("تبدیل ویس انجام نشد.", "Could not convert the voice message.")); return; }
        setSending(false);
        await send(data.text);
      } catch {
        setError(tr("تبدیل ویس انجام نشد. اینترنتت را چک کن.", "Could not convert the voice message. Check your internet connection."));
      } finally {
        setSending(false);
      }
      return;
    }

    setError(null);
    if (!streamRef.current) {
      try {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: VOICE_CONSTRAINTS });
      } catch {
        setError(tr("به میکروفون دسترسی نداریم.", "We cannot access the microphone."));
        return;
      }
    }
    const ok = recorder.start();
    if (!ok) setError(recorder.error || tr("به میکروفون دسترسی نداریم.", "We cannot access the microphone."));
  }

  const hasText = !!reply.trim();

  if (notFound) {
    return (
      <section>
        <div className="acc-head"><AccountBackButton /><h1>{tr("تیکت پیدا نشد", "Ticket not found")}</h1></div>
      </section>
    );
  }

  if (!ticket) return <PanelSkeleton />;

  return (
    <section className="support-ticket-page">
      <div className="acc-head">
        <AccountBackButton />
        <div className="support-head-row">
          <h1>{ticket.subject}</h1>
          <span className={`support-status ${STATUS_CLASS[ticket.status]}`}>{statusLabel()[ticket.status]}</span>
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

      <form className="routine-ai-composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <textarea
          className="routine-ai-input"
          rows={1}
          value={reply}
          maxLength={4000}
          placeholder={tr("پیامت رو بنویس…", "Write your message…")}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          disabled={sending}
        />
        <button
          type="button"
          className={`routine-ai-action${hasText ? " is-send" : ""}${listening ? " is-recording" : ""}`}
          onClick={() => (hasText ? send() : toggleVoice())}
          disabled={sending}
          aria-label={hasText ? tr("ارسال", "Send") : listening ? tr("پایان ضبط", "Stop recording") : tr("ضبط صدا", "Record audio")}
          title={hasText ? tr("ارسال", "Send") : listening ? tr("پایان ضبط و ارسال", "Stop recording and send") : tr("با صدا بگو", "Speak instead")}
        >
          <span className="routine-ai-action-icon" aria-hidden="true"><Mic size={17} /></span>
          <span className="routine-ai-action-icon" aria-hidden="true"><Square size={13} /></span>
          <span className="routine-ai-action-icon" aria-hidden="true"><Send size={16} /></span>
        </button>
      </form>
    </section>
  );
}
