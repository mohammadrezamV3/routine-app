"use client";

// «اشتراک موفقیت» از داشبورد. پنجره فقط خود تصویر کارت رو نشون می‌ده و یک دکمه‌ی
// «اشتراک‌گذاری» زیرش — بدون قاب، بدون تنظیمات و بدون هیچ متنی زیر تصویر
// (درخواست صاحب محصول). محتوای کارت ثابته: حلقه‌های امروز، وسطشون تعداد روزهای
// استریک، عدد زیر حلقه‌ی روتین و تمرین دیده می‌شه و کالری پنهانه، و کد دعوت
// کاربر (اگه داشته باشه) بالای کارت. تصویر فقط با زدن دکمه از دستگاه بیرون
// می‌ره — هیچ‌چیز به سرور نمی‌ره.
//
// راحتی کار:
//  - تصویر از قبل (پشت پیش‌نمایش) ساخته می‌شه؛ تپ روی دکمه بدون هیچ انتظاری
//    navigator.share رو صدا می‌زنه (سافاری iOS بیرون از حرکت کاربر اجازه
//    نمی‌ده). تا تصویر آماده نشده، دکمه غیرفعاله — پس هیچ‌وقت تصویر کهنه نمی‌ره.
//  - برچسب دکمه با توانایی مرورگر عوض می‌شه («اشتراک‌گذاری» یا «ذخیره تصویر») و
//    بعد از موفقیت یه تیک کوتاه نشون می‌ده.
//  - Escape و تپ بیرون تصویر می‌بنده، فوکوس داخل پنجره می‌مونه و بعد از بستن به
//    دکمه‌ی بازکننده برمی‌گرده.

import "@/app/dashboard/dashboard.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Download, Share2, X } from "lucide-react";
import { FA_WEEKDAY, J_MONTHS, faNum, toJalali } from "@/lib/jalali";
import type { DashboardData } from "@/lib/dashboardTypes";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { useMyInvite } from "@/lib/invite";
import { REFERRAL_DISCOUNT_PERCENT } from "@/lib/referral";
import { canvasToBlob, prepareShareBackground, renderShareCard, shareText, type ShareCardInput } from "@/lib/shareCard";
import { useImageShare } from "@/lib/useImageShare";
import { heroRings, type HeroRing } from "./DashboardHero";
import { Spinner } from "./Spinner";
import { D_EASE } from "./DashboardKit";

/** عدد زیر کدوم حلقه‌ها روی کارت میاد — کالری عدد شخصی‌تریه و پنهان می‌مونه */
const SHOW_VALUE: Record<HeroRing["key"], boolean> = { routine: true, exercise: true, calorie: false };
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** رنگ حلقه‌ها توکن‌های --ring-*  داشبوردن؛ canvas مقدار واقعی‌شون رو لازم داره */
function resolveColor(v: string): string {
  const m = v.match(/^var\((--[\w-]+)\)$/);
  if (!m) return v;
  const el = document.querySelector(".db-page") ?? document.body;
  return getComputedStyle(el).getPropertyValue(m[1]).trim() || "#00C98D";
}

/** بخش اشتراک هیچ اعرابی نداره — برچسب‌های مشترک با هیرو (مثل «تمرین امروز») هم تمیز می‌شن */
const plain = (t: string) => t.replace(/[\u064B-\u0652\u0670]/g, "");

/** اسکلت هم‌شکل کارت — جای پیش‌نمایش از اول ثابته و چیزی نمی‌پره */
function PreviewSkeleton() {
  return (
    <div className="db-share-skel" aria-hidden="true">
      <div className="db-share-skel-head">
        <span className="db-skel" style={{ width: "26%", height: 14 }} />
        <span className="db-skel" style={{ width: "38%", height: 18 }} />
      </div>
      <span className="db-share-skel-line" />
      <div className="db-share-skel-rings">
        <span className="db-share-skel-ring"><span className="db-share-skel-ring"><span className="db-share-skel-ring" /></span></span>
      </div>
      <div className="db-share-skel-foot">
        <span className="db-skel" style={{ width: "22%", height: 12 }} />
        <span className="db-skel" style={{ width: "22%", height: 12 }} />
        <span className="db-skel" style={{ width: "22%", height: 12 }} />
      </div>
    </div>
  );
}

type FullCard = { key: string; blob: Blob };
type IdleWindow = Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };

export function DashboardShare({
  open,
  onClose,
  data,
  routine,
  routineLocked = false,
}: {
  open: boolean;
  onClose: () => void;
  data: DashboardData | null;
  routine: {
    stats: { completed: number; total: number; pct: number };
    streak: number | null;
    todayIso: string;
  };
  /** ماژول «روتین من» قفله → حلقه‌ی روتین نیست (هم‌رفتار با هیرو) */
  routineLocked?: boolean;
}) {
  useLockBodyScroll(open);

  const invite = useMyInvite();
  // کارت رنگ‌های تم فعلی رو می‌گیره — عوض‌شدن تم وسط کار باید پیش‌نمایش رو هم تازه کنه
  const [theme, setTheme] = useState<string>("");
  useEffect(() => {
    if (!open) return;
    const read = () => setTheme(document.body.getAttribute("data-theme") ?? "");
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.body, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, [open]);
  const rings = useMemo(() => heroRings(data, routine.stats, routineLocked), [data, routine.stats, routineLocked]);
  const streak = routine.streak ?? 0;

  // مقدار نمایشی هر حلقه روی کارت — کالری با هدفش، نه فقط یه عدد تنها
  const cardRings = useMemo(() => {
    if (typeof document === "undefined") return [];
    const cal = data?.calorie;
    return rings
      // حلقه‌ها همیشه روی کارت می‌مونن؛ فقط عدد زیر بعضی‌هاشون پنهانه (SHOW_VALUE)
      .filter((r) => r.show)
      .map((r) => ({
        label: plain(r.label),
        value: r.value,
        display: !SHOW_VALUE[r.key] ? null : r.key === "calorie" && cal?.target ? `${faNum(Math.round(cal.today.kcal))}/${faNum(Math.round(cal.target.kcal))}` : r.display,
        colors: [resolveColor(r.grad[0]), resolveColor(r.grad[1])] as [string, string],
      }));
    // rings خودش data رو پوشش می‌ده؛ فقط کالری مستقیم خونده می‌شه
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rings, data?.calorie, theme]);

  const input = useMemo<ShareCardInput | null>(() => {
    if (!cardRings.length) return null;
    const [y, m, d] = routine.todayIso.split("-").map(Number);
    const [jy, jm, jd] = toJalali(y, m, d);
    const weekday = FA_WEEKDAY[new Date(y, m - 1, d).getDay()];
    return {
      title: "فعالیت امروز",
      subtitle: `${weekday} ${faNum(jd)} ${J_MONTHS[jm - 1]} ${faNum(jy)}`,
      inviteCode: invite?.code ?? null,
      body: { kind: "rings", streak, items: cardRings },
    };
  }, [invite?.code, routine.todayIso, cardRings, streak]);

  // کلید محتوایی ورودی — هویت شیء با هر رندر والد (مثلا stats تازه با همون
  // اعداد) عوض می‌شد و پیش‌نمایش بی‌دلیل دوباره ساخته و دکمه لحظه‌ای غیرفعال می‌شد
  const inputKey = useMemo(() => (input ? JSON.stringify([theme, input]) : null), [input, theme]);
  const inputRef = useRef(input);
  inputRef.current = input;

  // ── کارایی ──
  // قبلا هر تغییر کل کارت رو با تراکم 2 (2160×2700) از صفر می‌ساخت، بعد PNG
  // چندمگابایتی encode و دوباره به‌صورت <img> decode می‌کرد — همه روی ترد اصلی،
  // که مودال و سوییچ‌ها رو لگ می‌کرد. حالا:
  //  • پیش‌نمایش مستقیم روی همین <canvas> با تراکم 1 (یک‌چهارم پیکسل، بدون encode/decode)
  //  • پس‌زمینه‌ی شیشه‌ای سنگین یک بار برای هر تم کش می‌شه (lib/shareCard.ts)
  //  • اولین رندر بعد از انیمیشن بازشدن، تا باز شدن نرم بمونه
  //  • blob کامل 2× (که navigator.share باید از *قبل* داشته باشه) در دو نوبت بیکاری
  //    جدا ساخته می‌شه — اول پس‌زمینه، بعد محتوا + PNG — و با کلید ورودی نگه داشته می‌شه
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const openedAt = useRef(0);
  const shownKey = useRef<string | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const fullRef = useRef<FullCard | null>(null);
  const [full, setFull] = useState<FullCard | null>(null);
  const [renderErr, setRenderErr] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (open) openedAt.current = performance.now();
    else { shownKey.current = null; setPreviewKey(null); }
  }, [open]);
  // پس‌زمینه‌ی پیش‌نمایش (1×) از قبل، در زمان بیکاری بعد از لود داشبورد
  useEffect(() => {
    const w = window as IdleWindow;
    const run = () => { try { prepareShareBackground(1); } catch { /* موقع باز شدن ساخته می‌شه */ } };
    if (w.requestIdleCallback) { const id = w.requestIdleCallback(run, { timeout: 6000 }); return () => w.cancelIdleCallback?.(id); }
    const t = window.setTimeout(run, 3000);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    const inp = inputRef.current;
    if (!open || !inputKey || !inp) return;
    let alive = true;
    setRenderErr(false);
    const w = window as IdleWindow;
    const later = (fn: () => void) => (w.requestIdleCallback ? w.requestIdleCallback(fn, { timeout: 500 }) : window.setTimeout(fn, 0));
    // اولین بار: صبر تا انیمیشن مودال (280ms) تموم بشه؛ بعدش فقط کمی debounce
    const wait = shownKey.current === null ? Math.max(0, 300 - (performance.now() - openedAt.current)) : 140;
    const t = setTimeout(async () => {
      const target = canvasRef.current;
      if (!target) return;
      try {
        await renderShareCard(inp, { dpr: 1, target });
        if (!alive) return;
        shownKey.current = inputKey;
        setPreviewKey(inputKey);
      } catch {
        if (alive) { setRenderErr(true); shownKey.current = null; setPreviewKey(null); }
        return;
      }
      if (fullRef.current?.key === inputKey) return; // همین الان آماده‌ست (مثلا بازکردن دوباره)
      later(() => {
        if (!alive) return;
        try { prepareShareBackground(); } catch { /* رندر کامل خودش می‌سازه */ }
        later(async () => {
          if (!alive) return;
          try {
            const blob = await canvasToBlob(await renderShareCard(inp));
            if (!alive) return;
            fullRef.current = { key: inputKey, blob };
            setFull(fullRef.current);
          } catch {
            if (alive) setRenderErr(true);
          }
        });
      });
    }, wait);
    return () => { alive = false; clearTimeout(t); };
  }, [open, inputKey, attempt]);

  const ready = !!full && full.key === inputKey && !renderErr;
  const rendering = !!inputKey && !ready && !renderErr;
  const shown = previewKey !== null;
  const stale = shown && previewKey !== inputKey;

  const { canShare, phase, result, share, reset } = useImageShare();
  useEffect(() => { if (!open) reset(); }, [open, reset]);

  function doShare() {
    if (!ready || !full) return;
    const lead = streak ? `${faNum(streak)} روز پشت‌سرهم روتینم رو کامل کردم 🔥` : "امروزم توی آریون 💪";
    const inv = invite ? { code: invite.code, url: invite.url, percent: REFERRAL_DISCOUNT_PERCENT } : null;
    share(full.blob, `arion-${routine.todayIso}.png`, "فعالیت امروز", shareText(lead, inv));
  }

  // ── فوکوس: داخل پنجره، و بعد از بستن برگشت به دکمه‌ی بازکننده ──
  const sheetRef = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const raf = requestAnimationFrame(() => sheetRef.current?.focus({ preventScroll: true }));
    return () => {
      cancelAnimationFrame(raf);
      const el = returnTo.current;
      returnTo.current = null;
      if (el && el.isConnected) el.focus({ preventScroll: true });
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab" || !sheetRef.current) return;
      const els = Array.from(sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (!els.length) return;
      const first = els[0], last = els[els.length - 1];
      const cur = document.activeElement;
      if (e.shiftKey && (cur === first || cur === sheetRef.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const saveOnly = canShare === false;
  const busy = phase === "busy";
  let btnBody: React.ReactNode;
  let btnLabel: string;
  if (phase === "done") {
    btnLabel = result === "downloaded" ? "ذخیره شد" : "ارسال شد";
    btnBody = (
      <motion.span className="db-share-btn-in" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 420, damping: 18 }}>
        <Check size={17} strokeWidth={3} /> {btnLabel}
      </motion.span>
    );
  } else if (busy || rendering) {
    // طبق قانون لودینگ سایت: فقط دایره، بدون متن (متن برای صفحه‌خوان در aria-label)
    btnLabel = busy ? "در حال اشتراک" : "در حال آماده‌سازی تصویر";
    btnBody = <Spinner size={16} />;
  } else {
    // خطای اشتراک: هیچ متنی زیر دکمه نمیاد، خود دکمه «تلاش دوباره» می‌شه
    btnLabel = phase === "error" ? "تلاش دوباره" : saveOnly ? "ذخیره تصویر" : "اشتراک‌گذاری";
    btnBody = <span className="db-share-btn-in">{saveOnly ? <Download size={17} /> : <Share2 size={16} />} {btnLabel}</span>;
  }

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="db-share-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            ref={sheetRef}
            tabIndex={-1}
            className="db-share"
            role="dialog"
            aria-modal="true"
            aria-label="اشتراک موفقیت"
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.28, ease: D_EASE }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
          >
            <button type="button" className="trade-icon-btn db-share-close" onClick={onClose} aria-label="بستن"><X size={18} /></button>

            <div className="db-share-preview" aria-busy={rendering || undefined}>
              {!input ? (
                <p className="db-share-empty">هنوز حلقه‌ای برای امروز نیست</p>
              ) : renderErr ? (
                <div className="db-share-fail" role="alert">
                  <p>ساخت تصویر ممکن نشد</p>
                  <button type="button" className="account-outline-btn" onClick={() => setAttempt((n) => n + 1)}>تلاش دوباره</button>
                </div>
              ) : (
                <>
                  <canvas
                    ref={canvasRef}
                    className={`db-share-canvas${shown ? "" : " is-hidden"}${stale ? " is-dim" : ""}`}
                    role="img"
                    aria-label="پیش‌نمایش تصویر اشتراکی"
                  />
                  {!shown && <PreviewSkeleton />}
                  {stale && <span className="db-share-preview-spin"><Spinner size={18} /></span>}
                </>
              )}
            </div>

            <button
              type="button"
              className={`trade-primary-btn db-share-btn${phase === "done" ? " is-done" : ""}`}
              onClick={doShare}
              disabled={!ready || busy}
              aria-label={btnLabel}
              aria-busy={busy || rendering || undefined}
            >
              {btnBody}
            </button>
            <span className="sr-only" role="status" aria-live="polite">
              {phase === "error" ? "اشتراک انجام نشد" : result === "downloaded" ? "تصویر توی دانلودها ذخیره شد" : ""}
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
