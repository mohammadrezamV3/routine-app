"use client";

import "./mentor.css";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle, BellRing, Check, CheckCheck, ChevronDown, Clock, Copy, Flag, Lock, Megaphone, MessageSquareQuote,
  RefreshCw, Send, ShieldAlert, Trash2,
} from "lucide-react";
import type { ChatMessage, MessagesResponse } from "@/lib/mentorTypes";
import { NETWORK_ERROR, fmtDate, readApiError } from "@/lib/mentorFormat";
import { faNum, isoLocal } from "@/lib/jalali";
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
/** پیام‌های پشتِ‌هم از یک فرستنده با فاصله‌ی کمتر از این یک گروه‌اند (دُمِ حباب فقط روی آخری) */
const GROUP_GAP_MS = 5 * 60 * 1000;
const META_ICON = { size: 13, strokeWidth: 1.75 } as const;
const MENU_ICON = { size: 15, strokeWidth: 1.75, "aria-hidden": true } as const;

type Pending = {
  tempId: string;
  text: string;
  createdAt: string;
  state: "sending" | "failed";
  error?: string;
  /** متنِ رمزشده‌ی آماده — تلاشِ دوباره *همان* بسته را می‌فرستد تا سرور با clientId تکرار را تشخیص دهد */
  payload?: EncryptedMessage;
  /** کلیدِ فرانکینگِ همان بسته — برای گزارشِ گفت‌وگو (پیام‌های خودم هم پیوست‌پذیرند) */
  frankingKey?: string;
};

type ReportTarget = { id: string; franking?: { text: string; frankingKey: string } };
type Anchor = { top: number; bottom: number; left: number; right: number };

/** پنلی که سرِ گفت‌وگو (منوی سه‌نقطه) باز می‌کند */
export type ChatSheet = "report" | "e2ee" | null;

function sortByTime(a: { createdAt: string; id?: string }, b: { createdAt: string; id?: string }) {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  return (a.id || "") < (b.id || "") ? -1 : 1;
}

function hm(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${faNum(String(d.getHours()).padStart(2, "0"))}:${faNum(String(d.getMinutes()).padStart(2, "0"))}`;
}

/** «امروز» / «دیروز» / «۵ مهر ۱۴۰۵» */
function dayLabel(dayKey: string): string {
  const today = new Date();
  if (dayKey === isoLocal(today)) return "امروز";
  const y = new Date(today);
  y.setDate(y.getDate() - 1);
  if (dayKey === isoLocal(y)) return "دیروز";
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

/**
 * گفت‌وگوی منتور ↔ شاگرد با رمزگذاریِ سرتاسری (docs/mentor-e2ee.md) — فقط بدنه‌ی
 * صفحه‌ی گفت‌وگو (رشته‌ی پیام‌ها + نوارِ نوشتن). سرِ صفحه (بازگشت، نام، منو)
 * در MentorChatScreen است؛ پنل‌هایی که از منو باز می‌شوند با `sheet` می‌آیند.
 *
 *  • تا کلیدِ هویت روی این دستگاه آماده نباشد، MentorE2EEGate جایش را می‌گیرد
 *    (تنها نقطه‌ی استفاده از گیت در بخشِ گفت‌وگو).
 *  • پیام روی همین دستگاه رمز می‌شود؛ سرور فقط متنِ رمزشده می‌بیند.
 *  • polling هر ~۸ ثانیه وقتی تب دیده می‌شود؛ خودِ GET پیام‌های دریافتی را «خوانده» می‌کند.
 *  • ارسالِ خوش‌بینانه با تلاشِ دوباره‌ی همان بسته (clientId ثابت → بدونِ پیامِ تکراری).
 *  • گزارشِ یک پیام یا کلِ گفت‌وگو: متن + کلیدِ فرانکینگِ هر پیام به سرور می‌رود.
 */
export function MentorChat({
  mentorshipId, peerName, sheet = null, onSheetClose, onReady,
}: {
  mentorshipId: string;
  peerName?: string;
  sheet?: ChatSheet;
  onSheetClose?: () => void;
  /** true وقتی رشته‌ی پیام‌ها آماده است (گزارشِ گفت‌وگو فقط آن موقع ممکن است) */
  onReady?: (ready: boolean) => void;
}) {
  return (
    <MentorE2EEGate>
      {(identity, s) => (
        <ChatBody
          key={`${identity.userId}:${identity.version}`}
          identity={identity}
          persistent={s.persistent}
          mentorshipId={mentorshipId}
          peerName={peerName}
          sheet={sheet}
          onSheetClose={onSheetClose}
          onReady={onReady}
        />
      )}
    </MentorE2EEGate>
  );
}

type Row =
  | { kind: "day"; key: string; label: string }
  | {
      kind: "msg"; key: string; mine: boolean; createdAt: string; first: boolean; last: boolean; animate: boolean;
      m?: ChatMessage; p?: Pending;
    };

function ChatBody({
  identity, persistent, mentorshipId, peerName, sheet, onSheetClose, onReady,
}: {
  identity: Identity;
  persistent: boolean;
  mentorshipId: string;
  peerName?: string;
  sheet: ChatSheet;
  onSheetClose?: () => void;
  onReady?: (ready: boolean) => void;
}) {
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
  const [code, setCode] = useState<string | null>(null);
  const [peerChanged, setPeerChanged] = useState(false);
  const [nudge, setNudge] = useState<"idle" | "busy" | "sent">("idle");
  const [menu, setMenu] = useState<{ anchor: Anchor; actions: MentorMenuAction[]; align: "start" | "end" } | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [newBelow, setNewBelow] = useState(0);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);
  const preserveFrom = useRef<number | null>(null);
  const inflight = useRef(false);
  const legacyBusy = useRef(false);
  /** پیام‌هایی که در بارِ اول بودند (بی‌انیمیشن)؛ پیام‌های بعدی نرم وارد می‌شوند */
  const settled = useRef<Set<string> | null>(null);
  const lastCount = useRef(0);
  const smoothNext = useRef(false);
  const coarse = useCoarsePointer();

  const cipher = useMemo(() => (keys ? new ConversationCipher(identity, mentorshipId, keys) : null), [identity, mentorshipId, keys]);
  const peerReady = !!cipher?.peerCurrent();
  const isMentor = keys?.mentorId === identity.userId;
  const peerLabel = peerName || (isMentor ? "شاگرد" : "منتور");

  useEffect(() => {
    onReady?.(true);
    return () => onReady?.(false);
  }, [onReady]);

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
      if (initial) {
        setHasMore(!!data.hasMore);
        if (!settled.current) settled.current = new Set((data.messages || []).map((m) => m.id));
      }
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
    settled.current = null;
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

  // ── اسکرول: ماندن در پایین، حفظِ جا هنگامِ بارِ قدیمی‌ترها، شمارِ پیام‌های تازه‌ی پایین ──
  const total = (messages?.length ?? 0) + pending.length;
  useLayoutEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    const grew = total > lastCount.current;
    lastCount.current = total;
    if (preserveFrom.current !== null) {
      el.scrollTop = el.scrollHeight - preserveFrom.current;
      preserveFrom.current = null;
      return;
    }
    if (stickToBottom.current) {
      const smooth = smoothNext.current && grew;
      smoothNext.current = true;
      el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    } else if (grew) {
      setNewBelow((n) => n + 1);
    }
  }, [total, opened]);

  // ارتفاعِ نوارِ پایین (نوشتن/اطلاعیه) → فاصله‌ی ته رشته، تا آخرین پیام زیرش نرود
  useEffect(() => {
    const dock = dockRef.current;
    const thread = threadRef.current;
    if (!dock || !thread || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      thread.style.setProperty("--mc-dock-h", `${dock.offsetHeight}px`);
      if (stickToBottom.current) thread.scrollTop = thread.scrollHeight;
    });
    ro.observe(dock);
    return () => ro.disconnect();
  }, [messages === null]);

  function onScroll() {
    const el = threadRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottom.current = dist < 80;
    setAtBottom(dist < 240);
    if (dist < 80) setNewBelow(0);
    if (el.scrollTop < 160 && hasMore && !olderBusy && !olderError) loadOlder();
  }

  function jumpToBottom() {
    const el = threadRef.current;
    if (!el) return;
    stickToBottom.current = true;
    setNewBelow(0);
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
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
      for (const m of data.messages || []) settled.current?.add(m.id);
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
    let frankingKey = p.frankingKey;
    try {
      if (!payload) {
        if (!cipher) throw new Error("کلیدهای گفت‌وگو هنوز دریافت نشده");
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
        // کلیدِ یکی از دو طرف عوض شده: کلیدها را تازه کن و یک بار با کلیدِ درست دوباره رمز کن
        if (res.status === 409 && (data?.code === "KEY_CHANGED" || data?.code === "PEER_NO_KEY") && !retriedKeys) {
          const k = await loadKeys();
          if (k && data?.code === "KEY_CHANGED") {
            const fresh = new ConversationCipher(identity, mentorshipId, k);
            const { frankingKey: fk2, ...enc } = await fresh.encrypt(p.text, randomId());
            return deliver({ ...p, payload: enc, frankingKey: fk2 }, true);
          }
        }
        const msg = await readApiError(res, "ارسال نشد");
        fail(p.tempId, msg, payload);
        if (res.status === 403 || res.status === 404 || (res.status === 409 && !data?.code)) setCanSend(false);
        return;
      }
      const data: { message: ChatMessage } = await res.json();
      if (data?.message) {
        // متنِ پیامِ خودم را همین‌جا داریم؛ بدونِ رمزگشاییِ دوباره نمایش داده می‌شود
        settled.current?.add(data.message.id);
        setOpened((prev) => ({ ...prev, [data.message.id]: { kind: "text", text: p.text, frankingKey: frankingKey ?? "", committed: true } }));
        merge([data.message]);
      }
      setPending((prev) => prev.filter((x) => x.tempId !== p.tempId));
    } catch (e) {
      fail(p.tempId, e instanceof TypeError ? NETWORK_ERROR : e instanceof Error && e.message ? e.message : NETWORK_ERROR, payload);
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
    setRepliesOpen(false);
    deliver(p);
    // روی موبایل کیبورد باز می‌ماند (مثلِ پیام‌رسان‌ها)
    inputRef.current?.focus();
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

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // مرورگر اجازه نداد؛ متن همچنان قابلِ انتخاب است
    }
  }

  function openMenuFor(e: React.MouseEvent<HTMLElement>, mine: boolean, actions: MentorMenuAction[]) {
    if (actions.length === 0) return;
    if (e.type === "click" && typeof window !== "undefined" && window.getSelection()?.toString()) return;
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    setMenu({ anchor: { top: r.top, bottom: r.bottom, left: r.left, right: r.right }, actions, align: mine ? "start" : "end" });
  }

  // ── ردیف‌های نمایش: روز + گروه‌بندیِ پشتِ‌همِ یک فرستنده ──
  const rows = useMemo<Row[]>(() => {
    const items: { key: string; mine: boolean; createdAt: string; m?: ChatMessage; p?: Pending }[] = [
      ...(messages ?? []).map((m) => ({ key: m.id, mine: m.mine, createdAt: m.createdAt, m })),
      ...pending.map((p) => ({ key: p.tempId, mine: true, createdAt: p.createdAt, p })),
    ];
    const out: Row[] = [];
    let prevDay = "";
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const day = isoLocal(new Date(it.createdAt));
      if (day !== prevDay) {
        out.push({ kind: "day", key: `d-${day}`, label: dayLabel(day) });
        prevDay = day;
      }
      const prev = items[i - 1];
      const next = items[i + 1];
      const sameAs = (o?: typeof it) =>
        !!o && o.mine === it.mine && isoLocal(new Date(o.createdAt)) === day &&
        Math.abs(new Date(o.createdAt).getTime() - new Date(it.createdAt).getTime()) < GROUP_GAP_MS;
      const animate = !!it.p || (!!settled.current && !settled.current.has(it.key));
      out.push({ kind: "msg", key: it.key, mine: it.mine, createdAt: it.createdAt, first: !sameAs(prev), last: !sameAs(next), animate, m: it.m, p: it.p });
    }
    return out;
  }, [messages, pending]);

  // نامزدهای «گزارش گفت‌وگو»: پیام‌های خوانا با کلیدِ فرانکینگ (یا قدیمی)، ۵۰تای آخر
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
    return (
      <div className="mc-state">
        <MentorErrorState message={loadError} onRetry={() => { setLoadError(null); fetchLatest(true); }} />
      </div>
    );
  }
  if (messages === null || !keys) return <div className="mc-state"><LoadingBlock /></div>;

  const tooLong = draft.trim().length > MAX_LEN;
  const hasText = !!draft.trim() && !tooLong;
  const empty = messages.length === 0 && pending.length === 0 && !welcome;
  const welcomeDay = welcome ? isoLocal(new Date(welcome.at)) : null;

  return (
    <div className="mc-body">
      <div className="mc-thread thin-scroll" ref={threadRef} onScroll={onScroll}>
        <div className="mc-thread-inner" role="log" aria-live="polite" aria-label={`گفت‌وگو با ${peerLabel}`}>
          {olderBusy && <div className="mc-older"><Spinner size={16} /></div>}
          {olderError && (
            <div className="mc-older">
              <button type="button" className="mentor-text-btn" onClick={() => { setOlderError(null); loadOlder(); }}>
                <RefreshCw size={14} strokeWidth={1.75} aria-hidden /> {olderError}
              </button>
            </div>
          )}

          {!hasMore && (
            <div className="mc-service">
              <span><Lock size={12} strokeWidth={1.75} aria-hidden /> پیام‌ها رمزگذاری سرتاسری دارند و فقط روی دستگاه تو و {peerLabel} خوانده می‌شوند</span>
            </div>
          )}

          {welcome && !hasMore && welcomeDay && (
            <div className="mc-day"><span>{dayLabel(welcomeDay)}</span></div>
          )}
          {welcome && !hasMore && (
            <div className="mc-row is-peer is-last is-first">
              <div className="support-msg admin mc-bubble has-tail mc-welcome">
                <span className="mc-label">پیام خوش‌آمد؛ بدون رمزگذاری سرتاسری</span>
                <span className="mc-text" dir="auto">{welcome.body}</span>
                <span className="mc-spacer" aria-hidden />
                <span className="mc-meta"><span className="mc-time">{hm(welcome.at)}</span></span>
              </div>
            </div>
          )}

          {empty && <div className="mc-service"><span>هنوز پیامی نیست</span></div>}

          {rows.map((r, idx) => {
            if (r.kind === "day") {
              // روزِ پیامِ خوش‌آمد بالای خودش آمده؛ جداکننده‌ی تکراری نمی‌خواهیم
              if (idx === 0 && welcome && !hasMore && r.key === `d-${welcomeDay}`) return null;
              return <div key={r.key} className="mc-day"><span>{r.label}</span></div>;
            }
            const cls = `mc-row ${r.mine ? "is-mine" : "is-peer"}${r.first ? " is-first" : ""}${r.last ? " is-last" : ""}`;
            const motionProps = r.animate
              ? { initial: { opacity: 0, y: 8, scale: 0.98 }, animate: { opacity: 1, y: 0, scale: 1, transition: mT(M_DUR.base) } }
              : { initial: false as const };

            if (r.p) {
              const p = r.p;
              const actions: MentorMenuAction[] = p.state === "failed"
                ? [
                    ...(canSend ? [{ label: "ارسال دوباره", icon: <RefreshCw {...MENU_ICON} />, onClick: () => deliver(p) }] : []),
                    { label: "کپی متن", icon: <Copy {...MENU_ICON} />, onClick: () => copyText(p.text) },
                    { label: "حذف پیام", icon: <Trash2 {...MENU_ICON} />, danger: true, onClick: () => setPending((prev) => prev.filter((x) => x.tempId !== p.tempId)) },
                  ]
                : [];
              return (
                <motion.div key={r.key} className={cls} {...motionProps}>
                  <div
                    className={`support-msg mine mc-bubble${r.last ? " has-tail" : ""}${p.state === "failed" ? " is-failed" : ""}`}
                    onClick={(e) => openMenuFor(e, true, actions)}
                    onContextMenu={(e) => openMenuFor(e, true, actions)}
                  >
                    <span className="mc-text" dir="auto">{p.text}</span>
                    <span className="mc-spacer is-mine" aria-hidden />
                    <span className="mc-meta">
                      <span className="mc-time">{hm(p.createdAt)}</span>
                      {p.state === "sending"
                        ? <Clock {...META_ICON} aria-label="در حال ارسال" />
                        : <AlertCircle {...META_ICON} className="mc-fail-icon" aria-label={p.error || "ارسال نشد"} />}
                    </span>
                  </div>
                  {p.state === "failed" && <div className="mc-fail-note" role="alert">{p.error || "ارسال نشد"}؛ برای تلاش دوباره روی پیام بزن</div>}
                </motion.div>
              );
            }

            const m = r.m!;
            const o = opened[m.id];
            const readable = o && ((o.kind === "text" && o.committed) || o.kind === "legacy");
            const text = readable ? (o as { text: string }).text : null;
            const body = !o ? <Spinner size={14} />
              : o.kind === "text" ? (o.committed ? o.text : <span className="mentor-msg-unreadable">این پیام با تعهد رمزنگاری‌اش نمی‌خواند و نمایش داده نمی‌شود</span>)
              : o.kind === "legacy" ? o.text
              : o.kind === "old-key" ? <span className="mentor-msg-unreadable">این پیام با کلید قبلی حساب رمز شده و دیگر خوانده نمی‌شود</span>
              : <span className="mentor-msg-unreadable">این پیام رمزگشایی نشد</span>;
            const actions: MentorMenuAction[] = [];
            if (text) actions.push({ label: "کپی متن", icon: <Copy {...MENU_ICON} />, onClick: () => copyText(text) });
            if (!m.mine && readable) {
              actions.push({
                label: "گزارش این پیام",
                icon: <Flag {...MENU_ICON} />,
                danger: true,
                onClick: () => setReport(o.kind === "text" ? { id: m.id, franking: { text: o.text, frankingKey: o.frankingKey } } : { id: m.id }),
              });
            }
            return (
              <motion.div key={r.key} className={cls} {...motionProps}>
                <div
                  className={`support-msg ${m.mine ? "mine" : "admin"} mc-bubble${r.last ? " has-tail" : ""}`}
                  onClick={(e) => openMenuFor(e, m.mine, actions)}
                  onContextMenu={(e) => openMenuFor(e, m.mine, actions)}
                >
                  <span className="mc-text" dir="auto">{body}</span>
                  <span className={`mc-spacer${m.mine ? " is-mine" : ""}`} aria-hidden />
                  <span className="mc-meta">
                    {m.broadcast && <Megaphone {...META_ICON} aria-label="ارسال گروهی" />}
                    {o?.kind === "legacy" && <span title="پیش از رمزگذاری سرتاسری ارسال شده">بدون رمزگذاری</span>}
                    <span className="mc-time">{hm(m.createdAt)}</span>
                    {m.mine && (m.readAt
                      ? <CheckCheck {...META_ICON} aria-label="خوانده شد" />
                      : <Check {...META_ICON} aria-label="ارسال شد" />)}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="mc-dock" ref={dockRef}>
        <AnimatePresence>
          {!atBottom && (
            <motion.button
              key="jump"
              type="button"
              className="routine-ai-action mc-jump"
              onClick={jumpToBottom}
              aria-label="جدیدترین پیام"
              title="جدیدترین پیام"
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: mT(M_DUR.fast) }}
              exit={{ opacity: 0, y: 8, scale: 0.9, transition: mT(0.12) }}
            >
              <ChevronDown size={20} strokeWidth={1.75} aria-hidden />
              {newBelow > 0 && <span className="mc-jump-count">{faNum(newBelow)}</span>}
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {copied && (
            <motion.div key="copied" className="mc-toast" role="status" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: mT(M_DUR.fast) }} exit={{ opacity: 0, transition: mT(0.12) }}>
              متن کپی شد
            </motion.div>
          )}
        </AnimatePresence>

        {peerChanged && (
          <div className="mc-notice is-warn" role="status">
            <ShieldAlert size={14} strokeWidth={1.75} aria-hidden />
            <span>کلید رمزگذاری {peerLabel} عوض شده است؛ اگر خودش کلید تازه نساخته، کد امنیتی را با او مقایسه کن</span>
            <button type="button" className="mentor-text-btn" onClick={async () => { await cipher?.acceptPeerKey(); setPeerChanged(false); }}>متوجه شدم</button>
          </div>
        )}

        {!canSend ? (
          <div className="mc-notice">
            <Lock size={14} strokeWidth={1.75} aria-hidden />
            <span>گفت‌وگو فقط‌خواندنی است؛ ارسال پیام فقط در رابطه‌ی فعال ممکن است</span>
          </div>
        ) : !peerReady ? (
          <div className="mc-notice">
            <span>{peerLabel} هنوز وارد بخش منتور نشده؛ با اولین ورودش، ارسال پیام باز می‌شود</span>
            {nudge === "sent" ? (
              <span className="mentor-muted">به {peerLabel} اطلاع داده شد</span>
            ) : (
              <button type="button" className="mentor-text-btn" onClick={askPeerToEnable} disabled={nudge === "busy"}>
                {nudge === "busy" ? <Spinner size={14} /> : <><BellRing size={14} strokeWidth={1.75} aria-hidden /> اطلاع به {peerLabel}</>}
              </button>
            )}
          </div>
        ) : (
          <>
            <AnimatePresence initial={false}>
              {isMentor && repliesOpen && (
                <motion.div
                  key="replies"
                  className="mc-replies"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, transition: mT(M_DUR.base) }}
                  exit={{ opacity: 0, y: 8, transition: mT(M_DUR.fast) }}
                >
                  <ChatReplies onPick={(t) => { setDraft((d) => (d ? d + "\n" : "") + t); setRepliesOpen(false); inputRef.current?.focus(); }} />
                </motion.div>
              )}
            </AnimatePresence>
            {tooLong && <p className="mc-notice is-error" role="alert">پیام حداکثر {faNum(MAX_LEN)} نویسه است</p>}
            <form className="mc-composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
              {isMentor && (
                <button
                  type="button"
                  className={`routine-ai-action mc-side-btn${repliesOpen ? " is-on" : ""}`}
                  onClick={() => setRepliesOpen((v) => !v)}
                  aria-label="پاسخ‌های آماده"
                  aria-expanded={repliesOpen}
                  title="پاسخ‌های آماده"
                >
                  <span className="routine-ai-action-icon" aria-hidden="true"><MessageSquareQuote size={18} strokeWidth={1.75} /></span>
                </button>
              )}
              <textarea
                ref={inputRef}
                className="routine-ai-input mc-input"
                rows={1}
                value={draft}
                maxLength={MAX_LEN + 200}
                placeholder="پیام"
                aria-label={`پیام به ${peerLabel}`}
                enterKeyHint={coarse ? "enter" : "send"}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  // دسکتاپ: Enter ارسال، Shift+Enter خطِ تازه. موبایل: Enter خطِ تازه، ارسال با دکمه.
                  if (e.key === "Enter" && !e.shiftKey && !coarse && !e.nativeEvent.isComposing) { e.preventDefault(); send(); }
                }}
              />
              <button
                type="submit"
                className={`routine-ai-action mc-send${hasText ? " is-send" : ""}`}
                aria-label={hasText ? "ارسال پیام" : "نوشتن پیام"}
                title={hasText ? "ارسال پیام" : undefined}
                aria-disabled={!hasText}
              >
                <span className="routine-ai-action-icon" aria-hidden="true"><Send size={18} strokeWidth={1.75} className="mc-send-icon" /></span>
                <span className="routine-ai-action-icon" aria-hidden="true" />
                <span className="routine-ai-action-icon" aria-hidden="true"><Send size={18} strokeWidth={2} className="mc-send-icon" /></span>
              </button>
            </form>
          </>
        )}
      </div>

      <MentorMenuAt anchor={menu?.anchor ?? null} actions={menu?.actions ?? []} align={menu?.align ?? "end"} label="گزینه‌های پیام" onClose={() => setMenu(null)} />

      {report && (
        <MentorReportModal targetType="MESSAGE" targetId={report.id} franking={report.franking} onClose={() => setReport(null)} />
      )}
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

/** فهرستِ پاسخ‌های آماده‌ی منتور، بالای نوارِ نوشتن */
let repliesCache: SavedReply[] | null = null;
function ChatReplies({ onPick }: { onPick: (text: string) => void }) {
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
  if (!list) return <div className="mc-replies-loading"><Spinner size={16} /></div>;
  if (list.length === 0) {
    return <p className="mentor-muted">هنوز پاسخ آماده‌ای نیست؛ از <a href="/mentor/templates?tab=replies" className="mentor-link">قالب‌ها</a> اضافه کن</p>;
  }
  return (
    <div className="mc-replies-list" role="list" aria-label="پاسخ‌های آماده">
      {list.map((r) => (
        <button key={r.id} type="button" role="listitem" className="account-outline-btn mentor-btn is-sm" title={r.body} onClick={() => onPick(r.body)}>
          {r.title}
        </button>
      ))}
    </div>
  );
}
