"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Loader2, Mic, Send, Square, X } from "lucide-react";
import SiriOrb from "@/components/smoothui/components/siri-orb";
import {
  type AIState, useAudioAmplitude, useSimulatedAmplitude,
} from "@/components/smoothui/components/ai-core";
import {
  useVoiceRecorder, VOICE_CONSTRAINTS, VOICE_MAX_BYTES,
} from "@/components/useVoiceRecorder";
import { LockBodyScroll } from "./LockBodyScroll";
import { primeSettingCache } from "@/lib/storage";
import { SETTING_KEYS } from "@/lib/userSettingKeys";

type Msg = { id: string; role: "user" | "bot"; text: string; tone?: "ok" | "warn" | "error" };
/** گزینه‌های آماده‌ی پاسخ — کاربر به‌جای تایپ فقط می‌زند رویشان */
type Options = { forMsgId: string; items: string[] } | null;
type Quota = { unlimited: boolean; used: number; limit: number | null; remaining: number | null };

const EXAMPLES = [
  "شنبه‌ها ساعت ۸ تا ۹:۳۰ کلاس زبان اضافه کن",
  "باشگاه رو ببر پنجشنبه",
  "مطالعه رو یک ساعت عقب بنداز",
  "برنامه‌ی جمعه رو حذف کن",
];

function newId() {
  return Math.random().toString(36).slice(2);
}

/**
 * دایره‌ی گوشه‌ی چپ‌پایینِ صفحه‌ی روتین — «مدیرِ برنامه».
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
  const [options, setOptions] = useState<Options>(null);
  // وضعیتِ گویِ دستیار. یک منبعِ واحد برای هر دو گو (دکمه‌ی شناور و سرِ پنل)
  // تا هر دو یک چیز بگویند.
  const [orbState, setOrbState] = useState<AIState>("idle");
  const { amplitude: micAmplitude, status: micStatus, start: micStart, stop: micStop, stream: micStream } =
    useAudioAmplitude({ constraints: VOICE_CONSTRAINTS });
  const simulated = useSimulatedAmplitude(orbState);
  const recorder = useVoiceRecorder(micStream);
  const listening = recorder.state === "recording";
  const [quota, setQuota] = useState<Quota | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // سهمیه فقط وقتی خوانده می‌شود که پنل باز شود — نه در هر بار لود شدنِ
  // صفحه‌ی روتین. یک درخواستِ شبکه برای دکمه‌ای که شاید اصلا زده نشود،
  // هزینه‌ی بی‌دلیلِ لودِ صفحه است.
  useEffect(() => {
    if (!open || quota || status !== "authenticated") return;
    let alive = true;
    fetch("/api/routine/assistant")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d) setQuota(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, [open, quota, status]);

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
  }, [msgs, sending, options]);

  function push(role: Msg["role"], text: string, tone?: Msg["tone"]): string {
    const id = newId();
    setMsgs((m) => [...m, { id, role, text, tone }]);
    return id;
  }

  async function send(text: string) {
    const body = text.trim();
    if (!body || sending) return;
    setInput("");
    // گزینه‌های قبلی با اولین پاسخ کنار می‌روند تا کاربر روی سوالِ سوخته نزند
    setOptions(null);
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
      const botId = push("bot", data?.reply || "چیزی برای گفتن ندارم.", tone);
      if (Array.isArray(data?.options) && data.options.length) {
        setOptions({ forMsgId: botId, items: data.options.slice(0, 4) });
      }
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
    // `start` بعد از await خودش جریان را می‌خواند؛ اگر اجازه رد شده باشد
    // false برمی‌گرداند و پیامِ خودش را می‌گذارد.
    const ok = recorder.start();
    if (ok) setOrbState("listening");
    else push("bot", recorder.error || "به میکروفون دسترسی نداریم.", "error");
  }

  const exhausted = !!quota && !quota.unlimited && (quota.remaining ?? 0) <= 0;

  return (
    <>
      <button
        type="button"
        className="routine-ai-fab"
        onClick={() => setOpen(true)}
        aria-label="مدیر برنامه"
        title="مدیر برنامه"
      >
        <SiriOrb size="48px" state={orbState} amplitude={simulated} />
      </button>

      {open && (
        <>
          <LockBodyScroll />
          <div className="modal-overlay open" onClick={() => setOpen(false)} />
          <div className="modal-panel routine-ai-panel open" role="dialog" aria-modal="true" aria-label="مدیر برنامه">
            <div className="modal-head">
              <div className="modal-title routine-ai-title">
                <SiriOrb
                  size="26px"
                  state={orbState}
                  amplitude={listening ? micAmplitude : simulated}
                />
                مدیر برنامه
                {quota && (
                  <span className="routine-ai-quota">
                    {quota.unlimited ? "نامحدود" : `${quota.remaining} بار مانده`}
                  </span>
                )}
              </div>
              <button type="button" className="trade-icon-btn" onClick={() => setOpen(false)} aria-label="بستن">
                <X size={16} />
              </button>
            </div>

            <div className="routine-ai-list thin-scroll" ref={listRef}>
              {!msgs.length && (
                <div className="routine-ai-intro">
                  <p>
                    بگو با برنامه‌ی هفتگی‌ات چه کار کنم — اضافه‌کردن، تغییرِ ساعت،
                    بردن به روزِ دیگر، یا حذف. لازم نیست گزینه‌ای انتخاب کنی.
                  </p>
                  <div className="routine-ai-examples">
                    {EXAMPLES.map((e) => (
                      <button key={e} type="button" className="routine-ai-example" disabled={exhausted || status !== "authenticated"} onClick={() => send(e)}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {msgs.map((m) => (
                <Fragment key={m.id}>
                  <div className={`routine-ai-msg ${m.role}${m.tone ? " tone-" + m.tone : ""}`}>
                    {m.text.split("\n").map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                  {options?.forMsgId === m.id && (
                    <div className="routine-ai-options">
                      {options.items.map((o) => (
                        <button key={o} type="button" className="routine-ai-option" disabled={sending} onClick={() => send(o)}>
                          {o}
                        </button>
                      ))}
                    </div>
                  )}
                </Fragment>
              ))}

              {listening && (
                <div className="routine-ai-msg bot is-typing">
                  <span>دارم گوش می‌دهم… وقتی تمام شد دکمه را بزن.</span>
                </div>
              )}

              {sending && (
                <div className="routine-ai-msg bot is-typing">
                  <Loader2 size={14} className="trade-spin" />
                  <span>دارم برنامه‌ات را نگاه می‌کنم…</span>
                </div>
              )}
            </div>

            {status !== "authenticated" ? (
              /* صفحه‌ی روتین برای مهمان هم کار می‌کند (روی localStorage)، ولی
                 دستیار بدونِ حساب نه: نه جایی برای شمردنِ سهمیه هست نه
                 برنامه‌ای روی سرور که بشود عوضش کرد. پس به‌جای دکمه‌ای که
                 همیشه خطا می‌دهد، همین‌جا صریح می‌گوییم. */
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
                  placeholder="مثلا: دوشنبه‌ها ساعت ۱۹ دویدن اضافه کن"
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
                  }}
                  disabled={sending}
                />
                <button
                  type="button"
                  className={`routine-ai-mic${listening ? " is-recording" : ""}`}
                  onClick={toggleVoice}
                  disabled={sending}
                  aria-label={listening ? "پایان ضبط" : "ضبط صدا"}
                  title={listening ? "پایان ضبط و ارسال" : "با صدا بگو"}
                >
                  {listening ? <Square size={14} /> : <Mic size={15} />}
                </button>
                <button type="submit" className="routine-ai-send" disabled={sending || !input.trim()} aria-label="ارسال">
                  {sending ? <Loader2 size={15} className="trade-spin" /> : <Send size={15} />}
                </button>
              </form>
            )}
          </div>
        </>
      )}
    </>
  );
}
