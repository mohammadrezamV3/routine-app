import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Flag, Send, ShieldAlert, Trash2 } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import BottomSheet from "@/components/BottomSheet";
import { faNum } from "@/lib/jalali";
import { useNetworkStatus } from "@/lib/useNetworkStatus";
import {
  SOCIAL_CHAT_MAX_BODY,
  SOCIAL_CHAT_PAGE_SIZE,
  SOCIAL_CHAT_POLL_MS,
  SOCIAL_CHAT_REPORT_REASONS,
  type SocialChatMessage,
  type SocialChatModeration,
  type SocialChatReportReason,
  type SocialChatRoomsResponse,
} from "@/lib/social-contract";
import { useSocialApi } from "../api";
import { cacheKeys, readCache, writeCache } from "../db";
import { describeSocialError, isModuleLocked, isOffline, isRulesNotAccepted, NEED_INTERNET } from "../errors";
import { useCachedResource, usePageVisible } from "../hooks";
import { lastCreatedAt, mergeMessages, trimForCache, withoutMessage } from "../logic";
import { ActionButton, EmptyState, ErrorNotice, Loading, LockedState, StaleNotice } from "../components/SocialUi";

type RoomCache = {
  messages: SocialChatMessage[];
  moderation: SocialChatModeration | null;
  rulesAccepted: boolean;
  hasMore: boolean;
};

function timeLabel(iso: string) {
  const d = new Date(iso);
  return faNum(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
}

/**
 * اتاقِ گفت‌وگوی یک نماد. «زنده» با پولینگِ `since` هر چند ثانیه — فقط وقتی
 * صفحه دیده می‌شه و آنلاینیم (وبِ SymbolChatPanel هم پولینگه، نه SSE).
 * آفلاین: آخرین پیام‌های کش‌شده نمایش داده می‌شن؛ ارسال/گزارش/حذف «نیاز به اینترنت».
 */
export default function ChatRoomScreen() {
  const { symbol: rawSymbol = "" } = useParams();
  const symbol = rawSymbol.toUpperCase();
  const api = useSocialApi();
  const online = useNetworkStatus();
  const visible = usePageVisible();
  const rooms = useCachedResource<SocialChatRoomsResponse>(cacheKeys.rooms, () => api.chatRooms());

  const [room, setRoom] = useState<RoomCache | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [reporting, setReporting] = useState<SocialChatMessage | null>(null);
  const roomRef = useRef<RoomCache | null>(null);
  roomRef.current = room;
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const stickToBottom = useRef(true);

  const commit = useCallback(
    (next: RoomCache) => {
      setRoom(next);
      void writeCache(cacheKeys.chat(symbol), { ...next, messages: trimForCache(next.messages) });
    },
    [symbol]
  );

  // بارگذاریِ اول: کش، بعد سرور
  useEffect(() => {
    let cancelled = false;
    setRoom(null);
    setLoading(true);
    setLocked(false);
    setError(null);
    stickToBottom.current = true;
    void (async () => {
      const cached = await readCache<RoomCache>(cacheKeys.chat(symbol));
      if (cancelled) return;
      if (cached) {
        setRoom(cached.value);
        setFromCache(true);
      }
      if (!online) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.chat({ symbol, limit: SOCIAL_CHAT_PAGE_SIZE });
        if (cancelled) return;
        commit({ messages: res.messages, moderation: res.moderation, rulesAccepted: res.rulesAccepted, hasMore: res.hasMore });
        setFromCache(false);
      } catch (err) {
        if (cancelled) return;
        if (isModuleLocked(err)) setLocked(true);
        else if (!isOffline(err)) setError(describeSocialError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, online]);

  // پولینگ — فقط جدیدترها؛ خطای موقت چشمک نمی‌زنه
  useEffect(() => {
    if (!online || !visible || locked) return;
    let stopped = false;
    const tick = async () => {
      const cur = roomRef.current;
      if (!cur || stopped) return;
      try {
        const res = await api.chat({ symbol, since: lastCreatedAt(cur.messages) });
        if (stopped) return;
        const latest = roomRef.current ?? cur;
        commit({ ...latest, messages: mergeMessages(latest.messages, res.messages), moderation: res.moderation, rulesAccepted: res.rulesAccepted });
        setFromCache(false);
      } catch {
        /* پولینگِ پس‌زمینه */
      }
    };
    void tick();
    const id = setInterval(tick, SOCIAL_CHAT_POLL_MS);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [api, symbol, online, visible, locked, commit]);

  useEffect(() => {
    if (stickToBottom.current) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [room?.messages.length]);

  async function loadOlder() {
    const cur = roomRef.current;
    if (!cur?.messages.length || busy) return;
    setBusy("older");
    stickToBottom.current = false;
    try {
      const res = await api.chat({ symbol, before: cur.messages[0].createdAt, limit: SOCIAL_CHAT_PAGE_SIZE });
      const latest = roomRef.current ?? cur;
      commit({ ...latest, messages: mergeMessages(latest.messages, res.messages), hasMore: res.hasMore });
    } catch (err) {
      setError(describeSocialError(err));
    } finally {
      setBusy(null);
    }
  }

  async function send() {
    const body = draft.trim();
    const cur = roomRef.current;
    if (!body || busy || !cur) return;
    setBusy("send");
    setError(null);
    stickToBottom.current = true;
    try {
      const res = await api.sendChat(symbol, body);
      const latest = roomRef.current ?? cur;
      commit({ ...latest, messages: mergeMessages(latest.messages, [res.message]) });
      setDraft("");
    } catch (err) {
      if (isRulesNotAccepted(err)) commit({ ...(roomRef.current ?? cur), rulesAccepted: false });
      setError(describeSocialError(err));
    } finally {
      setBusy(null);
    }
  }

  async function acceptRules() {
    const cur = roomRef.current;
    if (busy || !cur) return;
    setBusy("rules");
    try {
      await api.acceptRules();
      commit({ ...(roomRef.current ?? cur), rulesAccepted: true });
    } catch (err) {
      setError(describeSocialError(err));
    } finally {
      setBusy(null);
    }
  }

  async function ackWarning() {
    const cur = roomRef.current;
    if (busy || !cur?.moderation) return;
    setBusy("ack");
    try {
      await api.ackWarning();
      const latest = roomRef.current ?? cur;
      commit({ ...latest, moderation: latest.moderation ? { ...latest.moderation, warning: null } : null });
    } catch (err) {
      setError(describeSocialError(err));
    } finally {
      setBusy(null);
    }
  }

  async function remove(m: SocialChatMessage) {
    const cur = roomRef.current;
    if (busy || !cur) return;
    setBusy(`del:${m.id}`);
    try {
      await api.deleteChat(m.id);
      commit({ ...(roomRef.current ?? cur), messages: withoutMessage((roomRef.current ?? cur).messages, m.id) });
    } catch (err) {
      setError(describeSocialError(err));
    } finally {
      setBusy(null);
    }
  }

  async function submitReport(reason: SocialChatReportReason, note: string) {
    const target = reporting;
    const cur = roomRef.current;
    if (!target || !cur || busy) return;
    setBusy("report");
    try {
      await api.reportChat({ messageId: target.id, reason, note: note.trim() || undefined });
      // سرور پیامِ گزارش‌شده رو همون لحظه (نرم) حذف می‌کنه
      commit({ ...(roomRef.current ?? cur), messages: withoutMessage((roomRef.current ?? cur).messages, target.id) });
      setReporting(null);
    } catch (err) {
      setError(describeSocialError(err));
    } finally {
      setBusy(null);
    }
  }

  if (locked) {
    return (
      <div>
        <AppHeader title={symbol} showBack />
        <LockedState hint="گفت‌وگوی نمادها بخشی از ماژولِ ترید است." />
      </div>
    );
  }

  const moderation = room?.moderation ?? null;
  const rules = rooms.data?.rules ?? [];
  const label = rooms.data?.rooms.find((r) => r.symbol === symbol)?.label;

  return (
    <div className="flex flex-col" style={{ minHeight: "100dvh" }}>
      <AppHeader title={label ? `${symbol} · ${label}` : symbol} showBack />
      <main className="flex-1 px-4 pt-3">
        <StaleNotice online={online} staleSince={fromCache ? "cache" : null} />
        <ErrorNotice message={error} />

        {moderation?.warning && (
          <div className="mb-3 rounded-card border p-3 font-vazir text-[12.5px]" style={{ borderColor: "var(--sun)", color: "var(--text)" }} role="alert">
            <div className="mb-1 flex items-center gap-1.5 font-semibold">
              <ShieldAlert size={15} color="var(--sun)" /> اخطار از طرفِ مدیریت
            </div>
            {moderation.warning.note && <p className="mb-2 leading-6">{moderation.warning.note}</p>}
            <ActionButton online={online} busy={busy === "ack"} tone="ghost" onClick={ackWarning}>
              متوجه شدم
            </ActionButton>
          </div>
        )}

        {room?.hasMore && (
          <div className="mb-2 flex justify-center">
            <ActionButton online={online} busy={busy === "older"} tone="ghost" onClick={loadOlder}>
              پیام‌های قدیمی‌تر
            </ActionButton>
          </div>
        )}

        {loading && !room ? (
          <Loading />
        ) : !room?.messages.length ? (
          <EmptyState text="هنوز پیامی در این اتاق نیست — تحلیلت را اولین نفر بنویس." />
        ) : (
          <ul className="flex flex-col gap-2 pb-3" aria-live="polite">
            {room.messages.map((m) => (
              <li key={m.id} className={m.mine ? "flex justify-start" : "flex justify-end"}>
                <div
                  className="max-w-[82%] rounded-card border px-3 py-2"
                  style={{ borderColor: m.mine ? "var(--accent)" : "var(--surface-line)" }}
                >
                  {!m.mine && (
                    <div className="mb-0.5 font-vazir text-[11.5px] font-semibold" style={{ color: "var(--accent-soft)" }}>
                      {m.authorName}
                    </div>
                  )}
                  <p className="whitespace-pre-wrap break-words font-vazir text-[13.5px] leading-6" dir="auto" style={{ color: "var(--text)" }}>
                    {m.body}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <span className="font-vazir text-[10.5px]" style={{ color: "var(--muted)" }}>
                      {timeLabel(m.createdAt)}
                    </span>
                    {m.mine ? (
                      <button
                        type="button"
                        onClick={() => remove(m)}
                        disabled={!online || !!busy}
                        aria-label="حذف پیام"
                        title={!online ? NEED_INTERNET : undefined}
                        className="disabled:opacity-40"
                      >
                        <Trash2 size={14} color="var(--muted)" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setReporting(m)}
                        disabled={!online || m.reported}
                        aria-label="گزارش پیام"
                        title={!online ? NEED_INTERNET : m.reported ? "قبلا گزارش دادی" : undefined}
                        className="disabled:opacity-40"
                      >
                        <Flag size={14} color="var(--muted)" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div ref={bottomRef} />
      </main>

      <footer
        className="sticky bottom-0 border-t px-4 pt-3"
        style={{ borderColor: "var(--surface-line)", background: "var(--surface-1)", paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        {!online ? (
          <p className="text-center font-vazir text-[12.5px]" style={{ color: "var(--muted)" }}>
            {NEED_INTERNET} — برای فرستادنِ پیام آنلاین شو
          </p>
        ) : room && !room.rulesAccepted ? (
          <div>
            <p className="mb-2 font-vazir text-[13px] font-semibold" style={{ color: "var(--text)" }}>
              قوانینِ گفت‌وگو
            </p>
            <ol className="mb-3 list-decimal ps-5 font-vazir text-[12px] leading-6" style={{ color: "var(--muted)" }}>
              {rules.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ol>
            <ActionButton online={online} busy={busy === "rules"} onClick={acceptRules}>
              قوانین را می‌پذیرم
            </ActionButton>
          </div>
        ) : moderation && !moderation.canSend ? (
          <p className="text-center font-vazir text-[12.5px]" style={{ color: "var(--pnl-loss)" }}>
            {moderation.disabled
              ? "دسترسیِ تو به این گفت‌وگو توسط مدیریت غیرفعال شده است"
              : `به‌دلیل تخلف تا ${new Date(moderation.bannedUntil!).toLocaleString("fa-IR", { timeZone: "Asia/Tehran" })} از ارسال پیام محروم شده‌ای`}
          </p>
        ) : (
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, SOCIAL_CHAT_MAX_BODY))}
              placeholder="پیامت را بنویس…"
              rows={1}
              dir="auto"
              maxLength={SOCIAL_CHAT_MAX_BODY}
              className="max-h-28 min-h-[44px] flex-1 resize-none rounded-card border bg-transparent px-3 py-2.5 font-vazir text-[14px] outline-none"
              style={{ borderColor: "var(--surface-line)", color: "var(--text)" }}
              aria-label="متن پیام"
            />
            <button
              type="submit"
              disabled={!draft.trim() || busy === "send" || !room}
              aria-label="ارسال"
              className="flex items-center justify-center rounded-full border disabled:opacity-40"
              style={{ width: 44, height: 44, borderColor: "var(--accent)" }}
            >
              <Send size={18} color="var(--accent)" style={{ transform: "scaleX(-1)" }} />
            </button>
          </form>
        )}
      </footer>

      <ReportSheet target={reporting} busy={busy === "report"} online={online} onClose={() => setReporting(null)} onSubmit={submitReport} />
    </div>
  );
}

function ReportSheet({
  target,
  busy,
  online,
  onClose,
  onSubmit,
}: {
  target: SocialChatMessage | null;
  busy: boolean;
  online: boolean;
  onClose: () => void;
  onSubmit: (reason: SocialChatReportReason, note: string) => void;
}) {
  const [reason, setReason] = useState<SocialChatReportReason>("SPAM");
  const [note, setNote] = useState("");
  useEffect(() => {
    setReason("SPAM");
    setNote("");
  }, [target?.id]);

  return (
    <BottomSheet open={!!target} onClose={() => !busy && onClose()} title="گزارشِ پیام">
      {target && (
        <div className="font-vazir">
          <p className="mb-3 line-clamp-3 text-[12.5px] leading-6" style={{ color: "var(--muted)" }} dir="auto">
            «{target.body}»
          </p>
          <div className="mb-3 flex flex-col gap-2" role="radiogroup" aria-label="دلیل گزارش">
            {SOCIAL_CHAT_REPORT_REASONS.map((r) => (
              <label key={r.value} className="flex items-center gap-2 text-[13px]" style={{ color: "var(--text)" }}>
                <input type="radio" name="reason" checked={reason === r.value} onChange={() => setReason(r.value)} />
                {r.label}
              </label>
            ))}
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 500))}
            placeholder="توضیحِ اختیاری…"
            rows={2}
            className="mb-3 w-full resize-none rounded-card border bg-transparent px-3 py-2 text-[13px] outline-none"
            style={{ borderColor: "var(--surface-line)", color: "var(--text)" }}
          />
          <p className="mb-3 text-[11.5px]" style={{ color: "var(--muted)" }}>
            پیامِ گزارش‌شده همان لحظه از اتاق برداشته می‌شود و مدیریت بررسی‌اش می‌کند.
          </p>
          <div className="flex justify-end gap-2">
            <ActionButton online={online} tone="ghost" onClick={onClose}>
              انصراف
            </ActionButton>
            <ActionButton online={online} busy={busy} tone="danger" onClick={() => onSubmit(reason, note)}>
              ارسالِ گزارش
            </ActionButton>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
