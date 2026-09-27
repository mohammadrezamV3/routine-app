"use client";

import "./mentor.css";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, BellRing, Check, CheckCheck, Clock, Flag, Lock, Megaphone, RefreshCw, Send, ShieldAlert, Trash2 } from "lucide-react";
import type { ChatMessage, MessagesResponse } from "@/lib/mentorTypes";
import { fmtMsgTime, NETWORK_ERROR, readApiError } from "@/lib/mentorFormat";
import { faNum } from "@/lib/jalali";
import {
  ConversationCipher,
  fetchConversationKeys,
  refreshIdentity,
  type ConversationKeys,
  type Identity,
  type OpenedMessage,
} from "@/lib/e2ee/client";
import { randomId } from "@/lib/e2ee/encoding";
import type { EncryptedMessage } from "@/lib/e2ee/core";
import { LoadingBlock, Spinner } from "./Spinner";
import { MentorErrorState } from "./MentorPageShell";
import { MentorReportModal } from "./MentorReportModal";
import { MentorE2EEGate } from "./MentorE2EEGate";
import { MentorE2EESettings } from "./MentorE2EESettings";
import { SavedRepliesPicker } from "./MentorSavedReplies";

const POLL_MS = 8000;
const MAX_LEN = 2000;
const META_ICON = { size: 13, strokeWidth: 1.75 } as const;

type Pending = {
  tempId: string;
  text: string;
  createdAt: string;
  state: "sending" | "failed";
  error?: string;
  /** متنِ رمزشده‌ی آماده — تلاشِ دوباره *همان* بسته را می‌فرستد تا سرور با clientId تکرار را تشخیص دهد */
  payload?: EncryptedMessage;
};

type ReportTarget = { id: string; franking?: { text: string; frankingKey: string } };

function sortByTime(a: { createdAt: string; id?: string }, b: { createdAt: string; id?: string }) {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  return (a.id || "") < (b.id || "") ? -1 : 1;
}

/**
 * گفت‌وگوی منتور ↔ شاگرد با رمزگذاریِ سرتاسری (docs/mentor-e2ee.md).
 *
 *  • تا کلیدِ هویت روی این دستگاه آماده نباشد، MentorE2EEGate فرمِ راه‌اندازی/باز کردن را نشان می‌دهد.
 *  • پیام روی همین دستگاه رمز می‌شود؛ سرور فقط متنِ رمزشده می‌بیند.
 *  • polling هر ~۸ ثانیه وقتی تب دیده می‌شود؛ خودِ GET پیام‌های دریافتی را «خوانده» می‌کند.
 *  • ارسالِ خوش‌بینانه با تلاشِ دوباره‌ی همان بسته (clientId ثابت → بدونِ پیامِ تکراری).
 *  • گزارشِ پیام: متن + کلیدِ فرانکینگِ همان پیام به سرور می‌رود و فقط همان پیام برای ادمین دیده می‌شود.
 */
export function MentorChat({ mentorshipId, peerName }: { mentorshipId: string; peerName?: string }) {
  return (
    <MentorE2EEGate>
      {(identity, s) => <ChatBody key={`${identity.userId}:${identity.version}`} identity={identity} persistent={s.persistent} mentorshipId={mentorshipId} peerName={peerName} />}
    </MentorE2EEGate>
  );
}

function ChatBody({ identity, persistent, mentorshipId, peerName }: { identity: Identity; persistent: boolean; mentorshipId: string; peerName?: string }) {
  const [keys, setKeys] = useState<ConversationKeys | null>(null);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [opened, setOpened] = useState<Record<string, OpenedMessage>>({});
  const [welcome, setWelcome] = useState<MessagesResponse["welcome"]>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [canSend, setCanSend] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [olderBusy, setOlderBusy] = useState(false);
  const [olderError, setOlderError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [report, setReport] = useState<ReportTarget | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [peerChanged, setPeerChanged] = useState(false);
  const [nudge, setNudge] = useState<"idle" | "busy" | "sent">("idle");
  const threadRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const preserveFrom = useRef<number | null>(null);
  const inflight = useRef(false);
  const legacyBusy = useRef(false);

  const cipher = useMemo(() => (keys ? new ConversationCipher(identity, mentorshipId, keys) : null), [identity, mentorshipId, keys]);
  const peerReady = !!cipher?.peerCurrent();
  const isMentor = keys?.mentorId === identity.userId;
  const peerLabel = peerName || (isMentor ? "شاگرد" : "منتور");

  const loadKeys = useCallback(async () => {
    const k = await fetchConversationKeys(mentorshipId);
    // اگر کلیدِ خودم روی سرور با کلیدِ این دستگاه نمی‌خواند (بازنشانی روی دستگاهِ دیگر)
    const mine = (k.keys[identity.userId] || []).find((r) => r.current);
    if (!mine || mine.version !== identity.version || mine.publicKey !== identity.publicKey) {
      await refreshIdentity();
      return null;
    }
    setKeys((prev) => (prev && JSON.stringify(prev.keys) === JSON.stringify(k.keys) ? prev : k));
    return k;
  }, [mentorshipId, identity]);

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
      if (initial) await loadKeys();
      const res = await fetch(`/api/mentorships/${mentorshipId}/messages`, { cache: "no-store" });
      if (!res.ok) {
        if (initial) setLoadError(await readApiError(res, "گفت‌وگو دریافت نشد؛ دوباره تلاش کن"));
        return;
      }
      const data: MessagesResponse = await res.json();
      if (initial) setHasMore(!!data.hasMore);
      setCanSend(!!data.canSend);
      setWelcome(data.welcome ?? null);
      setLoadError(null);
      merge(data.messages || []);
    } catch (e) {
      if (initial) setLoadError(e instanceof Error && e.message ? e.message : NETWORK_ERROR);
    } finally {
      inflight.current = false;
    }
  }, [mentorshipId, merge, loadKeys]);

  useEffect(() => {
    setMessages(null);
    setOpened({});
    setPending([]);
    setLoadError(null);
    stickToBottom.current = true;
    fetchLatest(true);
  }, [fetchLatest]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      fetchLatest();
      // تا وقتی طرفِ مقابل کلید ندارد، کلیدها هم با هر دور تازه می‌شوند
      if (!peerReady) loadKeys().catch(() => {});
    };
    const t = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", tick); };
  }, [fetchLatest, loadKeys, peerReady]);

  // رمزگشاییِ پیام‌های تازه (و دوباره، وقتی کلیدهای طرفِ مقابل عوض شد)
  useEffect(() => {
    if (!cipher || !messages) return;
    let cancelled = false;
    const todo = messages.filter((m) => !opened[m.id] || (opened[m.id].kind === "failed" && m.enc));
    if (todo.length === 0) return;
    (async () => {
      const out: Record<string, OpenedMessage> = {};
      let missingPeerKey = false;
      for (const m of todo) {
        const o = await cipher.open(m);
        out[m.id] = o;
        if (o.kind === "failed") missingPeerKey = true;
      }
      if (cancelled) return;
      setOpened((prev) => ({ ...prev, ...out }));
      if (missingPeerKey) loadKeys().catch(() => {});
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cipher, messages]);

  // کدِ امنیتی و تشخیصِ تغییرِ کلیدِ طرفِ مقابل (TOFU)
  useEffect(() => {
    if (!cipher) return;
    let cancelled = false;
    cipher.safetyCode().then((c) => { if (!cancelled) setCode(c); });
    cipher.peerKeyChanged().then((ch) => { if (!cancelled) setPeerChanged(ch); });
    return () => { cancelled = true; };
  }, [cipher]);

  // بازرمزگذاریِ پیام‌های قدیمیِ متن‌ساده، بی‌صدا در پس‌زمینه
  useEffect(() => {
    if (!cipher || !peerReady || !messages || legacyBusy.current) return;
    const legacy = messages.filter((m) => m.legacyBody != null).slice(0, 50);
    if (legacy.length === 0) return;
    legacyBusy.current = true;
    (async () => {
      try {
        const items = await cipher.reencryptLegacy(legacy);
        if (!items.length) return;
        const res = await fetch(`/api/mentorships/${mentorshipId}/messages/legacy`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        if (res.ok) {
          // ردیف‌ها حالا رمزشده‌اند؛ نسخه‌ی تازه را بگیر
          const r2 = await fetch(`/api/mentorships/${mentorshipId}/messages`, { cache: "no-store" });
          if (r2.ok) {
            const d: MessagesResponse = await r2.json();
            const ids = new Set(legacy.map((m) => m.id));
            setOpened((prev) => { const n = { ...prev }; ids.forEach((id) => delete n[id]); return n; });
            merge(d.messages || []);
          }
        }
      } catch {
        // دورِ بعد دوباره
      } finally {
        legacyBusy.current = false;
      }
    })();
  }, [cipher, peerReady, messages, mentorshipId, merge]);

  useLayoutEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    if (preserveFrom.current !== null) {
      el.scrollTop = el.scrollHeight - preserveFrom.current;
      preserveFrom.current = null;
      return;
    }
    if (stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages, pending, opened]);

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

  const fail = (tempId: string, error: string, payload?: EncryptedMessage) =>
    setPending((prev) => prev.map((x) => (x.tempId === tempId ? { ...x, state: "failed", error, payload: payload ?? x.payload } : x)));

  async function deliver(p: Pending, retriedKeys = false) {
    setPending((prev) => prev.map((x) => (x.tempId === p.tempId ? { ...x, state: "sending", error: undefined } : x)));
    let payload = p.payload;
    try {
      if (!payload) {
        if (!cipher) throw new Error("کلیدهای گفت‌وگو هنوز دریافت نشده");
        const { frankingKey: _fk, ...enc } = await cipher.encrypt(p.text, randomId());
        payload = enc;
        setPending((prev) => prev.map((x) => (x.tempId === p.tempId ? { ...x, payload } : x)));
      }
      const res = await fetch(`/api/mentorships/${mentorshipId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.clone().json().catch(() => null);
        // کلیدِ یکی از دو طرف عوض شده: کلیدها را تازه کن و یک بار با کلیدِ درست دوباره رمز کن
        if (res.status === 409 && (data?.code === "KEY_CHANGED" || data?.code === "PEER_NO_KEY") && !retriedKeys) {
          const k = await loadKeys();
          if (k && data?.code === "KEY_CHANGED") {
            const fresh = new ConversationCipher(identity, mentorshipId, k);
            const { frankingKey: _fk2, ...enc } = await fresh.encrypt(p.text, randomId());
            return deliver({ ...p, payload: enc }, true);
          }
        }
        const msg = await readApiError(res, "ارسال نشد");
        fail(p.tempId, msg, payload);
        if (res.status === 403 || res.status === 404 || (res.status === 409 && !data?.code)) setCanSend(false);
        return;
      }
      const data: { message: ChatMessage } = await res.json();
      setPending((prev) => prev.filter((x) => x.tempId !== p.tempId));
      if (data?.message) {
        // متنِ پیامِ خودم را همین‌جا داریم؛ بدونِ رمزگشاییِ دوباره نمایش داده می‌شود
        setOpened((prev) => ({ ...prev, [data.message.id]: { kind: "text", text: p.text, frankingKey: "", committed: true } }));
        merge([data.message]);
      }
    } catch (e) {
      fail(p.tempId, e instanceof TypeError ? NETWORK_ERROR : e instanceof Error && e.message ? e.message : NETWORK_ERROR, payload);
    }
  }

  function send() {
    const text = draft.trim();
    if (!text || !canSend || !peerReady || text.length > MAX_LEN) return;
    const p: Pending = { tempId: `tmp-${randomId(8)}`, text, createdAt: new Date().toISOString(), state: "sending" };
    stickToBottom.current = true;
    setPending((prev) => [...prev, p]);
    setDraft("");
    deliver(p);
  }

  async function askPeerToEnable() {
    setNudge("busy");
    try {
      const res = await fetch(`/api/mentorships/${mentorshipId}/messages/keys`, { method: "POST" });
      setNudge(res.ok ? "sent" : "idle");
    } catch {
      setNudge("idle");
    }
  }

  if (loadError && messages === null) {
    return <MentorErrorState message={loadError} onRetry={() => { setLoadError(null); fetchLatest(true); }} />;
  }
  if (messages === null || !keys) return <LoadingBlock />;

  const tooLong = draft.trim().length > MAX_LEN;
  const hasText = !!draft.trim() && !tooLong;

  return (
    <div className="mentor-chat">
      <p className="mentor-e2ee-line">
        <Lock {...META_ICON} aria-hidden />
        <span>رمزگذاری سرتاسری؛ متن پیام‌ها فقط روی دستگاه تو و {peerLabel} خوانده می‌شود</span>
        <button type="button" className="mentor-text-btn" onClick={() => setSettingsOpen(true)}>جزئیات</button>
      </p>

      {peerChanged && (
        <p className="mentor-e2ee-line is-warn" role="status">
          <ShieldAlert {...META_ICON} aria-hidden />
          <span>کلید رمزگذاری {peerLabel} عوض شده است؛ اگر خودش کلید تازه نساخته، کد امنیتی را با او مقایسه کن</span>
          <button type="button" className="mentor-text-btn" onClick={async () => { await cipher?.acceptPeerKey(); setPeerChanged(false); }}>متوجه شدم</button>
        </p>
      )}

      <div className="support-thread thin-scroll" ref={threadRef} onScroll={onScroll} aria-live="polite">
        {hasMore && (
          <button type="button" className="mentor-text-btn mentor-chat-older" onClick={loadOlder} disabled={olderBusy}>
            {olderBusy ? <Spinner size={14} /> : "نمایش پیام‌های قبلی"}
          </button>
        )}
        {olderError && <p className="mentor-field-error mentor-chat-older" role="alert">{olderError}</p>}

        {welcome && !hasMore && (
          <div className="support-msg admin mentor-msg-welcome">
            {welcome.body}
            <span className="mentor-msg-meta"><span>پیام خوش‌آمد از تنظیمات منتور؛ رمزگذاری سرتاسری ندارد</span></span>
          </div>
        )}

        {messages.length === 0 && pending.length === 0 && !welcome && <div className="mentor-chat-empty">هنوز پیامی نیست</div>}

        {messages.map((m) => {
          const o = opened[m.id];
          const body = !o ? <Spinner size={14} />
            : o.kind === "text" ? (o.committed ? o.text : <span className="mentor-msg-unreadable">این پیام با تعهد رمزنگاری‌اش نمی‌خواند و نمایش داده نمی‌شود</span>)
            : o.kind === "legacy" ? o.text
            : o.kind === "old-key" ? <span className="mentor-msg-unreadable">این پیام با کلید قبلی حساب رمز شده و دیگر خوانده نمی‌شود</span>
            : <span className="mentor-msg-unreadable">این پیام رمزگشایی نشد</span>;
          const reportable = !m.mine && o && ((o.kind === "text" && o.committed) || o.kind === "legacy");
          return (
            <div key={m.id} className={`support-msg${m.mine ? " mine" : " admin"}`}>
              {body}
              <span className="mentor-msg-meta">
                <span className="mono">{fmtMsgTime(m.createdAt)}</span>
                {m.broadcast && <Megaphone {...META_ICON} aria-label="ارسال گروهی" />}
                {o?.kind === "legacy" && <span title="پیش از رمزگذاری سرتاسری ارسال شده">بدون رمزگذاری</span>}
                {m.mine && (m.readAt
                  ? <CheckCheck {...META_ICON} aria-label="خوانده شد" />
                  : <Check {...META_ICON} aria-label="ارسال شد" />)}
                {reportable && (
                  <button
                    type="button"
                    className="mentor-msg-report"
                    onClick={() => setReport(o.kind === "text" ? { id: m.id, franking: { text: o.text, frankingKey: o.frankingKey } } : { id: m.id })}
                    aria-label="گزارش این پیام"
                    title="گزارش این پیام"
                  >
                    <Flag {...META_ICON} aria-hidden />
                  </button>
                )}
              </span>
            </div>
          );
        })}

        {pending.map((p) => (
          <div key={p.tempId} className={`support-msg mine${p.state === "failed" ? " is-failed" : ""}`}>
            {p.text}
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

      {!canSend ? (
        <div className="mentor-chat-disabled">گفت‌وگو فقط‌خواندنی است؛ ارسال پیام فقط در رابطه‌ی فعال ممکن است</div>
      ) : !peerReady ? (
        <div className="mentor-chat-disabled">
          {peerLabel} هنوز رمزگذاری سرتاسری را فعال نکرده؛ پس از فعال‌سازی، ارسال پیام باز می‌شود.{" "}
          {nudge === "sent" ? (
            <span>به {peerLabel} اطلاع داده شد</span>
          ) : (
            <button type="button" className="mentor-text-btn" onClick={askPeerToEnable} disabled={nudge === "busy"}>
              {nudge === "busy" ? <Spinner size={14} /> : <><BellRing size={14} strokeWidth={1.75} aria-hidden /> اطلاع به {peerLabel}</>}
            </button>
          )}
        </div>
      ) : (
        <>
          {isMentor && <SavedRepliesPicker onPick={(text) => setDraft((d) => (d ? d + "\n" : "") + text)} />}
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
      )}

      {report && (
        <MentorReportModal targetType="MESSAGE" targetId={report.id} franking={report.franking} onClose={() => setReport(null)} />
      )}
      {settingsOpen && (
        <MentorE2EESettings identity={identity} persistent={persistent} peerName={peerLabel} safetyCode={code} onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}
