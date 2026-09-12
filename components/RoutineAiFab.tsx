"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Mic, Send, Square, X } from "lucide-react";
import { LockBodyScroll } from "./LockBodyScroll";
import { primeSettingCache } from "@/lib/storage";
import { SETTING_KEYS } from "@/lib/userSettingKeys";
import SiriOrb from "@/components/smoothui/components/siri-orb";
import AIMessage from "@/components/smoothui/components/ai-message";
import AILoader from "@/components/smoothui/components/ai-loader";
import {
  type AIState, useAudioAmplitude, useSimulatedAmplitude,
} from "@/components/smoothui/components/ai-core";
import {
  useVoiceRecorder, VOICE_CONSTRAINTS, VOICE_MAX_BYTES,
} from "@/components/useVoiceRecorder";

type Msg = { id: string; role: "user" | "bot"; text: string; tone?: "ok" | "warn" | "error" };
type Quota = { unlimited: boolean; used: number; limit: number | null; remaining: number | null };

const GREETING = "سلام! چطور می‌تونم کمکت کنم؟";

function newId() {
  return Math.random().toString(36).slice(2);
}

function clockNow() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * گویِ گوشه‌ی چپ‌پایینِ صفحه‌ی روتین — «مدیرِ برنامه».
 *
 * کاربر هیچ گزینه‌ای انتخاب نمی‌کند: فقط با زبانِ خودش می‌گوید چه می‌خواهد و
 * سرور تصمیم می‌گیرد. هر تغییری که واقعا اعمال شود، همان‌جا با `onChanged`
 * به صفحه خبر داده می‌شود تا فهرستِ برنامه‌ها بلافاصله تازه شود.
 */
export function RoutineAiFab({ onChanged }: { onChanged: () => void }) {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [quota, setQuota] = useState<Quota | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // فیکسِ سافاری/iOS برای شکافِ کیبورد: dvh + interactive-widget (توی
  // app/layout.tsx) فقط روی کروم/اندروید کار می‌کنه — وبکیت با بازشدنِ
  // کیبورد فقط visual viewport رو کوچیک می‌کنه، نه layout viewport، پس
  // top:50%ی مودال (که رویِ layout viewport حساب می‌شه) همون‌جای قبل از
  // کیبورد می‌مونه. اینجا مستقیم از visualViewport واقعی می‌خونیم و
  // مرکز/ارتفاعِ پنل رو با inline style بازنویسی می‌کنیم.
  //
  // minHeight هم همین‌جا محاسبه و ست می‌شه — طبق گزارشِ باگ، min-height
  // ثابتِ CSSِ .routine-ai-panel (برای اینکه یک پیامِ تنها پنل رو کوچیک
  // نشون نده) با maxHeightِ واقعیِ این‌جا تداخل داشت: وقتی کیبورد باز
  // می‌شد و ویوپورتِ واقعی کوچیک‌تر از اون min-height ثابت می‌شد، مرورگر
  // min-height رو برنده می‌کرد و پنل بلندتر از فضای واقعا دیده‌شده
  // می‌موند — نتیجه‌اش نیمه‌ی بالای پنل (هدر/پیام‌ها) از صفحه بیرون می‌زد.
  // با ست‌کردنِ minHeight هم از همون maxHeightِ واقعی (نه بیشتر)، پنل
  // هیچ‌وقت از فضای واقعا در دسترس بزرگ‌تر نمی‌شه — بدونِ هیچ تغییری در
  // ظاهر/چیدمانِ خودِ کارت (طبق درخواستِ صریح: فقط مقدار، نه دیزاین).
  const [kbViewport, setKbViewport] = useState<{ top: number; maxHeight: number; minHeight: number } | null>(null);
  useEffect(() => {
    if (!open) { setKbViewport(null); return; }
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;
    function update() {
      if (!vv) return;
      const maxHeight = Math.min(vv.height * 0.88, 760);
      setKbViewport({
        top: vv.offsetTop + vv.height / 2,
        maxHeight,
        minHeight: Math.min(maxHeight, 620),
      });
    }
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [open]);

  // وضعیتِ گویِ دستیار. یک منبعِ واحد برای هر دو گو (دکمه‌ی شناور و سرِ پنل)
  // تا هر دو یک چیز بگویند.
  const [orbState, setOrbState] = useState<AIState>("idle");
  const { amplitude: micAmplitude, status: micStatus, start: micStart, stop: micStop, stream: micStream } =
    useAudioAmplitude({ constraints: VOICE_CONSTRAINTS });
  const simulated = useSimulatedAmplitude(orbState);
  const recorder = useVoiceRecorder(micStream);
  const listening = recorder.state === "recording";

  // سهمیه فقط برای *بستنِ* ورودی وقتی تمام شده لازم است — دیگر بالای پنل
  // نوشته نمی‌شود (درخواستِ صریح: «نامحدود» بالا ننویس).
  useEffect(() => {
    if (!open || quota || status !== "authenticated") return;
    let alive = true;
    fetch("/api/routine/assistant")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d) setQuota(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, [open, quota, status]);

  // پیامِ خوش‌آمد یک‌بار، همان لحظه‌ی بازشدن — به‌جای فهرستِ پیشنهادها.
  useEffect(() => {
    if (open && msgs.length === 0) {
      setMsgs([{ id: newId(), role: "bot", text: GREETING }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 120); return; }
    // پنل که بسته شد، میکروفون هم باید آزاد شود — وگرنه چراغِ ضبطِ مرورگر
    // روشن می‌ماند و کاربر حق دارد فکر کند داریم گوش می‌دهیم.
    recorder.cancel();
    micStop();
    setOrbState("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // «done» و «error» حالتِ لحظه‌ای‌اند؛ گو باید بعدشان به آرامش برگردد.
  useEffect(() => {
    if (orbState !== "done" && orbState !== "error") return;
    const t = setTimeout(() => setOrbState("idle"), 1400);
    return () => clearTimeout(t);
  }, [orbState]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, sending]);

  function push(role: Msg["role"], text: string, tone?: Msg["tone"]): string {
    const id = newId();
    setMsgs((m) => [...m, { id, role, text, tone }]);
    return id;
  }

  async function send(text: string) {
    const body = text.trim();
    if (!body || sending) return;
    setInput("");
    // تاریخچه *قبل* از افزودنِ همین پیام گرفته می‌شود؛ خودِ پیام جدا می‌رود.
    const history = msgs.slice(-6).map((m) => ({ role: m.role === "user" ? "user" : "assistant", text: m.text }));
    push("user", body);
    setSending(true);
    setOrbState("thinking");
    try {
      const res = await fetch("/api/routine/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: body, history }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        push("bot", data?.error || "یک مشکلِ ناشناخته پیش آمد. دوباره امتحان کن.", "error");
        if (data?.quota) setQuota(data.quota);
        setOrbState("error");
        return;
      }

      if (data?.quota) setQuota(data.quota);

      if (data?.changed && Array.isArray(data.occurrences)) {
        // سرور نوشته، پس کشِ کلاینت باید همان لحظه مقدارِ تازه را بگیرد —
        // وگرنه refresh() زیر، تا انقضای TTL همان فهرستِ قدیمی را می‌خواند.
        primeSettingCache(SETTING_KEYS.customOccurrences, data.occurrences);
        onChanged();
      }

      const tone: Msg["tone"] = data?.problems?.length
        ? (data?.applied?.length ? "warn" : "error")
        : (data?.changed ? "ok" : undefined);
      // طبق درخواست صریح: بعد از هر پاسخ گزینه‌ی پیشنهادی نشان داده نمی‌شود.
      push("bot", data?.reply || "چیزی برای گفتن ندارم.", tone);
      setOrbState(tone === "error" ? "error" : "done");
    } catch {
      push("bot", "اتصال برقرار نشد. اینترنتت را چک کن و دوباره بفرست.", "error");
      setOrbState("error");
    } finally {
      setSending(false);
    }
  }

  // ── ویس ──────────────────────────────────────────────────────────────
  // ضبط از همان جریانی می‌آید که گو را تکان می‌دهد، پس فقط *یک بار* اجازه‌ی
  // میکروفون گرفته می‌شود و کاربر همان صدایی را می‌بیند که دارد ضبط می‌شود.
  async function toggleVoice() {
    if (listening) {
      const blob = await recorder.stop();
      setOrbState("idle");
      if (!blob) { push("bot", "چیزی ضبط نشد. دوباره امتحان کن.", "error"); return; }
      if (blob.size > VOICE_MAX_BYTES) { push("bot", "ویس خیلی طولانی است. کوتاه‌تر بگو.", "error"); return; }

      setSending(true);
      setOrbState("thinking");
      try {
        const fd = new FormData();
        fd.append("audio", blob, "voice.webm");
        const res = await fetch("/api/routine/assistant/voice", { method: "POST", body: fd });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.text) {
          push("bot", data?.error || "تبدیلِ ویس انجام نشد.", "error");
          setOrbState("error");
          return;
        }
        setSending(false);
        await send(data.text);
      } catch {
        push("bot", "تبدیلِ ویس انجام نشد. اینترنتت را چک کن.", "error");
        setOrbState("error");
      } finally {
        setSending(false);
      }
      return;
    }

    if (micStatus !== "active") await micStart();
    const ok = recorder.start();
    if (ok) setOrbState("listening");
    else push("bot", recorder.error || "به میکروفون دسترسی نداریم.", "error");
  }

  const exhausted = !!quota && !quota.unlimited && (quota.remaining ?? 0) <= 0;
  const hasText = !!input.trim();

  return (
    <>
      <button
        type="button"
        className="routine-ai-fab"
        onClick={() => setOpen(true)}
        aria-label="مدیر برنامه"
        title="مدیر برنامه"
      >
        <SiriOrb size="52px" state={orbState} amplitude={simulated} />
      </button>

      {open && (
        <>
          <LockBodyScroll />
          <div className="modal-overlay open" onClick={() => setOpen(false)} />
          <div
            className="modal-panel routine-ai-panel open"
            style={kbViewport ? { top: kbViewport.top, maxHeight: kbViewport.maxHeight, minHeight: kbViewport.minHeight } : undefined}
            role="dialog"
            aria-modal="true"
            aria-label="مدیر برنامه"
          >
            <div className="modal-head">
              <div className="modal-title routine-ai-title">
                <SiriOrb
                  size="26px"
                  state={orbState}
                  amplitude={listening ? micAmplitude : simulated}
                />
                مدیر برنامه
              </div>
              <button type="button" className="trade-icon-btn" onClick={() => setOpen(false)} aria-label="بستن">
                <X size={16} />
              </button>
            </div>

            <div className="routine-ai-list thin-scroll" ref={listRef}>
              {msgs.map((m) => (
                <Fragment key={m.id}>
                  <AIMessage
                    from={m.role === "user" ? "user" : "assistant"}
                    avatar={m.role === "bot" ? <SiriOrb size="24px" state="idle" /> : undefined}
                    copyText={m.role === "bot" ? m.text : undefined}
                    timestamp={undefined}
                    className={`${m.role === "user" ? "routine-ai-row-user" : "routine-ai-row-bot"}${m.tone ? ` tone-${m.tone}` : ""}`}
                  >
                    {m.text.split("\n").map((line, i) => (
                      <p key={i} className={i ? "mt-1" : undefined}>{line}</p>
                    ))}
                  </AIMessage>

                </Fragment>
              ))}

              {listening && (
                <div className="routine-ai-status">
                  <AILoader label="دارم گوش می‌دهم" variant="dots" />
                </div>
              )}

              {sending && !listening && (
                <div className="routine-ai-status">
                  <AILoader variant="dots" />
                </div>
              )}
            </div>

            {status !== "authenticated" ? (
              /* صفحه‌ی روتین برای مهمان هم کار می‌کند (روی localStorage)، ولی
                 دستیار بدونِ حساب نه: نه جایی برای شمردنِ سهمیه هست نه
                 برنامه‌ای روی سرور که بشود عوضش کرد. */
              <div className="routine-ai-exhausted">
                <p>مدیرِ برنامه فقط با حسابِ کاربری کار می‌کند.</p>
                <Link href="/auth/login" className="trade-primary-btn" onClick={() => setOpen(false)}>
                  ورود / ثبت‌نام
                </Link>
              </div>
            ) : exhausted ? (
              <div className="routine-ai-exhausted">
                <p>سه استفاده‌ی رایگان تمام شد.</p>
                <Link href="/subscription" className="trade-primary-btn" onClick={() => setOpen(false)}>
                  دیدن اشتراک‌ها
                </Link>
              </div>
            ) : (
              <form
                className="routine-ai-composer"
                onSubmit={(e) => { e.preventDefault(); send(input); }}
              >
                <textarea
                  ref={inputRef}
                  className="routine-ai-input"
                  rows={1}
                  value={input}
                  maxLength={500}
                  placeholder="پیام…"
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
                  }}
                  disabled={sending}
                />
                {/* یک دکمه، سه حالت: میکروفون → ضبط → ارسال.
                    عمدا *یک* عنصر است و آیکون‌ها داخلش عوض می‌شوند، نه دو
                    دکمه‌ی جدا که شرطی مانت/آنمانت شوند — فقط با ماندنِ خودِ
                    عنصر می‌شود بینِ حالت‌ها انیمیشن داد؛ عنصری که آنمانت
                    می‌شود چیزی برای ترنزیشن ندارد. */}
                <button
                  type="button"
                  className={`routine-ai-action${hasText ? " is-send" : ""}${listening ? " is-recording" : ""}`}
                  onClick={() => (hasText ? send(input) : toggleVoice())}
                  disabled={sending}
                  aria-label={hasText ? "ارسال" : listening ? "پایان ضبط" : "ضبط صدا"}
                  title={hasText ? "ارسال" : listening ? "پایان ضبط و ارسال" : "با صدا بگو"}
                >
                  <span className="routine-ai-action-icon" aria-hidden="true"><Mic size={17} /></span>
                  <span className="routine-ai-action-icon" aria-hidden="true"><Square size={13} /></span>
                  <span className="routine-ai-action-icon" aria-hidden="true"><Send size={16} /></span>
                </button>
              </form>
            )}
          </div>
        </>
      )}
    </>
  );
}
