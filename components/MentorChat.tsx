"use client";

import "./mentor.css";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AlertTriangle, Check, CheckCheck, Clock, Flag, RefreshCw, Send, Trash2 } from "lucide-react";
import type { ChatMessage, MessagesResponse } from "@/lib/mentorTypes";
import { fmtMsgTime, NETWORK_ERROR, readApiError } from "@/lib/mentorFormat";
import { faNum } from "@/lib/jalali";
import { LoadingBlock, Spinner } from "./Spinner";
import { MentorErrorState } from "./MentorPageShell";
import { MentorReportModal } from "./MentorReportModal";

const POLL_MS = 8000;
const MAX_LEN = 2000;
const META_ICON = { size: 13, strokeWidth: 1.75 } as const;

type Pending = { tempId: string; body: string; createdAt: string; state: "sending" | "failed"; error?: string };

function sortByTime(a: { createdAt: string }, b: { createdAt: string }) {
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}

/**
 * گفت‌وگوی منتور ↔ شاگرد (polling، نه WebSocket — طبقِ docs/mentors.md).
 *
 *  • هر ~۸ ثانیه فقط وقتی تب دیده می‌شود تازه می‌شود؛ برگشتن به تب فورا
 *    یک بار می‌گیرد. خودِ GET پیام‌های دریافتی را «خوانده» می‌کند.
 *  • ارسالِ خوش‌بینانه: پیام بلافاصله با آیکونِ ساعت دیده می‌شود؛
 *    شکست → کم‌رنگ با «تلاش دوباره»/«حذف»، پس متن هیچ‌وقت گم نمی‌شود.
 *  • تیکِ خوانده‌شدن از readAt؛ «پیام‌های قبلی» با before=<قدیمی‌ترین>.
 *  • canSend=false (رابطه‌ی پایان‌یافته) → فقط‌خواندنی با دلیلِ روشن.
 */
export function MentorChat({ mentorshipId }: { mentorshipId: string }) {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [canSend, setCanSend] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [olderBusy, setOlderBusy] = useState(false);
  const [olderError, setOlderError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [reportId, setReportId] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const preserveFrom = useRef<number | null>(null);
  const inflight = useRef(false);

  const merge = useCallback((incoming: ChatMessage[]) => {
    setMessages((prev) => {
      const map = new Map((prev ?? []).map((m) => [m.id, m]));
      for (const m of incoming) map.set(m.id, m);
      return Array.from(map.values()).sort(sortByTime);
    });
  }, []);

  const fetchLatest = useCallback(async (initial = false) => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      const res = await fetch(`/api/mentorships/${mentorshipId}/messages`, { cache: "no-store" });
      if (!res.ok) {
        // فقط بارِ اول صفحه را به خطا می‌برد؛ شکستِ یک polling بعدی بی‌صدا
        // نادیده گرفته می‌شود و دورِ بعد دوباره امتحان می‌شود.
        if (initial) setLoadError(await readApiError(res, "گفت‌وگو دریافت نشد؛ دوباره تلاش کن"));
        return;
      }
      const data: MessagesResponse = await res.json();
      if (initial) setHasMore(!!data.hasMore);
      setCanSend(!!data.canSend);
      setLoadError(null);
      merge(data.messages || []);
    } catch {
      if (initial) setLoadError(NETWORK_ERROR);
    } finally {
      inflight.current = false;
    }
  }, [mentorshipId, merge]);

  useEffect(() => {
    setMessages(null);
    setPending([]);
    setLoadError(null);
    stickToBottom.current = true;
    fetchLatest(true);
  }, [fetchLatest]);

  useEffect(() => {
    const tick = () => { if (document.visibilityState === "visible") fetchLatest(); };
    const t = setInterval(tick, POLL_MS);
    const onVis = () => { if (document.visibilityState === "visible") fetchLatest(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, [fetchLatest]);

  // اسکرول: بعد از «پیام‌های قبلی» جای فعلی حفظ می‌شود؛ پیامِ تازه فقط وقتی
  // پایین می‌کشد که کاربر خودش پایینِ گفت‌وگو بوده (وسطِ خواندن نمی‌پرد).
  useLayoutEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    if (preserveFrom.current !== null) {
      el.scrollTop = el.scrollHeight - preserveFrom.current;
      preserveFrom.current = null;
      return;
    }
    if (stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages, pending]);

  function onScroll() {
    const el = threadRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  async function loadOlder() {
    if (!messages?.length || olderBusy) return;
    setOlderBusy(true);
    setOlderError(null);
    try {
      const res = await fetch(`/api/mentorships/${mentorshipId}/messages?before=${encodeURIComponent(messages[0].createdAt)}`, { cache: "no-store" });
      if (!res.ok) { setOlderError(await readApiError(res, "پیام‌های قبلی دریافت نشد؛ دوباره تلاش کن")); return; }
      const data: MessagesResponse = await res.json();
      const el = threadRef.current;
      if (el) preserveFrom.current = el.scrollHeight - el.scrollTop;
      setHasMore(!!data.hasMore);
      merge(data.messages || []);
    } catch {
      setOlderError(NETWORK_ERROR);
    } finally {
      setOlderBusy(false);
    }
  }

  async function deliver(p: Pending) {
    setPending((prev) => prev.map((x) => (x.tempId === p.tempId ? { ...x, state: "sending", error: undefined } : x)));
    try {
      const res = await fetch(`/api/mentorships/${mentorshipId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: p.body }),
      });
      if (!res.ok) {
        const msg = await readApiError(res, "ارسال نشد");
        setPending((prev) => prev.map((x) => (x.tempId === p.tempId ? { ...x, state: "failed", error: msg } : x)));
        if (res.status === 403 || res.status === 404 || res.status === 409) setCanSend(false);
        return;
      }
      const data: { message: ChatMessage } = await res.json();
      setPending((prev) => prev.filter((x) => x.tempId !== p.tempId));
      if (data?.message) merge([{ ...data.message, mine: true }]);
    } catch {
      setPending((prev) => prev.map((x) => (x.tempId === p.tempId ? { ...x, state: "failed", error: NETWORK_ERROR } : x)));
    }
  }

  function send() {
    const body = draft.trim();
    if (!body || !canSend) return;
    if (body.length > MAX_LEN) return;
    const p: Pending = { tempId: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, body, createdAt: new Date().toISOString(), state: "sending" };
    stickToBottom.current = true;
    setPending((prev) => [...prev, p]);
    setDraft("");
    deliver(p);
  }

  if (loadError && messages === null) {
    return <MentorErrorState message={loadError} onRetry={() => { setLoadError(null); fetchLatest(true); }} />;
  }
  if (messages === null) return <LoadingBlock />;

  const tooLong = draft.trim().length > MAX_LEN;
  const hasText = !!draft.trim() && !tooLong;

  return (
    <div className="mentor-chat">
      <div className="support-thread thin-scroll" ref={threadRef} onScroll={onScroll} aria-live="polite">
        {hasMore && (
          <button type="button" className="mentor-text-btn mentor-chat-older" onClick={loadOlder} disabled={olderBusy}>
            {olderBusy ? <Spinner size={14} /> : "نمایش پیام‌های قبلی"}
          </button>
        )}
        {olderError && <p className="mentor-field-error mentor-chat-older" role="alert">{olderError}</p>}

        {messages.length === 0 && pending.length === 0 && (
          <div className="mentor-chat-empty">هنوز پیامی نیست</div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`support-msg${m.mine ? " mine" : " admin"}`}>
            {m.body}
            <span className="mentor-msg-meta">
              <span className="mono">{fmtMsgTime(m.createdAt)}</span>
              {m.mine && (m.readAt
                ? <CheckCheck {...META_ICON} aria-label="خوانده شد" />
                : <Check {...META_ICON} aria-label="ارسال شد" />)}
            </span>
            {!m.mine && (
              <span className="mentor-msg-actions">
                <button type="button" onClick={() => setReportId(m.id)} aria-label="گزارش این پیام">
                  <Flag {...META_ICON} aria-hidden /> گزارش
                </button>
              </span>
            )}
          </div>
        ))}

        {pending.map((p) => (
          <div key={p.tempId} className={`support-msg mine${p.state === "failed" ? " is-failed" : ""}`}>
            {p.body}
            <span className="mentor-msg-meta">
              {p.state === "sending" ? (
                <Clock {...META_ICON} aria-label="در صف ارسال" />
              ) : (
                <><AlertTriangle {...META_ICON} aria-hidden /> {p.error || "ارسال نشد"}</>
              )}
            </span>
            {p.state === "failed" && (
              <span className="mentor-msg-actions">
                {canSend && (
                  <button type="button" onClick={() => deliver(p)}><RefreshCw {...META_ICON} aria-hidden /> ارسال دوباره</button>
                )}
                <button type="button" onClick={() => setPending((prev) => prev.filter((x) => x.tempId !== p.tempId))}>
                  <Trash2 {...META_ICON} aria-hidden /> حذف پیام
                </button>
              </span>
            )}
          </div>
        ))}
      </div>

      {canSend ? (
        <>
          {tooLong && <p className="mentor-field-error" role="alert">پیام حداکثر {faNum(MAX_LEN)} نویسه است</p>}
          <form className="routine-ai-composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <textarea
              className="routine-ai-input"
              rows={1}
              value={draft}
              maxLength={MAX_LEN + 200}
              placeholder="پیام"
              aria-label="متن پیام"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            />
            <button
              type="submit"
              className={`routine-ai-action${hasText ? " has-text" : ""}`}
              disabled={!hasText}
              aria-label="ارسال پیام"
              title="ارسال پیام"
            >
              <span className="routine-ai-action-icon" aria-hidden="true"><Send size={16} strokeWidth={1.75} /></span>
            </button>
          </form>
        </>
      ) : (
        <div className="mentor-chat-disabled">گفت‌وگو فقط‌خواندنی است؛ ارسال پیام فقط در رابطه‌ی فعال ممکن است</div>
      )}

      {reportId && <MentorReportModal targetType="MESSAGE" targetId={reportId} onClose={() => setReportId(null)} />}
    </div>
  );
}
