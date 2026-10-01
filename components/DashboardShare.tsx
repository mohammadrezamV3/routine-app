"use client";

// «اشتراک موفقیت» از داشبورد. کاربر اول انتخاب می‌کنه *چی* رو به اشتراک بذاره
// — حلقه‌های امروز یا نقشه‌ی ثبات ماه (هر بار فقط یکی، تا تصویر شلوغ نشه) —
// و بعد هرچی رو نخواد دیده بشه خاموش می‌کنه — حلقه‌ها همیشه روی کارت می‌مونن و
// سوییچ فقط عدد زیر هر حلقه (مثلا کالری، که پیش‌فرض پنهانه) رو پنهان می‌کنه. وسط حلقه‌ها تعداد روزهای استریک میاد. پیش‌نمایش همون لحظه عوض
// می‌شه؛ انتخاب‌ها فقط روی همین دستگاه یادآوری می‌شن (localStorage) و تصویر فقط
// با زدن «اشتراک‌گذاری» از دستگاه بیرون می‌ره — هیچ‌چیز به سرور نمی‌ره.
//
// «بهونه»ی دعوت: کد رفرال کاربر (اگه روشن باشه) بالای کارت، و متن و لینک
// دعوت همراه پیام اشتراک (lib/invite.ts).
//
// راحتی کار:
//  - تصویر هر حالت از قبل (پشت پیش‌نمایش) ساخته می‌شه؛ تپ روی دکمه بدون هیچ
//    انتظاری navigator.share رو صدا می‌زنه (سافاری iOS بیرون از حرکت کاربر
//    اجازه نمی‌ده). تا تصویر همون انتخاب‌ها آماده نشده، دکمه غیرفعاله — پس
//    هیچ‌وقت تصویر کهنه نمی‌ره.
//  - فقط *یک* دکمه؛ برچسبش با توانایی مرورگر عوض می‌شه («اشتراک‌گذاری» یا
//    «ذخیره تصویر») و بعد از موفقیت یه تیک کوتاه نشون می‌ده.
//  - روی موبایل برگه‌ی پایینی با دستگیره (کشیدن به پایین = بستن) و دکمه‌ی
//    چسبیده به پایین، تا با یک دست بدون اسکرول در دسترس باشه.
//  - Escape می‌بنده، فوکوس داخل پنجره می‌مونه و بعد از بستن به دکمه‌ی بازکننده برمی‌گرده.

import "@/app/dashboard/dashboard.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls, type PanInfo } from "framer-motion";
import { Check, Download, Share2, X } from "lucide-react";
import { FA_WEEKDAY, J_MONTHS, faNum, toJalali } from "@/lib/jalali";
import { buildMonth, heatLevel, jalaliOfIso } from "@/lib/dashboardCompute";
import type { DashboardData } from "@/lib/dashboardTypes";
import type { ScheduleOpts } from "@/lib/schedule";
import type { DailyRecord } from "@/lib/storage";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { useMyInvite } from "@/lib/invite";
import { REFERRAL_DISCOUNT_PERCENT } from "@/lib/referral";
import { canvasToBlob, renderShareCard, shareText, type ShareCardInput } from "@/lib/shareCard";
import { useImageShare } from "@/lib/useImageShare";
import { heroRings, type HeroRing } from "./DashboardHero";
import { SegmentedTabs } from "./SegmentedTabs";
import { ToggleSwitch } from "./ToggleSwitch";
import { Spinner } from "./Spinner";
import { D_EASE } from "./DashboardKit";

type Kind = "rings" | "month";
type Opts = { kind: Kind; routine: boolean; exercise: boolean; calorie: boolean; invite: boolean };
// کالری پیش‌فرض خاموشه — عدد شخصی‌تریه که خیلی‌ها نمی‌خوان دیده بشه
const DEFAULTS: Opts = { kind: "rings", routine: true, exercise: true, calorie: false, invite: true };
const KEY = "arion:dashShare:v2";
const MOBILE_Q = "(max-width:760px)";
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function loadOpts(): Opts {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const v = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Opts>) };
    return v.kind === "rings" || v.kind === "month" ? v : { ...v, kind: DEFAULTS.kind };
  } catch {
    return DEFAULTS;
  }
}

/** رنگ حلقه‌ها توکن‌های --ring-*  داشبوردن؛ canvas مقدار واقعی‌شون رو لازم داره */
function resolveColor(v: string): string {
  const m = v.match(/^var\((--[\w-]+)\)$/);
  if (!m) return v;
  const el = document.querySelector(".db-page") ?? document.body;
  return getComputedStyle(el).getPropertyValue(m[1]).trim() || "#00C98D";
}

/** بخش اشتراک هیچ اعرابی نداره — برچسب‌های مشترک با هیرو (مثل «تمرین امروز») هم تمیز می‌شن */
const plain = (t: string) => t.replace(/[ً-ْٰ]/g, "");

function isoOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** اسکلت هم‌شکل کارت — جای پیش‌نمایش از اول ثابته و چیزی نمی‌پره */
function PreviewSkeleton({ kind }: { kind: Kind }) {
  return (
    <div className="db-share-skel" aria-hidden="true">
      <div className="db-share-skel-head">
        <span className="db-skel" style={{ width: "26%", height: 14 }} />
        <span className="db-skel" style={{ width: "38%", height: 18 }} />
      </div>
      <span className="db-share-skel-line" />
      {kind === "rings" ? (
        <div className="db-share-skel-rings">
          <span className="db-share-skel-ring"><span className="db-share-skel-ring"><span className="db-share-skel-ring" /></span></span>
        </div>
      ) : (
        <div className="db-share-skel-grid">
          {Array.from({ length: 35 }, (_, i) => <span key={i} className="db-skel" />)}
        </div>
      )}
      <div className="db-share-skel-foot">
        <span className="db-skel" style={{ width: "22%", height: 12 }} />
        <span className="db-skel" style={{ width: "22%", height: 12 }} />
        <span className="db-skel" style={{ width: "22%", height: 12 }} />
      </div>
    </div>
  );
}

type Card = { key: string; blob: Blob; url: string };

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
    opts: ScheduleOpts;
    daily: Record<string, DailyRecord>;
    todayIso: string;
  };
  /** ماژول «روتین من» قفله → حلقه‌ی روتین نیست (هم‌رفتار با هیرو) */
  routineLocked?: boolean;
}) {
  useLockBodyScroll(open);
  const [opts, setOpts] = useState<Opts>(DEFAULTS);
  useEffect(() => { if (open) setOpts(loadOpts()); }, [open]);
  function set<K extends keyof Opts>(k: K, v: Opts[K]) {
    setOpts((o) => {
      const next = { ...o, [k]: v };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* فقط برای همین بار */ }
      return next;
    });
  }

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
  const ringOf = (k: HeroRing["key"]) => rings.find((r) => r.key === k)!;
  const streak = routine.streak ?? 0;
  const [ty, tm] = jalaliOfIso(routine.todayIso);

  const joinIso = useMemo(() => {
    const d = data?.user.memberSince ? new Date(data.user.memberSince) : null;
    return d && !Number.isNaN(d.getTime()) ? isoOf(d) : undefined;
  }, [data?.user.memberSince]);

  // ماه جاری فقط وقتی لازمه ساخته می‌شه (حالت نقشه)
  const month = useMemo(
    () => (opts.kind === "month" ? buildMonth(ty, tm, routine.todayIso, routine.opts, routine.daily, joinIso) : null),
    [opts.kind, ty, tm, routine.todayIso, routine.opts, routine.daily, joinIso]
  );

  // مقدار نمایشی هر حلقه روی کارت — کالری با هدفش، نه فقط یه عدد تنها
  const cardRings = useMemo(() => {
    if (typeof document === "undefined") return [];
    const cal = data?.calorie;
    return rings
      // حلقه‌ها همیشه روی کارت می‌مونن؛ سوییچ فقط عدد زیر هر حلقه رو پنهان می‌کنه
      .filter((r) => r.show)
      .map((r) => ({
        label: plain(r.label),
        value: r.value,
        display: !opts[r.key] ? null : r.key === "calorie" && cal?.target ? `${faNum(Math.round(cal.today.kcal))}/${faNum(Math.round(cal.target.kcal))}` : r.display,
        colors: [resolveColor(r.grad[0]), resolveColor(r.grad[1])] as [string, string],
      }));
    // rings خودش data رو پوشش می‌ده؛ فقط کالری مستقیم خونده می‌شه
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rings, opts, data?.calorie, theme]);

  const input = useMemo<ShareCardInput | null>(() => {
    const [y, m, d] = routine.todayIso.split("-").map(Number);
    const [jy, jm, jd] = toJalali(y, m, d);
    const weekday = FA_WEEKDAY[new Date(y, m - 1, d).getDay()];
    const base = {
      title: "فعالیت امروز",
      subtitle: `${weekday} ${faNum(jd)} ${J_MONTHS[jm - 1]} ${faNum(jy)}`,
      inviteCode: opts.invite ? invite?.code ?? null : null,
    };
    if (opts.kind === "rings") {
      if (!cardRings.length) return null;
      return { ...base, body: { kind: "rings", streak, items: cardRings } };
    }
    if (!month) return null;
    return {
      ...base,
      body: {
        kind: "month",
        streak,
        title: `نقشه‌ی ثبات ${J_MONTHS[tm - 1]} ${faNum(ty)}`,
        lead: month.lead,
        cells: month.cells.map((c) => ({ jd: c.jd, level: heatLevel(c.pct), today: c.today, future: c.future })),
        stats: [
          { label: "روز کامل", value: faNum(month.perfect) },
          { label: "میانگین ماه", value: month.avg === null ? "—" : `${faNum(month.avg)}%` },
        ],
      },
    };
  }, [opts.kind, opts.invite, invite?.code, routine.todayIso, cardRings, month, streak, ty, tm]);

  // کلید محتوایی ورودی — هویت شیء با هر رندر والد (مثلا stats تازه با همون
  // اعداد) عوض می‌شد و پیش‌نمایش بی‌دلیل دوباره ساخته و دکمه لحظه‌ای غیرفعال می‌شد
  const inputKey = useMemo(() => (input ? JSON.stringify([theme, input]) : null), [input, theme]);
  const inputRef = useRef(input);
  inputRef.current = input;

  // پیش‌نمایش زنده — کمی تاخیر تا چند تغییر پشت‌سرهم یک رندر بشن. blob هر
  // رندر با کلید همون ورودی نگه داشته می‌شه و همون می‌ره، نه یه ساخت تازه.
  const [card, setCard] = useState<Card | null>(null);
  const cardRef = useRef<Card | null>(null);
  const [renderErr, setRenderErr] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const inp = inputRef.current;
    if (!open || !inputKey || !inp) return;
    if (cardRef.current?.key === inputKey) return; // همین الان آماده‌ست (مثلا بازکردن دوباره)
    let alive = true;
    setRenderErr(false);
    const t = setTimeout(async () => {
      try {
        const blob = await canvasToBlob(await renderShareCard(inp));
        if (!alive) return;
        const next = { key: inputKey, blob, url: URL.createObjectURL(blob) };
        const prev = cardRef.current;
        cardRef.current = next;
        setCard(next);
        // آدرس قبلی بعد از نشستن تصویر تازه آزاد می‌شه، نه قبلش
        if (prev) setTimeout(() => URL.revokeObjectURL(prev.url), 500);
      } catch {
        if (alive) setRenderErr(true);
      }
    }, cardRef.current ? 140 : 0);
    return () => { alive = false; clearTimeout(t); };
  }, [open, inputKey, attempt]);
  useEffect(() => () => { if (cardRef.current) URL.revokeObjectURL(cardRef.current.url); }, []);

  const ready = !!card && card.key === inputKey && !renderErr;
  const rendering = !!inputKey && !ready && !renderErr;

  const { canShare, phase, result, share, reset } = useImageShare();
  useEffect(() => { if (!open) reset(); }, [open, reset]);

  function doShare() {
    if (!ready || !card) return;
    const lead = streak ? `${faNum(streak)} روز پشت‌سرهم روتینم رو کامل کردم 🔥` : "امروزم توی آریون 💪";
    const inv = invite && opts.invite ? { code: invite.code, url: invite.url, percent: REFERRAL_DISCOUNT_PERCENT } : null;
    share(card.blob, `arion-${routine.todayIso}.png`, "فعالیت امروز", shareText(lead, inv));
  }

  // ── موبایل: برگه‌ی پایینی با کشیدن به پایین بسته می‌شه ──
  const mobile = useMemo(
    () => open && typeof window !== "undefined" && window.matchMedia(MOBILE_Q).matches,
    [open]
  );
  const drag = useDragControls();
  const startDrag = useCallback((e: React.PointerEvent) => {
    if (!mobile || (e.target as HTMLElement).closest("button")) return;
    drag.start(e);
  }, [mobile, drag]);
  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > 110 || info.velocity.y > 650) onClose();
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

  const ringRows = (["routine", "exercise", "calorie"] as const)
    .map((k) => ringOf(k))
    .filter((r) => r.show);

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
    btnLabel = saveOnly ? "ذخیره تصویر" : "اشتراک‌گذاری";
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
            aria-labelledby="db-share-title"
            initial={mobile ? { y: "100%" } : { opacity: 0, y: 18, scale: 0.97 }}
            animate={mobile ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
            exit={mobile ? { y: "100%" } : { opacity: 0, y: 10, scale: 0.98 }}
            transition={mobile ? { type: "spring", stiffness: 380, damping: 38 } : { duration: 0.28, ease: D_EASE }}
            drag={mobile ? "y" : false}
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={onDragEnd}
          >
            <div className="db-share-grab" onPointerDown={startDrag} aria-hidden="true"><span /></div>
            <div className="db-share-head" onPointerDown={startDrag}>
              <h2 id="db-share-title">اشتراک موفقیت</h2>
              <button type="button" className="trade-icon-btn" onClick={onClose} aria-label="بستن"><X size={18} /></button>
            </div>

            <div className="db-share-body thin-scroll">
              <div className="db-share-preview" aria-busy={rendering || undefined}>
                {!input ? (
                  <p className="db-share-empty">هنوز حلقه‌ای برای امروز نیست</p>
                ) : renderErr ? (
                  <div className="db-share-fail" role="alert">
                    <p>ساخت تصویر ممکن نشد</p>
                    <button type="button" className="account-outline-btn" onClick={() => setAttempt((n) => n + 1)}>تلاش دوباره</button>
                  </div>
                ) : card ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={card.url} alt="پیش‌نمایش تصویر اشتراکی" className={rendering ? "is-dim" : undefined} />
                    {rendering && <span className="db-share-preview-spin"><Spinner size={18} /></span>}
                  </>
                ) : (
                  <PreviewSkeleton kind={opts.kind} />
                )}
              </div>

              <div className="db-share-side">
                <div className="db-share-group">
                  <p className="db-share-label">نوع تصویر</p>
                  <SegmentedTabs
                    ariaLabel="نوع تصویر"
                    className="db-share-kind"
                    options={[{ value: "rings", label: "حلقه‌های امروز" }, { value: "month", label: "نقشه‌ی ثبات" }]}
                    active={opts.kind}
                    onChange={(v) => set("kind", v)}
                  />
                </div>

                {opts.kind === "rings" && (
                  <div className="db-share-group">
                    <p className="db-share-label">عدد زیر کدوم حلقه‌ها دیده بشه؟</p>
                    <ul className="db-share-list">
                      {ringRows.map((r) => (
                        <li key={r.key}>
                          <span className="db-share-dot" style={{ background: `linear-gradient(135deg, ${r.grad[0]}, ${r.grad[1]})` }} aria-hidden="true" />
                          <span className="db-share-row-text">
                            <span>{plain(r.label)}</span>
                            <small dir="ltr">{r.display}</small>
                          </span>
                          <ToggleSwitch checked={opts[r.key]} onChange={(v) => set(r.key, v)} label={`نمایش عدد ${plain(r.label)}`} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="db-share-group">
                  <p className="db-share-label">روی تصویر</p>
                  <ul className="db-share-list">
                    <li>
                      <span className="db-share-row-text">
                        <span>کد دعوت</span>
                        <small>{faNum(REFERRAL_DISCOUNT_PERCENT)}٪ تخفیف برای دوستت</small>
                      </span>
                      <ToggleSwitch checked={opts.invite && !!invite?.code} onChange={(v) => set("invite", v)} label="کد دعوت" disabled={!invite?.code} />
                    </li>
                  </ul>
                </div>

                <p className="db-share-invite">
                  {invite?.code
                    ? <>هر دوستی که با کد <b dir="ltr">{invite.code}</b> بیاد، روی اولین اشتراکش {faNum(REFERRAL_DISCOUNT_PERCENT)}٪ تخفیف می‌گیره.</>
                    : "دوستات رو بیار و استریک‌هاتون رو با هم مقایسه کنید!"}
                </p>
              </div>
            </div>

            <div className="db-share-foot">
              <div className="db-share-actions">
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
                <p className={`db-share-status${phase === "error" ? " is-error" : ""}`} role="status" aria-live="polite">
                  {phase === "error" ? (
                    <>اشتراک انجام نشد. <button type="button" className="trade-ghost-btn db-share-retry" onClick={doShare}>تلاش دوباره</button></>
                  ) : result === "downloaded" ? (
                    "تصویر توی دانلودها ذخیره شد — حالا برای دوستات بفرستش"
                  ) : saveOnly ? (
                    "مرورگرت اشتراک مستقیم نداره؛ تصویر ذخیره می‌شه تا خودت بفرستیش"
                  ) : null}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
