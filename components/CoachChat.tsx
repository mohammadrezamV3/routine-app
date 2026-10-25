"use client";

// خط زمانی فضای همکاری (docs/coach-v3.md): پیام‌های رمزگذاری‌شده + رویدادهای سرور بر اساس زمان.
// منطق رمزگذاری سرتاسری عینا از ChatBody در MentorChat.tsx برداشته شده (کلیدها، polling، ارسال
// با clientId و تلاش دوباره، 409 تغییر کلید، بازرمزگذاری پیام قدیمی، گزارش با message franking)
// و فقط ظاهر (حباب‌های تازه + رویدادها + جداکننده‌ی روز) عوض شده. lib/e2ee/* دست نخورده.
import "./coach.css";
import "./coach-space.css";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m as motion } from "framer-motion";
import { AlertCircle, BellRing, Check, CheckCheck, ChevronDown, Clock, Copy, Flag, Lock, Megaphone, RefreshCw, Send, Smartphone, Trash2 } from "lucide-react";
import type { ChatMessage, MessagesResponse } from "@/lib/mentorTypes";
import type { CoachTimelineEvent } from "@/lib/coachTypes";
import { networkError, fmtDate, readApiError } from "@/lib/mentorFormat";
import { isEn, tr, iso } from "@/lib/i18n";
import { faNum, isoLocal } from "@/lib/jalali";
import { ConversationCipher, fetchConversationKeys, refreshIdentity, type ConversationKeys, type Identity, type OpenedMessage } from "@/lib/e2ee/client";
import { randomId } from "@/lib/e2ee/encoding";
import type { EncryptedMessage } from "@/lib/e2ee/core";
import type { SavedRepliesResponse, SavedReply } from "@/lib/mentorToolsTypes";
import { LoadingBlock, Spinner } from "./Spinner";
import { MentorErrorState } from "./MentorPageShell";
import { MentorConversationReportSheet, MentorReportModal, type ConversationReportCandidate } from "./MentorReportModal";
import { MentorE2EEGate } from "./MentorE2EEGate";
import { MentorE2EESettings } from "./MentorE2EESettings";
import { MentorMenuAt, type MentorMenuAction } from "./MentorKebabMenu";
import { mentorApi } from "./MentorDashKit";
import { M_DUR, mT } from "./MentorMotion";

const POLL_MS = 8000;
const MAX_LEN = 2000;
/** پیام‌های پشت‌هم از یک فرستنده با فاصله‌ی کمتر از این یک گروه‌اند */
const GROUP_GAP_MS = 5 * 60 * 1000;
const META_ICON = { size: 12, strokeWidth: 1.75 } as const;
const MENU_ICON = { size: 15, strokeWidth: 1.75, "aria-hidden": true } as const;

type Pending = {
  tempId: string;
  text: string;
  createdAt: string;
  state: "sending" | "failed";
  error?: string;
  /** متن رمزشده‌ی آماده — تلاش دوباره *همان* بسته را می‌فرستد تا سرور با clientId تکرار را تشخیص دهد */
  payload?: EncryptedMessage;
  /** کلید فرانکینگ همان بسته — برای گزارش گفت‌وگو */
  frankingKey?: string;
};

type ReportTarget = { id: string; franking?: { text: string; frankingKey: string } };
type Anchor = { top: number; bottom: number; left: number; right: number };

/** پنلی که از سرتیتر یا منوی فضا باز می‌شود */
export type CoachChatSheet = "report" | "e2ee" | null;

/** دستگیره‌ای که فضا به نوار نوشتن می‌دهد: پیشنهاد نومو، پیام آماده و ... */
export type CoachChatApi = {
  /** متن را به پایان پیش‌نویس اضافه می‌کند */
  insert: (text: string) => void;
  /** پیش‌نویس را با این متن عوض می‌کند */
  replace: (text: string) => void;
  focus: () => void;
};

export type CoachChatProps = {
  mentorshipId: string;
  peerName?: string;
  role: "MENTOR" | "STUDENT";
  events: CoachTimelineEvent[];
  renderEvent: (ev: CoachTimelineEvent) => React.ReactNode;
  sheet?: CoachChatSheet;
  onSheetClose?: () => void;
  onOpenSheet?: (s: CoachChatSheet) => void;
  /** true وقتی رشته‌ی پیام‌ها آماده است (گزارش گفت‌وگو فقط آن موقع ممکنه) */
  onReady?: (ready: boolean) => void;
  /** دکمه‌ی + ابتدای نوار نوشتن */
  renderPlus?: (api: CoachChatApi) => React.ReactNode;
  /** بالای نوار نوشتن (مثلا پیشنهاد نومو) */
  renderAbove?: (api: CoachChatApi) => React.ReactNode;
  /** پیش‌نویس اولیه (مثلا از ?draft=) */
  prefill?: string | null;
  /** وقتی true باشه (همکاری تموم شده) نوار نوشتن نیست حتی اگه سرور اجازه بده */
  readOnly?: boolean;
};

function sortByTime(a: { createdAt: string; id?: string }, b: { createdAt: string; id?: string }) {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  return (a.id || "") < (b.id || "") ? -1 : 1;
}

function hm(at: string): string {
  const d = new Date(at);
  if (isNaN(d.getTime())) return "";
  return `${faNum(String(d.getHours()).padStart(2, "0"))}:${faNum(String(d.getMinutes()).padStart(2, "0"))}`;
}

/** «امروز» / «دیروز» / تاریخ جلالی */
export function coachDayLabel(dayKey: string): string {
  const today = new Date();
  if (dayKey === isoLocal(today)) return tr("امروز", "Today");
  const y = new Date(today);
  y.setDate(y.getDate() - 1);
  if (dayKey === isoLocal(y)) return tr("دیروز", "Yesterday");
  return fmtDate(dayKey);
}

function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const on = () => setCoarse(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return coarse;
}

/** گفت‌وگو با رمزگذاری سرتاسری؛ تا کلید روی این دستگاه آماده نباشد MentorE2EEGate جایش را می‌گیرد */
export function CoachChat(props: CoachChatProps) {
  return (
    <MentorE2EEGate>
      {(identity, s) => <ChatBody key={`${identity.userId}:${identity.version}`} identity={identity} persistent={s.persistent} {...props} />}
    </MentorE2EEGate>
  );
}

type Item =
  | { key: string; t: number; type: "msg"; m: ChatMessage }
  | { key: string; t: number; type: "pending"; p: Pending }
  | { key: string; t: number; type: "event"; ev: CoachTimelineEvent };

type Row =
  | { kind: "day"; key: string; label: string }
  | { kind: "event"; key: string; ev: CoachTimelineEvent }
  | { kind: "msg"; key: string; mine: boolean; createdAt: string; tight: boolean; animate: boolean; m?: ChatMessage; p?: Pending };

const distFromBottom = () => document.documentElement.scrollHeight - window.scrollY - window.innerHeight;

function ChatBody({
  identity, persistent, mentorshipId, peerName, role, events, renderEvent, sheet = null, onSheetClose, onOpenSheet, onReady, renderPlus, renderAbove, prefill, readOnly,
}: CoachChatProps & { identity: Identity; persistent: boolean }) {
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
  const [draft, setDraft] = useState(prefill ?? "");
  const [report, setReport] = useState<ReportTarget | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [peerChanged, setPeerChanged] = useState(false);
  const [nudge, setNudge] = useState<"idle" | "busy" | "sent">("idle");
  const [menu, setMenu] = useState<{ anchor: Anchor; actions: MentorMenuAction[]; align: "start" | "end" } | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);
  const preserveFrom = useRef<number | null>(null);
  const inflight = useRef(false);
  const legacyBusy = useRef(false);
  /** پیام‌هایی که در بار اول بودند (بی‌انیمیشن)؛ پیام‌های بعدی نرم وارد می‌شوند */
  const settled = useRef<Set<string> | null>(null);
  const lastCount = useRef(0);
  const smoothNext = useRef(false);
  const coarse = useCoarsePointer();

  const cipher = useMemo(() => (keys ? new ConversationCipher(identity, mentorshipId, keys) : null), [identity, mentorshipId, keys]);
  const peerReady = !!cipher?.peerCurrent();
  const isMentor = role === "MENTOR";
  const peerLabel = peerName || (isMentor ? tr("شاگرد", "Student") : tr("مربی", "Mentor"));

  // پیش‌نویس ?draft= ممکنه بعد از mount برسه (خوندن آدرس بعد از اولین داده)
  useEffect(() => {
    if (prefill) setDraft((d) => d || prefill);
  }, [prefill]);

  useEffect(() => {
    onReady?.(true);
    return () => onReady?.(false);
  }, [onReady]);

  const loadKeys = useCallback(async () => {
    const k = await fetchConversationKeys(mentorshipId);
    // اگر کلید خودم روی سرور با کلید این دستگاه نمی‌خواند (بازنشانی روی دستگاه دیگر)
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
        if (initial) setLoadError(await readApiError(res, tr("گفت‌وگو باز نشد؛ دوباره امتحان کن", "Couldn't open the chat. Try again")));
        return;
      }
      const data: MessagesResponse = await res.json();
      if (initial) {
        setHasMore(!!data.hasMore);
        if (!settled.current) settled.current = new Set((data.messages || []).map((m) => m.id));
      }
      setCanSend(!!data.canSend);
      setWelcome(data.welcome ?? null);
      setLoadError(null);
      merge(data.messages || []);
    } catch (e) {
      if (initial) setLoadError(e instanceof Error && e.message ? e.message : networkError());
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
    settled.current = null;
    fetchLatest(true);
  }, [fetchLatest]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      fetchLatest();
      // تا وقتی طرف مقابل کلید ندارد، کلیدها هم با هر دور تازه می‌شوند
      if (!peerReady) loadKeys().catch(() => {});
    };
    const t = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", tick); };
  }, [fetchLatest, loadKeys, peerReady]);

  // رمزگشایی پیام‌های تازه (و دوباره، وقتی کلیدهای طرف مقابل عوض شد)
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

  // کد امنیتی و تشخیص تغییر کلید طرف مقابل (TOFU)
  useEffect(() => {
    if (!cipher) return;
    let cancelled = false;
    cipher.safetyCode().then((c) => { if (!cancelled) setCode(c); });
    cipher.peerKeyChanged().then((ch) => { if (!cancelled) setPeerChanged(ch); });
    return () => { cancelled = true; };
  }, [cipher]);

  // بازرمزگذاری پیام‌های قدیمی متن‌ساده، بی‌صدا در پس‌زمینه
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
          const r2 = await fetch(`/api/mentorships/${mentorshipId}/messages`, { cache: "no-store" });
          if (r2.ok) {
            const d: MessagesResponse = await r2.json();
            const ids = new Set(legacy.map((m) => m.id));
            setOpened((prev) => { const n = { ...prev }; ids.forEach((id) => delete n[id]); return n; });
            merge(d.messages || []);
          }
        }
      } catch {
        // دور بعد دوباره
      } finally {
        legacyBusy.current = false;
      }
    })();
  }, [cipher, peerReady, messages, mentorshipId, merge]);

  // ── اسکرول صفحه: ماندن در پایین، حفظ جا هنگام بار قدیمی‌ترها ──
  useEffect(() => {
    const onScroll = () => {
      const d = distFromBottom();
      stickToBottom.current = d < 100;
      setAtBottom(d < 260);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const total = (messages?.length ?? 0) + pending.length + events.length;
  useLayoutEffect(() => {
    const grew = total > lastCount.current;
    lastCount.current = total;
    if (preserveFrom.current !== null) {
      window.scrollTo(0, document.documentElement.scrollHeight - preserveFrom.current);
      preserveFrom.current = null;
      return;
    }
    if (stickToBottom.current && messages) {
      const smooth = smoothNext.current && grew;
      smoothNext.current = true;
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    }
  }, [total, opened, messages]);

  function jumpToBottom() {
    stickToBottom.current = true;
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  }

  async function loadOlder() {
    if (!messages?.length || olderBusy) return;
    setOlderBusy(true);
    setOlderError(null);
    try {
      const res = await fetch(`/api/mentorships/${mentorshipId}/messages?before=${encodeURIComponent(messages[0].createdAt)}`, { cache: "no-store" });
      if (!res.ok) { setOlderError(await readApiError(res, tr("پیام‌های قبلی دریافت نشد؛ دوباره تلاش کن", "Couldn't load earlier messages. Try again"))); return; }
      const data: MessagesResponse = await res.json();
      preserveFrom.current = document.documentElement.scrollHeight - window.scrollY;
      for (const m of data.messages || []) settled.current?.add(m.id);
      setHasMore(!!data.hasMore);
      merge(data.messages || []);
    } catch {
      setOlderError(networkError());
    } finally {
      setOlderBusy(false);
    }
  }

  const fail = (tempId: string, error: string, payload?: EncryptedMessage) =>
    setPending((prev) => prev.map((x) => (x.tempId === tempId ? { ...x, state: "failed", error, payload: payload ?? x.payload } : x)));

  async function deliver(p: Pending, retriedKeys = false) {
    setPending((prev) => prev.map((x) => (x.tempId === p.tempId ? { ...x, state: "sending", error: undefined } : x)));
    let payload = p.payload;
    let frankingKey = p.frankingKey;
    try {
      if (!payload) {
        if (!cipher) throw new Error(tr("گفت‌وگو داره آماده می‌شه، چند لحظه دیگه دوباره امتحان کن", "The chat is getting ready. Try again in a moment"));
        const { frankingKey: fk, ...enc } = await cipher.encrypt(p.text, randomId());
        payload = enc;
        frankingKey = fk;
        setPending((prev) => prev.map((x) => (x.tempId === p.tempId ? { ...x, payload, frankingKey: fk } : x)));
      }
      const res = await fetch(`/api/mentorships/${mentorshipId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.clone().json().catch(() => null);
        // کلید یکی از دو طرف عوض شده: کلیدها را تازه کن و یک بار با کلید درست دوباره رمز کن
        if (res.status === 409 && (data?.code === "KEY_CHANGED" || data?.code === "PEER_NO_KEY") && !retriedKeys) {
          const k = await loadKeys();
          if (k && data?.code === "KEY_CHANGED") {
            const fresh = new ConversationCipher(identity, mentorshipId, k);
            const { frankingKey: fk2, ...enc } = await fresh.encrypt(p.text, randomId());
            return deliver({ ...p, payload: enc, frankingKey: fk2 }, true);
          }
        }
        const msg = await readApiError(res, tr("پیام نرفت؛ دوباره امتحان کن", "Message not sent. Try again"));
        fail(p.tempId, msg, payload);
        if (res.status === 403 || res.status === 404 || (res.status === 409 && !data?.code)) setCanSend(false);
        return;
      }
      const data: { message: ChatMessage } = await res.json();
      if (data?.message) {
        // متن پیام خودم را همین‌جا داریم؛ بدون رمزگشایی دوباره نمایش داده می‌شود
        settled.current?.add(data.message.id);
        setOpened((prev) => ({ ...prev, [data.message.id]: { kind: "text", text: p.text, frankingKey: frankingKey ?? "", committed: true } }));
        merge([data.message]);
      }
      setPending((prev) => prev.filter((x) => x.tempId !== p.tempId));
    } catch (e) {
      fail(p.tempId, e instanceof TypeError ? networkError() : e instanceof Error && e.message ? e.message : networkError(), payload);
    }
  }

  function autoGrow() {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 148)}px`;
  }
  useLayoutEffect(autoGrow, [draft]);

  function send() {
    const text = draft.trim();
    if (!text) { inputRef.current?.focus(); return; }
    if (!canSend || !peerReady || text.length > MAX_LEN) return;
    const p: Pending = { tempId: `tmp-${randomId(8)}`, text, createdAt: new Date().toISOString(), state: "sending" };
    stickToBottom.current = true;
    setPending((prev) => [...prev, p]);
    setDraft("");
    deliver(p);
    // روی موبایل کیبورد باز می‌ماند (مثل پیام‌رسان‌ها)
    inputRef.current?.focus();
  }

  const api = useMemo<CoachChatApi>(() => ({
    insert: (text) => { setDraft((d) => (d ? `${d}\n${text}` : text)); inputRef.current?.focus(); },
    replace: (text) => { setDraft(text); inputRef.current?.focus(); },
    focus: () => inputRef.current?.focus(),
  }), []);

  async function askPeerToEnable() {
    setNudge("busy");
    try {
      const res = await fetch(`/api/mentorships/${mentorshipId}/messages/keys`, { method: "POST" });
      setNudge(res.ok ? "sent" : "idle");
    } catch {
      setNudge("idle");
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // مرورگر اجازه نداد؛ متن همچنان قابل انتخاب است
    }
  }

  function openMenuFor(e: React.MouseEvent<HTMLElement>, mine: boolean, actions: MentorMenuAction[]) {
    if (actions.length === 0) return;
    if (e.type === "click" && typeof window !== "undefined" && window.getSelection()?.toString()) return;
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    setMenu({ anchor: { top: r.top, bottom: r.bottom, left: r.left, right: r.right }, actions, align: mine !== isEn() ? "start" : "end" });
  }

  // ── ردیف‌های نمایش: پیام + رویداد بر اساس زمان، جداکننده‌ی روز، گروه‌بندی پشت‌هم ──
  const rows = useMemo<Row[]>(() => {
    const oldest = hasMore && messages?.length ? messages[0].createdAt : null;
    const items: Item[] = [
      ...(messages ?? []).map((m): Item => ({ key: m.id, t: new Date(m.createdAt).getTime(), type: "msg", m })),
      ...pending.map((p): Item => ({ key: p.tempId, t: new Date(p.createdAt).getTime(), type: "pending", p })),
      ...events.filter((ev) => !oldest || ev.at >= oldest).map((ev): Item => ({ key: `ev-${ev.id}`, t: new Date(ev.at).getTime(), type: "event", ev })),
    ].filter((it) => Number.isFinite(it.t)).sort((a, b) => a.t - b.t);
    const out: Row[] = [];
    let prevDay = "";
    const mineOf = (it?: Item) => (it?.type === "msg" ? it.m.mine : it?.type === "pending" ? true : null);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const at = it.type === "msg" ? it.m.createdAt : it.type === "pending" ? it.p.createdAt : it.ev.at;
      const day = isoLocal(new Date(at));
      if (day !== prevDay) {
        out.push({ kind: "day", key: `d-${day}`, label: coachDayLabel(day) });
        prevDay = day;
      }
      if (it.type === "event") { out.push({ kind: "event", key: it.key, ev: it.ev }); continue; }
      const prev = items[i - 1];
      const tight = mineOf(prev) === mineOf(it) && mineOf(prev) !== null && it.t - prev.t < GROUP_GAP_MS && isoLocal(new Date(prev.t)) === day;
      const animate = it.type === "pending" || (!!settled.current && !settled.current.has(it.key));
      out.push({ kind: "msg", key: it.key, mine: mineOf(it) as boolean, createdAt: at, tight, animate, m: it.type === "msg" ? it.m : undefined, p: it.type === "pending" ? it.p : undefined });
    }
    return out;
  }, [messages, pending, events, hasMore]);

  // نامزدهای «گزارش گفت‌وگو»: پیام‌های خوانا با کلید فرانکینگ (یا قدیمی)، 50تای آخر
  const reportCandidates = useMemo<ConversationReportCandidate[]>(() => {
    const out: ConversationReportCandidate[] = [];
    for (const m of messages ?? []) {
      const o = opened[m.id];
      if (!o) continue;
      if (o.kind === "text" && o.committed && o.frankingKey) out.push({ id: m.id, mine: m.mine, createdAt: m.createdAt, text: o.text, frankingKey: o.frankingKey });
      else if (o.kind === "legacy") out.push({ id: m.id, mine: m.mine, createdAt: m.createdAt, text: o.text });
    }
    return out.slice(-50);
  }, [messages, opened]);

  if (loadError && messages === null) {
    return <MentorErrorState message={loadError} onRetry={() => { setLoadError(null); fetchLatest(true); }} />;
  }
  if (messages === null || !keys) return <LoadingBlock />;

  const tooLong = draft.trim().length > MAX_LEN;
  const hasText = !!draft.trim() && !tooLong;
  const empty = messages.length === 0 && pending.length === 0 && events.length === 0 && !welcome;
  const welcomeDay = welcome ? isoLocal(new Date(welcome.at)) : null;
  const sendOpen = canSend && !readOnly;

  return (
    <div className="cs-chat">
      <div className="cs-thread" role="log" aria-live="polite" aria-label={tr(`گفت‌وگو با ${peerLabel}`, `Chat with ${iso(peerLabel)}`)}>
        {hasMore && (
          <div className="cs-older">
            {olderError ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setOlderError(null); loadOlder(); }}>
                <RefreshCw size={14} strokeWidth={1.75} aria-hidden /> {olderError}
              </button>
            ) : (
              <button type="button" className="btn btn-ghost btn-sm" onClick={loadOlder} disabled={olderBusy}>
                {olderBusy ? <Spinner size={14} /> : tr("پیام‌های قبلی", "Earlier messages")}
              </button>
            )}
          </div>
        )}

        {welcome && !hasMore && welcomeDay && <div className="ch-day-sep">{coachDayLabel(welcomeDay)}</div>}
        {welcome && !hasMore && (
          <div className="ch-bubble-in cs-bubble cs-welcome">
            <span className="cs-bubble-label">{tr("پیام خوش‌آمد", "Welcome message")}</span>
            <span dir="auto">{welcome.body}</span>
          </div>
        )}

        {empty && <div className="ch-day-sep">{tr("هنوز پیامی نیست؛ اولین پیام رو بفرست", "No messages yet. Send the first one")}</div>}

        {rows.map((r, idx) => {
          if (r.kind === "day") {
            // روز پیام خوش‌آمد بالای خودش آمده؛ جداکننده‌ی تکراری نمی‌خواهیم
            if (idx === 0 && welcome && !hasMore && r.key === `d-${welcomeDay}`) return null;
            return <div key={r.key} className="ch-day-sep">{r.label}</div>;
          }
          if (r.kind === "event") return <div key={r.key} className="cs-event">{renderEvent(r.ev)}</div>;

          const motionProps = r.animate
            ? { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0, transition: mT(M_DUR.base) } }
            : { initial: false as const };
          const cls = (mine: boolean, extra = "") => `${mine ? "ch-bubble-out" : "ch-bubble-in"} cs-bubble${r.tight ? " is-tight" : ""}${extra}`;

          if (r.p) {
            const p = r.p;
            const actions: MentorMenuAction[] = p.state === "failed"
              ? [
                  ...(sendOpen ? [{ label: tr("ارسال دوباره", "Send again"), icon: <RefreshCw {...MENU_ICON} />, onClick: () => deliver(p) }] : []),
                  { label: tr("کپی متن", "Copy text"), icon: <Copy {...MENU_ICON} />, onClick: () => copyText(p.text) },
                  { label: tr("حذف پیام", "Delete message"), icon: <Trash2 {...MENU_ICON} />, danger: true, onClick: () => setPending((prev) => prev.filter((x) => x.tempId !== p.tempId)) },
                ]
              : [];
            return (
              <motion.div
                key={r.key}
                className={cls(true, p.state === "failed" ? " is-failed" : "")}
                {...motionProps}
                tabIndex={actions.length ? 0 : undefined}
                onClick={(e) => openMenuFor(e, true, actions)}
                onContextMenu={(e) => openMenuFor(e, true, actions)}
              >
                <span dir="auto">{p.text}</span>
                <span className="cs-meta">
                  <span>{hm(p.createdAt)}</span>
                  {p.state === "sending"
                    ? <span className="cs-meta-state"><Clock {...META_ICON} aria-hidden /> {tr("در حال فرستادن", "Sending")}</span>
                    : <span className="cs-meta-state is-fail" role="alert"><AlertCircle {...META_ICON} aria-hidden /> {p.error || tr("نرفت", "Not sent")}{tr("؛ برای تلاش دوباره بزن", ". Tap to retry")}</span>}
                </span>
              </motion.div>
            );
          }

          const m = r.m!;
          const o = opened[m.id];
          const readable = o && ((o.kind === "text" && o.committed) || o.kind === "legacy");
          const text = readable ? (o as { text: string }).text : null;
          const body = !o ? <Spinner size={14} />
            : o.kind === "text" ? (o.committed ? o.text : <span className="cs-unreadable">{tr("این پیام نمایش داده نمی‌شه چون درست نرسیده", "This message can't be shown because it didn't arrive correctly")}</span>)
            : o.kind === "legacy" ? o.text
            : o.kind === "old-key" ? <span className="cs-unreadable">{tr("این پیام دیگه روی این دستگاه باز نمی‌شه", "This message can no longer be opened on this device")}</span>
            : <span className="cs-unreadable">{tr("این پیام باز نشد", "This message couldn't be opened")}</span>;
          const actions: MentorMenuAction[] = [];
          if (text) actions.push({ label: tr("کپی متن", "Copy text"), icon: <Copy {...MENU_ICON} />, onClick: () => copyText(text) });
          if (!m.mine && readable) {
            actions.push({
              label: tr("گزارش این پیام", "Report this message"),
              icon: <Flag {...MENU_ICON} />,
              danger: true,
              onClick: () => setReport(o.kind === "text" ? { id: m.id, franking: { text: o.text, frankingKey: o.frankingKey } } : { id: m.id }),
            });
          }
          return (
            <motion.div
              key={r.key}
              className={cls(m.mine)}
              {...motionProps}
              tabIndex={actions.length ? 0 : undefined}
              onClick={(e) => openMenuFor(e, m.mine, actions)}
              onContextMenu={(e) => openMenuFor(e, m.mine, actions)}
            >
              <span dir="auto">{body}</span>
              <span className="cs-meta">
                {m.broadcast && <span className="cs-meta-state"><Megaphone {...META_ICON} aria-hidden /> {tr("پیام به همه", "Message to all")}</span>}
                {o?.kind === "legacy" && <span>{tr("پیام قدیمی", "Old message")}</span>}
                <span>{hm(m.createdAt)}</span>
                {m.mine && (m.readAt
                  ? <span className="cs-meta-state"><CheckCheck {...META_ICON} aria-hidden /> {tr("خونده شد", "Read")}</span>
                  : <span className="cs-meta-state"><Check {...META_ICON} aria-hidden /> {tr("رسید", "Delivered")}</span>)}
              </span>
            </motion.div>
          );
        })}
      </div>

      <div className="cs-dock">
        <AnimatePresence>
          {!atBottom && (
            <motion.button
              key="jump"
              type="button"
              className="btn btn-outline btn-icon btn-round cs-jump"
              onClick={jumpToBottom}
              aria-label={tr("جدیدترین پیام", "Latest message")}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: mT(M_DUR.fast) }}
              exit={{ opacity: 0, y: 8, transition: mT(0.12) }}
            >
              <ChevronDown size={20} strokeWidth={1.75} aria-hidden />
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {copied && (
            <motion.div key="copied" className="cs-toast" role="status" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: mT(M_DUR.fast) }} exit={{ opacity: 0, transition: mT(0.12) }}>
              {tr("متن کپی شد", "Text copied")}
            </motion.div>
          )}
        </AnimatePresence>

        {peerChanged && (
          <div className="ch-card cs-note" role="status">
            <Smartphone size={18} strokeWidth={1.75} aria-hidden />
            <span className="cs-note-body">
              <span>{tr(`${peerLabel} با یه دستگاه تازه وارد شده. اگه مطمئن نیستی، کد تایید رو با هم چک کنید.`, `${iso(peerLabel)} signed in on a new device. If you're not sure it's them, check the verification code together.`)}</span>
              <span className="cs-note-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onOpenSheet?.("e2ee")}>{tr("چک کردن", "Check")}</button>
                <button type="button" className="btn btn-tonal btn-sm" onClick={async () => { await cipher?.acceptPeerKey(); setPeerChanged(false); }}>{tr("باشه", "OK")}</button>
              </span>
            </span>
          </div>
        )}

        {!sendOpen ? (
          <div className="cs-notice">
            <Lock size={14} strokeWidth={1.75} aria-hidden />
            <span>{tr("همکاری تموم شده، فقط می‌تونی پیام‌های قبلی رو ببینی", "The mentorship has ended. You can only see earlier messages")}</span>
          </div>
        ) : !peerReady ? (
          <div className="cs-notice">
            <span>{tr(`${peerLabel} هنوز وارد بخش مربی نشده؛ با اولین ورودش می‌تونی پیام بدی`, `${iso(peerLabel)} hasn't opened the mentor section yet. You can message them once they do`)}</span>
            {nudge === "sent" ? (
              <span className="cs-muted">{tr(`به ${peerLabel} خبر دادیم`, `We let ${iso(peerLabel)} know`)}</span>
            ) : (
              <button type="button" className="btn btn-tonal btn-sm" onClick={askPeerToEnable} disabled={nudge === "busy"}>
                {nudge === "busy" ? <Spinner size={14} /> : <><BellRing size={14} strokeWidth={1.75} aria-hidden /> {tr(`خبر دادن به ${peerLabel}`, `Notify ${iso(peerLabel)}`)}</>}
              </button>
            )}
          </div>
        ) : (
          <>
            {renderAbove?.(api)}
            {tooLong && <p className="cs-notice is-error" role="alert">{tr(`پیام حداکثر ${faNum(MAX_LEN)} حرف می‌شه`, `Messages can be up to ${faNum(MAX_LEN)} characters`)}</p>}
            <form className="cs-composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
              {renderPlus?.(api)}
              <textarea
                ref={inputRef}
                className="wsearch-newform-name cs-input"
                rows={1}
                value={draft}
                maxLength={MAX_LEN + 200}
                placeholder={tr("پیام بنویس...", "Write a message...")}
                aria-label={tr(`پیام به ${peerLabel}`, `Message to ${iso(peerLabel)}`)}
                enterKeyHint={coarse ? "enter" : "send"}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  // دسکتاپ: Enter ارسال، Shift+Enter خط تازه. موبایل: Enter خط تازه، ارسال با دکمه.
                  if (e.key === "Enter" && !e.shiftKey && !coarse && !e.nativeEvent.isComposing) { e.preventDefault(); send(); }
                }}
              />
              <button type="submit" className="btn btn-primary btn-icon btn-round" aria-label={tr("فرستادن پیام", "Send message")} disabled={!hasText}>
                <Send size={18} strokeWidth={2} className="dir-flip" aria-hidden />
              </button>
            </form>
          </>
        )}
      </div>

      <MentorMenuAt anchor={menu?.anchor ?? null} actions={menu?.actions ?? []} align={menu?.align ?? "end"} label={tr("گزینه‌های پیام", "Message options")} onClose={() => setMenu(null)} />

      {report && <MentorReportModal targetType="MESSAGE" targetId={report.id} franking={report.franking} onClose={() => setReport(null)} />}
      <MentorConversationReportSheet
        open={sheet === "report"}
        mentorshipId={mentorshipId}
        peerName={peerLabel}
        candidates={reportCandidates}
        onClose={() => onSheetClose?.()}
      />
      {sheet === "e2ee" && (
        <MentorE2EESettings identity={identity} persistent={persistent} peerName={peerLabel} safetyCode={code} onClose={() => onSheetClose?.()} />
      )}
    </div>
  );
}

/** فهرست پیام‌های آماده‌ی مربی؛ هر کدام با یک زدن در پیش‌نویس می‌نشیند */
let repliesCache: SavedReply[] | null = null;
export function CoachSavedReplies({ onPick }: { onPick: (text: string) => void }) {
  const [list, setList] = useState<SavedReply[] | null>(repliesCache);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (repliesCache) return;
    mentorApi<SavedRepliesResponse>("/api/mentor/replies").then((r) => {
      if (!r.ok) { setError(r.error); return; }
      repliesCache = r.data.replies;
      setList(r.data.replies);
    });
  }, []);
  if (error) return <div className="form-inline-error" role="alert">{error}</div>;
  if (!list) return <div className="cs-replies-loading"><Spinner size={18} /></div>;
  if (list.length === 0) {
    return <p className="cs-muted">{tr("هنوز پیام آماده‌ای نداری؛ از صفحه‌ی من اضافه کن", "You have no saved replies yet. Add some from My page")}</p>;
  }
  return (
    <div className="cs-replies" role="list" aria-label={tr("پیام آماده", "Saved replies")}>
      {list.map((r) => (
        <button key={r.id} type="button" role="listitem" className="btn btn-outline btn-sm" title={r.body} onClick={() => onPick(r.body)}>
          {r.title}
        </button>
      ))}
    </div>
  );
}
