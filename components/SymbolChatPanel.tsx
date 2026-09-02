"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Flag, Loader2, MessagesSquare, Send, Trash2 } from "lucide-react";
import { faNum } from "@/lib/jalali";
import {
  CHAT_REPORT_REASONS, ChatMessageDto, ChatReportReason, MAX_CHAT_BODY,
} from "@/lib/tradeChat";
import { pairLabel } from "@/lib/tradingView";
import { useAsyncAction } from "@/lib/useAsyncAction";

// چتِ گروهیِ یک نماد. هر نماد اتاقِ خودش را دارد و پیام‌ها بینِ همه‌ی
// کاربرانِ دارای ماژولِ ترید مشترک است.
//
// چرا پولینگ و نه WebSocket: اپ روی یک instanceِ Next.js پشتِ Nginx اجرا
// می‌شود و سوکتِ پایدار یعنی یک لایه‌ی زیرساختیِ تازه (و چسبندگیِ session).
// برای اتاقی که چند پیام در دقیقه دارد، یک درخواستِ سبکِ «فقط جدیدترها»
// هر ۸ ثانیه هم ارزان‌تر است هم ساده‌تر. پولینگ وقتی تب پنهان است متوقف
// می‌شود تا در پس‌زمینه بی‌دلیل به سرور نزند.
const POLL_MS = 8_000;

function timeLabel(iso: string) {
  const d = new Date(iso);
  return faNum(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
}

export function SymbolChatPanel({ symbol }: { symbol: string }) {
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [reporting, setReporting] = useState<ChatMessageDto | null>(null);
  const { pendingKey, error: actionError, run } = useAsyncAction();

  const listRef = useRef<HTMLDivElement | null>(null);
  // آخرین زمانی که داریم — پولینگ فقط جدیدترها را می‌خواهد
  const sinceRef = useRef<string | null>(null);
  // اگر کاربر بالا رفته و دارد پیام‌های قدیمی را می‌خواند، پیامِ تازه
  // نباید صفحه را زیر دستش بپراند.
  const stickToBottom = useRef(true);

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const load = useCallback(async (incremental: boolean) => {
    const qs = new URLSearchParams({ symbol });
    if (incremental && sinceRef.current) qs.set("since", sinceRef.current);
    const res = await fetch(`/api/trade/chat?${qs}`);
    if (!res.ok) {
      if (!incremental) setLoading(false);
      return;
    }
    const data = await res.json();
    const incoming: ChatMessageDto[] = data.messages || [];

    setMessages((prev) => {
      if (!incremental) return incoming;
      if (!incoming.length) return prev;
      // پیامِ خودمان را خوش‌بینانه اضافه کرده‌ایم؛ اگر پولینگ همان را هم
      // بیاورد نباید دو بار دیده شود.
      const known = new Set(prev.map((m) => m.id));
      const fresh = incoming.filter((m) => !known.has(m.id));
      return fresh.length ? [...prev, ...fresh] : prev;
    });

    const last = incoming[incoming.length - 1];
    if (last) sinceRef.current = last.createdAt;
    if (!incremental) setLoading(false);
  }, [symbol]);

  // عوض‌شدنِ نماد یعنی اتاقِ دیگری — همه‌چیز از نو
  useEffect(() => {
    sinceRef.current = null;
    stickToBottom.current = true;
    setMessages([]);
    setLoading(true);
    load(false);
  }, [symbol, load]);

  useEffect(() => {
    const tick = () => { if (!document.hidden) load(true); };
    const id = setInterval(tick, POLL_MS);
    // برگشتن به تب یعنی احتمالاً چند پیام عقبیم — فوراً به‌روز کن
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, [load]);

  useEffect(() => {
    if (stickToBottom.current) scrollToBottom();
  }, [messages, scrollToBottom]);

  async function send() {
    const body = draft.trim();
    if (!body || pendingKey) return;
    stickToBottom.current = true;
    const ok = await run("send", async () => {
      const res = await fetch("/api/trade/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, body }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setMessages((prev) => (prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]));
          sinceRef.current = data.message.createdAt;
        }
      }
      return res;
    });
    if (ok) setDraft("");
  }

  async function remove(m: ChatMessageDto) {
    const snapshot = messages;
    setMessages((prev) => prev.filter((x) => x.id !== m.id));
    const ok = await run(`del:${m.id}`, () =>
      fetch(`/api/trade/chat?id=${encodeURIComponent(m.id)}`, { method: "DELETE" })
    );
    if (!ok) setMessages(snapshot);
  }

  async function submitReport(reason: ChatReportReason, note: string) {
    const target = reporting;
    if (!target) return;
    const ok = await run("report", () =>
      fetch("/api/trade/chat/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: target.id, reason, note }),
      })
    );
    if (ok) {
      setMessages((prev) => prev.map((m) => (m.id === target.id ? { ...m, reported: true } : m)));
      setReporting(null);
    }
  }

  return (
    <div className="trade-surface trade-chat-panel">
      <div className="trade-panel-head">
        <span className="trade-panel-title">
          <MessagesSquare size={16} /> گفت‌وگوی {pairLabel(symbol)}
        </span>
        <span className="trade-chat-room mono">{symbol}</span>
      </div>

      <div
        className="trade-chat-list thin-scroll"
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
        }}
      >
        {loading && <div className="trade-chat-empty">در حال بارگذاری…</div>}
        {!loading && !messages.length && (
          <div className="trade-chat-empty">
            هنوز پیامی در این اتاق نیست — تحلیلت را اولین نفر بنویس.
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`trade-chat-row${m.mine ? " mine" : ""}`}>
            <div className="trade-chat-meta">
              <span className="trade-chat-author">{m.mine ? "من" : m.authorName}</span>
              <span className="trade-chat-time mono">{timeLabel(m.createdAt)}</span>
            </div>
            <div className="trade-chat-bubble">
              {/* متنِ خام رندر می‌شود، نه HTML — پیامِ کاربر هیچ‌وقت تفسیر نمی‌شود */}
              <p className="trade-chat-body">{m.body}</p>
              <div className="trade-chat-actions">
                {m.mine ? (
                  <button
                    type="button" className="trade-chat-action"
                    onClick={() => remove(m)} disabled={pendingKey === `del:${m.id}`}
                    aria-label="حذف پیام"
                  >
                    {pendingKey === `del:${m.id}`
                      ? <Loader2 size={13} className="trade-spin" />
                      : <Trash2 size={13} />}
                  </button>
                ) : (
                  <button
                    type="button" className="trade-chat-action"
                    onClick={() => setReporting(m)} disabled={m.reported}
                    aria-label={m.reported ? "گزارش شده" : "گزارش پیام"}
                    title={m.reported ? "این پیام را گزارش کرده‌ای" : "گزارش"}
                  >
                    <Flag size={13} />
                    {m.reported && <span className="trade-chat-reported">گزارش شد</span>}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {actionError && <div className="trade-form-error">{actionError}</div>}

      <form
        className="trade-chat-composer"
        onSubmit={(e) => { e.preventDefault(); send(); }}
      >
        <input
          className="wsearch-newform-name trade-glass-field"
          value={draft}
          maxLength={MAX_CHAT_BODY}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="پیام خود را بنویسید…"
          aria-label="متن پیام"
        />
        <button
          type="submit" className="trade-chat-send"
          disabled={!draft.trim() || pendingKey === "send"} aria-label="ارسال"
        >
          {pendingKey === "send" ? <Loader2 size={16} className="trade-spin" /> : <Send size={16} />}
        </button>
      </form>

      {reporting && (
        <ReportDialog
          message={reporting}
          pending={pendingKey === "report"}
          onCancel={() => setReporting(null)}
          onSubmit={submitReport}
        />
      )}
    </div>
  );
}

function ReportDialog({
  message, pending, onCancel, onSubmit,
}: {
  message: ChatMessageDto;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (reason: ChatReportReason, note: string) => void;
}) {
  const [reason, setReason] = useState<ChatReportReason>("SPAM");
  const [note, setNote] = useState("");

  return (
    <div className="trade-chat-report-sheet">
      <div className="trade-panel-title" style={{ marginBottom: 8 }}>گزارش پیام</div>
      <div className="trade-chat-report-quote">{message.body}</div>

      <label className="exercise-form-label">دلیل گزارش</label>
      <select
        className="wsearch-newform-name trade-glass-field"
        value={reason}
        onChange={(e) => setReason(e.target.value as ChatReportReason)}
      >
        {CHAT_REPORT_REASONS.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>

      <label className="exercise-form-label">توضیح (اختیاری)</label>
      <input
        className="wsearch-newform-name trade-glass-field"
        value={note} maxLength={500}
        onChange={(e) => setNote(e.target.value)}
        placeholder="اگر لازم است توضیح بده"
      />

      <div className="trade-modal-actions">
        <button type="button" className="account-outline-btn" onClick={onCancel}>لغو</button>
        <button
          type="button" className="trade-danger-btn"
          onClick={() => onSubmit(reason, note)} disabled={pending}
        >
          {pending ? <><Loader2 size={14} className="trade-spin" /> در حال ارسال…</> : "ارسال گزارش"}
        </button>
      </div>
    </div>
  );
}
