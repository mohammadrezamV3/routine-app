"use client";

// جشن استریک به سبک دوالینگو — وقتی همه‌ی برنامه‌های امروز تیک خورد، شعله‌ی
// کوچیک هدر از جاش «بیرون می‌پره»، با قوس تا وسط صفحه پرواز می‌کنه و به یه
// شعله‌ی بزرگ زنده (AnimatedStreakFlame — زبانه‌های مورف‌شونده + جرقه) تبدیل
// می‌شه؛ عدد از دیروز به امروز می‌غلته، دایره‌ی امروز هفته پر می‌شه، و با
// «ادامه» شعله دوباره برمی‌گرده سر جاش توی هدر. از همین‌جا کاربر می‌تونه
// استریکش رو (همراه کد دعوتش) به اشتراک بذاره.
//
// همین پاپ‌آپ با زدن شعله‌ی هدر در حالت «view» هم باز می‌شه (بدون غلتیدن عدد).

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Download, Share2 } from "lucide-react";
import { faNum } from "@/lib/jalali";
import { getStreakTier, STREAK_MILESTONES } from "@/lib/streakTier";
import { flamePalette } from "@/lib/streakFlameShape";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { hapticsEnabled } from "@/lib/haptics";
import { useImageShare } from "@/lib/useImageShare";
import { useMyInvite } from "@/lib/invite";
import { REFERRAL_DISCOUNT_PERCENT } from "@/lib/referral";
import { canvasToBlob, renderShareCard, shareText, type ShareCardInput } from "@/lib/shareCard";
import { AnimatedStreakFlame } from "./AnimatedStreakFlame";
import { Spinner } from "./Spinner";

const WEEK = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
const FLAME = 176;
const LAND_MS = 950;

export type StreakCelebrationProps = {
  mode: "extend" | "view";
  from: number;
  to: number;
  todayDone: boolean;
  anchor: HTMLElement | null;
  onClose: () => void;
};

function weekRow(streak: number, todayDone: boolean) {
  const todayIdx = (new Date().getDay() + 1) % 7; // شنبه = ۰
  // روزهای کامل: از امروز (اگه کامل شده) یا دیروز، `streak` روز به عقب — تقریب
  // بصری؛ روز بی‌برنامه‌ای که وسط استریک رد شده این‌جا هم پر دیده می‌شه.
  const last = todayDone ? todayIdx : todayIdx - 1;
  return { todayIdx, done: WEEK.map((_, i) => i <= last && last - i < streak) };
}

export function StreakCelebration({ mode, from, to, todayDone, anchor, onClose }: StreakCelebrationProps) {
  useLockBodyScroll();
  const slotRef = useRef<HTMLDivElement>(null);
  const [delta, setDelta] = useState<{ x: number; y: number; s: number } | null>(null);
  const [closing, setClosing] = useState(false);
  const [landed, setLanded] = useState(mode === "view");
  const [shown, setShown] = useState(mode === "extend" ? from : to);
  const invite = useMyInvite();
  const tier = getStreakTier(to);
  const pal = flamePalette(to);
  const isMilestone = mode === "extend" && (STREAK_MILESTONES as readonly number[]).includes(to);
  const week = useMemo(() => weekRow(to, todayDone), [to, todayDone]);

  // فاصله‌ی شعله‌ی هدر تا جای شعله‌ی بزرگ — نقطه‌ی شروع پرواز (و مقصد برگشت)
  useLayoutEffect(() => {
    const slot = slotRef.current?.getBoundingClientRect();
    if (!slot) return;
    const a = anchor?.getBoundingClientRect();
    if (a && a.width > 0) {
      setDelta({
        x: a.left + a.width / 2 - (slot.left + slot.width / 2),
        y: a.top + a.height / 2 - (slot.top + slot.height / 2),
        s: Math.max(0.06, a.width / slot.width),
      });
    } else {
      setDelta({ x: 0, y: -window.innerHeight / 2, s: 0.1 });
    }
  }, [anchor]);

  // بعد از فرود: عدد می‌غلته + لرزش کوتاه
  useEffect(() => {
    if (mode !== "extend") return;
    const t = setTimeout(() => {
      setLanded(true);
      setShown(to);
      try { if (hapticsEnabled()) navigator.vibrate?.([18, 40, 28]); } catch { /* بدون هپتیک */ }
    }, LAND_MS);
    return () => clearTimeout(t);
  }, [mode, to]);

  const close = useCallback(() => { if (!closing) setClosing(true); }, [closing]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  // تصویر استریک از قبل (بعد از فرود شعله، تا انیمیشن نلرزه) ساخته می‌شه تا تپ
  // «اشتراک» بدون انتظار navigator.share رو صدا بزنه — سافاری iOS بیرون از
  // حرکت کاربر اجازه‌ی اشتراک نمی‌ده.
  const cardInput = useMemo<ShareCardInput>(() => ({
    title: "استریک من",
    subtitle: tier.name,
    body: { kind: "streak", streak: to, label: "روز پشت‌سرهم، همه‌ی برنامه‌ها کامل", week: { labels: WEEK, done: week.done, todayIdx: week.todayIdx } },
    inviteCode: invite?.code ?? null,
  }), [tier.name, to, week, invite?.code]);
  const [card, setCard] = useState<{ input: ShareCardInput; blob: Blob } | null>(null);
  const [renderErr, setRenderErr] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setRenderErr(false);
    const t = setTimeout(async () => {
      try {
        const blob = await canvasToBlob(await renderShareCard(cardInput));
        if (alive) setCard({ input: cardInput, blob });
      } catch {
        if (alive) setRenderErr(true);
      }
    }, mode === "extend" && attempt === 0 ? LAND_MS + 500 : 200);
    return () => { alive = false; clearTimeout(t); };
  }, [cardInput, mode, attempt]);
  const ready = !!card && card.input === cardInput;
  const { canShare, phase, result, share: shareBlob } = useImageShare();

  function share() {
    if (renderErr) { setAttempt((n) => n + 1); return; }
    if (!ready || !card) return;
    const inv = invite ? { code: invite.code, url: invite.url, percent: REFERRAL_DISCOUNT_PERCENT } : null;
    shareBlob(card.blob, `arion-streak-${to}.png`, "استریک من", shareText(`${faNum(to)} روز پشت‌سرهم روتینم رو کامل کردم 🔥`, inv));
  }
  const saveOnly = canShare === false;
  const shareBusy = phase === "busy" || (!ready && !renderErr);
  const shareLabel = phase === "done"
    ? (result === "downloaded" ? "ذخیره شد" : "ارسال شد")
    : renderErr ? "تلاش دوباره" : saveOnly ? "ذخیره تصویر" : "اشتراک با دوستام";
  const shareMsg = renderErr
    ? "ساخت تصویر ممکن نشد"
    : phase === "error"
      ? "اشتراک انجام نشد، دوباره بزن"
      : result === "downloaded"
        ? "تصویر ذخیره شد — حالا برای دوستات بفرستش"
        : null;

  const title = mode === "view" && !todayDone ? "امروز هنوز کامل نشده" : "روز استریک!";
  const sub =
    mode === "view" && !todayDone
      ? `همه‌ی برنامه‌های امروز رو تیک بزن تا شعله روشن بمونه و استریکت ${faNum(to + 1)} بشه.`
      : isMilestone
        ? `${tier.name} باز شد! شعله‌ت حالا یه سطح داغ‌تره.`
        : to === 1
          ? "یه استریک تازه روشن شد. فردا هم کامل کن تا خاموش نشه!"
          : "همه‌ی برنامه‌های امروز انجام شد. فردا هم بیا تا شعله خاموش نشه!";
  const next = tier.nextMilestone ? `${faNum(tier.nextMilestone - to)} روز دیگه تا سطح بعدی` : null;

  return createPortal(
    <motion.div
      className="streak-cel-root"
      role="dialog"
      aria-modal="true"
      aria-label={`${faNum(to)} روز استریک`}
      initial={{ opacity: 0 }}
      animate={{ opacity: closing ? 0 : 1 }}
      transition={{ duration: closing ? 0.45 : 0.35, delay: closing ? 0.15 : 0 }}
      onAnimationComplete={() => { if (closing) onClose(); }}
      style={{ ["--flame-rgb" as any]: pal.glow }}
    >
      <div className="streak-cel-rays" aria-hidden="true" />
      <div className="streak-cel-col">
        <div className="streak-cel-flame-slot" ref={slotRef} style={{ width: FLAME, height: (FLAME * 236) / 200 }}>
          {delta && (
            <motion.div
              className="streak-cel-flame"
              initial={mode === "extend" ? { x: delta.x, y: delta.y, scale: delta.s, rotate: -18 } : { scale: 0.6, opacity: 0 }}
              animate={
                closing
                  ? { x: delta.x, y: delta.y, scale: delta.s, rotate: 12, opacity: 0.9 }
                  : { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }
              }
              transition={
                closing
                  ? { duration: 0.5, ease: [0.55, 0, 0.75, 0.2] }
                  : mode === "extend"
                    ? { x: { type: "spring", stiffness: 70, damping: 13 }, y: { type: "spring", stiffness: 90, damping: 11 }, scale: { type: "spring", stiffness: 110, damping: 12 }, rotate: { duration: 0.8 } }
                    : { type: "spring", stiffness: 220, damping: 16 }
              }
            >
              <AnimatedStreakFlame days={to} size={FLAME} />
              {landed && mode === "extend" && !closing && (
                <span className="streak-cel-burst" aria-hidden="true">
                  {Array.from({ length: 10 }, (_, i) => (
                    <i key={i} style={{ ["--a" as any]: `${i * 36}deg` }} />
                  ))}
                </span>
              )}
            </motion.div>
          )}
        </div>

        <div className="streak-cel-num" dir="ltr" aria-live="polite">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.b
              key={shown}
              initial={{ y: 70, opacity: 0, scale: 0.7 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -70, opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 260, damping: 17 }}
            >
              {faNum(shown)}
            </motion.b>
          </AnimatePresence>
        </div>

        <motion.div
          className="streak-cel-text"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: mode === "extend" ? 1.1 : 0.2, duration: 0.4 }}
        >
          <h2 className="streak-cel-title">{title}</h2>
          <p className="streak-cel-sub">{sub}</p>
        </motion.div>

        <motion.div
          className="streak-cel-week"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: mode === "extend" ? 1.25 : 0.3, duration: 0.4 }}
        >
          {WEEK.map((d, i) => {
            const isToday = i === week.todayIdx;
            const done = week.done[i] && (!(isToday && mode === "extend") || landed);
            return (
              <div key={d} className={`streak-cel-day${isToday ? " is-today" : ""}`}>
                <span className="streak-cel-day-name">{d}</span>
                <span className={`streak-cel-day-dot${done ? " is-done" : ""}`}>
                  {done && (
                    <motion.svg
                      viewBox="0 0 24 24"
                      initial={isToday && mode === "extend" ? { scale: 0, rotate: -45 } : false}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 14, delay: isToday ? 0.35 : 0 }}
                    >
                      <path d="M6 12.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </motion.svg>
                  )}
                </span>
              </div>
            );
          })}
          {next && <span className="streak-cel-next">{next}</span>}
        </motion.div>

        <motion.div
          className="streak-cel-actions"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: mode === "extend" ? 1.4 : 0.4, duration: 0.4 }}
        >
          <button type="button" className="trade-primary-btn streak-cel-btn" onClick={close}>ادامه</button>
          <button
            type="button"
            className="account-outline-btn streak-cel-btn"
            onClick={share}
            disabled={shareBusy}
            aria-label={shareBusy ? "در حال آماده‌سازی تصویر" : shareLabel}
            aria-busy={shareBusy || undefined}
          >
            {shareBusy ? <Spinner size={14} /> : (
              <motion.span
                key={phase === "done" ? "done" : "idle"}
                className="streak-cel-btn-in"
                initial={phase === "done" ? { scale: 0.6, opacity: 0 } : false}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 18 }}
              >
                {phase === "done" ? <Check size={15} strokeWidth={3} /> : saveOnly ? <Download size={15} /> : <Share2 size={15} />} {shareLabel}
              </motion.span>
            )}
          </button>
          <p className="streak-cel-invite">
            {invite?.code
              ? <>دوستات با کد دعوتت <b dir="ltr">{invite.code}</b> روی اولین اشتراک {faNum(REFERRAL_DISCOUNT_PERCENT)}٪ تخفیف می‌گیرن</>
              : "استریکت رو بفرست و دوستات رو به چالش بکش"}
          </p>
          <p className="streak-cel-msg" role="status" aria-live="polite">{shareMsg}</p>
        </motion.div>
      </div>
    </motion.div>,
    document.body
  );
}
