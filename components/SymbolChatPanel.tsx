"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Flag, MessagesSquare, Send, ShieldAlert, Smile, Trash2, X } from "lucide-react";
import { faNum } from "@/lib/jalali";
import {
  CHAT_REPORT_REASONS, chatRules, ChatMessageDto, ChatReportReason, ChatViewerModeration, MAX_CHAT_BODY,
} from "@/lib/tradeChat";
import { getSetting, setSetting } from "@/lib/storage";
import { SETTING_KEYS } from "@/lib/userSettingKeys";
import { pairLabel } from "@/lib/tradingView";
import { useAsyncAction } from "@/lib/useAsyncAction";
import { GoldenName } from "@/components/GoldenName";
import { Spinner } from "./Spinner";
import { tr, isEn } from "@/lib/i18n";

// چت گروهی یک نماد. هر نماد اتاق خودش را دارد و پیام‌ها بین همه‌ی
// کاربران دارای ماژول ترید مشترک است.
//
// چرا پولینگ و نه WebSocket: اپ روی یک instance Next.js پشت Nginx اجرا
// می‌شود و سوکت پایدار یعنی یک لایه‌ی زیرساختی تازه (و چسبندگی session).
// برای اتاقی که چند پیام در دقیقه دارد، یک درخواست سبک «فقط جدیدترها»
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
  // تا قوانین پذیرفته نشده، به‌جای فیلد نوشتن، خود قوانین دیده می‌شود.
  // `null` یعنی هنوز از سرور نخوانده‌ایم — در آن حالت هیچ‌کدام را نشان
  // نمی‌دهیم تا فرم نوشتن یک لحظه بپرد و بعد جایش قوانین بیاید.
  const [rulesAccepted, setRulesAccepted] = useState<boolean | null>(null);
  const [moderation, setModeration] = useState<ChatViewerModeration | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [warningDismissing, setWarningDismissing] = useState(false);
  const { pendingKey, error: actionError, run } = useAsyncAction();
  const draftInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    getSetting<boolean>(SETTING_KEYS.tradeChatRulesAccepted, false)
      .then((v) => setRulesAccepted(!!v))
      .catch(() => setRulesAccepted(false));
  }, []);

  const listRef = useRef<HTMLDivElement | null>(null);
  // آخرین زمانی که داریم — پولینگ فقط جدیدترها را می‌خواهد
  const sinceRef = useRef<string | null>(null);
  // اگر کاربر بالا رفته و دارد پیام‌های قدیمی را می‌خواند، پیام تازه
  // نباید صفحه را زیر دستش بپراند. با column-reverse (پایین‌تر)، «پایین»
  // همان scrollTop نزدیک صفر است — مرورگر خودش موقعیت اولیه را همان‌جا
  // می‌گذارد، این‌جا فقط برای پیام *تازه‌رسیده* لازم است.
  const stickToBottom = useRef(true);

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (el) el.scrollTop = 0;
  }, []);

  const load = useCallback(async (incremental: boolean) => {
    const qs = new URLSearchParams({ symbol });
    if (incremental && sinceRef.current) qs.set("since", sinceRef.current);
    const res = await fetch(`/api/trade/chat?${qs}`);
    if (!res.ok) {
      // پولینگ پس‌زمینه خطا نشان نمی‌دهد (یک شکست موقت نباید هر ۸ثانیه
      // پیام خطا چشمک بزند) ولی بارگذاری اول باید — وگرنه اتاق «خالی» به
      // نظر می‌رسد درحالی‌که واقعا درخواست شکست خورده.
      if (!incremental) { setLoading(false); setLoadError(tr("اتاق بارگذاری نشد — اتصال یا دسترسی را چک کن", "Could not load the room. Check your connection or access")); }
      return;
    }
    if (!incremental) setLoadError(null);
    const data = await res.json();
    const incoming: ChatMessageDto[] = data.messages || [];
    if (data.moderation) setModeration(data.moderation);

    setMessages((prev) => {
      if (!incremental) return incoming;
      if (!incoming.length) return prev;
      // پیام خودمان را خوش‌بینانه اضافه کرده‌ایم؛ اگر پولینگ همان را هم
      // بیاورد نباید دو بار دیده شود.
      const known = new Set(prev.map((m) => m.id));
      const fresh = incoming.filter((m) => !known.has(m.id));
      return fresh.length ? [...prev, ...fresh] : prev;
    });

    const last = incoming[incoming.length - 1];
    if (last) sinceRef.current = last.createdAt;
    if (!incremental) setLoading(false);
  }, [symbol]);

  async function dismissWarning() {
    if (warningDismissing) return;
    setWarningDismissing(true);
    try {
      await fetch("/api/trade/chat/ack-warning", { method: "POST" });
      setModeration((prev) => (prev ? { ...prev, warning: null } : prev));
    } finally {
      setWarningDismissing(false);
    }
  }

  // عوض‌شدن نماد یعنی اتاق دیگری — همه‌چیز از نو
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
    // برگشتن به تب یعنی احتمالا چند پیام عقبیم — فورا به‌روز کن
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
          <MessagesSquare size={16} /> {tr(`گفت‌وگوی ${pairLabel(symbol)}`, `${pairLabel(symbol)} chat`)}
        </span>
        <span className="trade-chat-room mono">{symbol}</span>
      </div>

      <div
        className="trade-chat-list thin-scroll"
        ref={listRef}
        onScroll={(e) => {
          // با column-reverse، «پایین» (جدیدترین) نزدیک scrollTop=۰ است؛
          // بالا رفتن یعنی scrollTop بزرگ‌تر می‌شود (برعکس chat عادی).
          stickToBottom.current = e.currentTarget.scrollTop < 60;
        }}
      >
        {loading && <div className="trade-chat-empty is-loading">{tr("در حال بارگذاری…", "Loading…")}</div>}
        {!loading && loadError && <div className="trade-chat-empty">{loadError}</div>}
        {!loading && !loadError && !messages.length && (
          <div className="trade-chat-empty">
            {tr("هنوز پیامی در این اتاق نیست — تحلیلت را اولین نفر بنویس.", "There are no messages in this room yet. Be the first to share your analysis.")}
          </div>
        )}

        {!loading && !loadError && !!messages.length && (
          <div className="trade-chat-list-inner">
            {/* طبق درخواست صریح، مثل تلگرام از پایین شروع می‌شود —
                column-reverse یعنی اولین فرزند DOM پایین‌ترین (جدیدترین)
                جا می‌گیرد، پس آرایه باید معکوس بشود (جدید→قدیم). */}
            {[...messages].reverse().map((m) => (
              <div key={m.id} className={`trade-chat-row${m.mine ? " mine" : ""}`}>
                <div className="trade-chat-meta">
                  {/* طبق درخواست صریح (مثل تلگرام): پیام خودت اسم نمی‌خواهد،
                      فقط پیام بقیه authorName دارد. */}
                  {!m.mine && <span className="trade-chat-author"><GoldenName golden={m.authorGolden} staff={m.authorStaff}>{m.authorName}</GoldenName></span>}
                  <span className="trade-chat-time mono">{timeLabel(m.createdAt)}</span>
                </div>
                <div className="trade-chat-bubble">
                  {/* متن خام رندر می‌شود، نه HTML — پیام کاربر هیچ‌وقت تفسیر نمی‌شود */}
                  <p className="trade-chat-body">{m.body}</p>
                  <div className="trade-chat-actions">
                    {m.mine ? (
                      <button
                        type="button" className="trade-chat-action"
                        onClick={() => remove(m)} disabled={pendingKey === `del:${m.id}`}
                        aria-label={tr("حذف پیام", "Delete message")}
                      >
                        {pendingKey === `del:${m.id}`
                          ? <Spinner size={12} />
                          : <Trash2 size={13} />}
                      </button>
                    ) : (
                      <button
                        type="button" className="trade-chat-action"
                        onClick={() => setReporting(m)} disabled={m.reported}
                        aria-label={m.reported ? tr("گزارش شده", "Reported") : tr("گزارش پیام", "Report message")}
                        title={m.reported ? tr("این پیام را گزارش کرده‌ای", "You reported this message") : tr("گزارش", "Report")}
                      >
                        <Flag size={13} />
                        {m.reported && <span className="trade-chat-reported">{tr("گزارش شد", "Reported")}</span>}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {actionError && <div className="trade-form-error">{actionError}</div>}

      {moderation?.warning && (
        <div className="trade-chat-warning">
          <ShieldAlert size={15} />
          <span>
            {tr("اخطار از سمت مدیریت", "Warning from the admins")}{moderation.warning.note ? `: ${moderation.warning.note}` : "."}
          </span>
          <button type="button" className="trade-chat-warning-dismiss" onClick={dismissWarning} disabled={warningDismissing} aria-label={tr("متوجه شدم", "Got it")}>
            <X size={13} />
          </button>
        </div>
      )}

      {moderation && (moderation.disabled || moderation.bannedUntil) ? (
        <div className="trade-chat-restricted">
          {moderation.disabled
            ? tr("دسترسی تو به این گفت‌وگو توسط مدیریت غیرفعال شده است.", "Your access to this chat has been disabled by the admins.")
            : (() => {
                const until = new Date(moderation.bannedUntil!).toLocaleString(isEn() ? "en-US" : "fa-IR-u-nu-latn", { timeZone: "Asia/Tehran" });
                return tr(`تا ${until} از ارسال پیام محروم شده‌ای.`, `You are banned from sending messages until ${until}.`);
              })()}
        </div>
      ) : (
        <>
          {rulesAccepted === false && (
            <div className="chat-rules">
              <div className="chat-rules-title">{tr("پیش از شرکت در گفت‌وگو", "Before joining the chat")}</div>
              <ul className="chat-rules-list">
                {chatRules().map((r) => <li key={r}>{r}</li>)}
              </ul>
              <button
                type="button"
                className="trade-primary-btn chat-rules-accept"
                onClick={() => { setRulesAccepted(true); setSetting(SETTING_KEYS.tradeChatRulesAccepted, true); }}
              >
                {tr("قوانین را می‌پذیرم", "I accept the rules")}
              </button>
            </div>
          )}

          {rulesAccepted === true && (
          <div className="trade-chat-composer-wrap">
            <form
              className="trade-chat-composer"
              onSubmit={(e) => { e.preventDefault(); send(); }}
            >
              <div className="trade-chat-input-wrap">
                <input
                  ref={draftInputRef}
                  className="wsearch-newform-name trade-glass-field trade-chat-input"
                  value={draft}
                  maxLength={MAX_CHAT_BODY}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={tr("پیام خود را بنویسید…", "Write your message…")}
                  aria-label={tr("متن پیام", "Message text")}
                />
                {/* طبق درخواست صریح: دیگر پاپ‌آپ ایموجی سفارشی نیست —
                    این دکمه فقط فوکوس می‌کند تا کیبورد خود دستگاه بیاید؛
                    از همان‌جا کاربر با دکمه‌ی ایموجی خود کیبورد می‌نویسد. */}
                <button
                  type="button" className="trade-chat-emoji-btn"
                  onClick={() => draftInputRef.current?.focus()} aria-label={tr("ایموجی", "Emoji")}
                >
                  <Smile size={18} />
                </button>
              </div>
              <button
                type="submit" className="trade-chat-send"
                disabled={!draft.trim() || pendingKey === "send"} aria-label={tr("ارسال", "Send")}
              >
                {pendingKey === "send" ? <Spinner size={18} /> : <Send size={24} strokeWidth={2.2} />}
              </button>
            </form>
          </div>
          )}
        </>
      )}

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
      <div className="trade-panel-title" style={{ marginBottom: 8 }}>{tr("گزارش پیام", "Report message")}</div>
      <div className="trade-chat-report-quote">{message.body}</div>

      <label className="exercise-form-label">{tr("دلیل گزارش", "Reason for report")}</label>
      <select
        className="wsearch-newform-name trade-glass-field"
        value={reason}
        onChange={(e) => setReason(e.target.value as ChatReportReason)}
      >
        {CHAT_REPORT_REASONS.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>

      <label className="exercise-form-label">{tr("توضیح (اختیاری)", "Details (optional)")}</label>
      <input
        className="wsearch-newform-name trade-glass-field"
        value={note} maxLength={500}
        onChange={(e) => setNote(e.target.value)}
        placeholder={tr("اگر لازم است توضیح بده", "Add details if needed")}
      />

      <div className="trade-modal-actions">
        <button type="button" className="account-outline-btn" onClick={onCancel}>{tr("لغو", "Cancel")}</button>
        <button
          type="button" className="trade-danger-btn"
          onClick={() => onSubmit(reason, note)} disabled={pending}
        >
          {pending ? <Spinner size={13} /> : tr("ارسال گزارش", "Submit report")}
        </button>
      </div>
    </div>
  );
}
