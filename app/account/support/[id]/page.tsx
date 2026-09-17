"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Mic, Send, Square } from "lucide-react";
import { AccountBackButton } from "@/components/AccountBackButton";
import { PanelSkeleton } from "@/components/PanelSkeleton";
import { toJalali, faNum, J_MONTHS } from "@/lib/jalali";
import { useVoiceRecorder, VOICE_CONSTRAINTS, VOICE_MAX_BYTES } from "@/components/useVoiceRecorder";

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

// طبقِ درخواستِ صریح: نوارِ نوشتنِ پیامِ پشتیبانی دقیقا مثلِ «مدیربرنامه»ست —
// همان قرصِ ورودی + همان دکمه‌ی سه‌حالته (میکروفون → ضبط → ارسال)، حتی
// همان کلاس‌های CSS (routine-ai-*) تا دو جای اپ دو ظاهرِ متفاوت نداشته
// باشند. ویس این‌جا هم مثلِ آن‌جا فقط به متن تبدیل می‌شود (نه یک پیوستِ
// صوتیِ جدا که مدلِ داده‌ی تیکت اصلا پشتیبانی نمی‌کند) و همان لحظه فرستاده
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

  // میکروفون که پنل بسته/کامپوننت آنمانت شد باید آزاد شود — چراغِ ضبطِ
  // مرورگر نباید بدونِ دلیل روشن بماند.
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
      if (!res.ok) { setError(data?.error || "ارسال پیام ناموفق بود"); return; }
      setReply("");
      await load();
    } catch {
      setError("ارتباط با سرور برقرار نشد");
    } finally {
      setSending(false);
    }
  }

  async function toggleVoice() {
    if (listening) {
      const blob = await recorder.stop();
      if (!blob) { setError("چیزی ضبط نشد. دوباره امتحان کن."); return; }
      if (blob.size > VOICE_MAX_BYTES) { setError("ویس خیلی طولانی است. کوتاه‌تر بگو."); return; }
      setSending(true);
      setError(null);
      try {
        const fd = new FormData();
        fd.append("audio", blob, "voice.webm");
        const res = await fetch("/api/support/tickets/voice", { method: "POST", body: fd });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.text) { setError(data?.error || "تبدیلِ ویس انجام نشد."); return; }
        setSending(false);
        await send(data.text);
      } catch {
        setError("تبدیلِ ویس انجام نشد. اینترنتت را چک کن.");
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
        setError("به میکروفون دسترسی نداریم.");
        return;
      }
    }
    const ok = recorder.start();
    if (!ok) setError(recorder.error || "به میکروفون دسترسی نداریم.");
  }

  const hasText = !!reply.trim();

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

      <form className="routine-ai-composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <textarea
          className="routine-ai-input"
          rows={1}
          value={reply}
          maxLength={4000}
          placeholder="پیامت رو بنویس…"
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          disabled={sending}
        />
        <button
          type="button"
          className={`routine-ai-action${hasText ? " is-send" : ""}${listening ? " is-recording" : ""}`}
          onClick={() => (hasText ? send() : toggleVoice())}
          disabled={sending}
          aria-label={hasText ? "ارسال" : listening ? "پایان ضبط" : "ضبط صدا"}
          title={hasText ? "ارسال" : listening ? "پایان ضبط و ارسال" : "با صدا بگو"}
        >
          <span className="routine-ai-action-icon" aria-hidden="true"><Mic size={17} /></span>
          <span className="routine-ai-action-icon" aria-hidden="true"><Square size={13} /></span>
          <span className="routine-ai-action-icon" aria-hidden="true"><Send size={16} /></span>
        </button>
      </form>
    </section>
  );
}
