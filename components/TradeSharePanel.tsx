"use client";

// «اشتراک کارنامه‌ی ترید» — هم‌ساختار پنجره‌ی اشتراک داشبورد (DashboardShare):
// پورتال روی body، همون باز/بسته‌شدن، Escape و تپ بیرون، فوکوس داخل پنجره، و
// تصویر از قبل ساخته‌شده تا تپ روی دکمه بدون انتظار navigator.share رو صدا بزنه.
// بالای تصویر فقط انتخاب‌ها: بازه (روز/هفته/ماه)، جابه‌جایی بازه و حساب — بدون
// هیچ متن توضیحی. همه‌ی عددها سمت سرور حساب می‌شن (GET /api/trade/share،
// قرارداد lib/tradeShareTypes.ts) و تصویر کاملا سمت کلاینت (lib/tradeShareCard.ts).

import "@/app/dashboard/dashboard.css";
import "./trade-share.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Download, Share2, X } from "lucide-react";
import { isoLocal, jalaliMonthLength, jalaliToIso, toJalali } from "@/lib/jalali";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { useMyInvite } from "@/lib/invite";
import { REFERRAL_DISCOUNT_PERCENT } from "@/lib/referral";
import { canvasToBlob, shareText } from "@/lib/shareCard";
import { useImageShare } from "@/lib/useImageShare";
import { renderTradeShareCard } from "@/lib/tradeShareCard";
import type { TradeShareAccount, TradeSharePeriod, TradeShareQuery, TradeShareResponse } from "@/lib/tradeShareTypes";
import { SegmentedTabs } from "./SegmentedTabs";
import { Spinner } from "./Spinner";
import { D_EASE } from "./DashboardKit";

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
const PERIOD_OPTIONS: { value: TradeSharePeriod; label: string }[] = [
  { value: "day", label: "روز" },
  { value: "week", label: "هفته" },
  { value: "month", label: "ماه" },
];
/** تا این تعداد گزینه (با «همه») انتخاب حساب SegmentedTabs ـه، بیشترش سلکت */
const MAX_ACCOUNT_TABS = 3;
const ALL = "all";

type IdleWindow = Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };

// ── تاریخ: «امروز» به وقت ایران، هم‌قاعده‌ی سرور ──
function tehranToday(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  } catch {
    return isoLocal(new Date());
  }
}
function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function addDays(iso: string, n: number): string {
  const d = parseIso(iso);
  d.setDate(d.getDate() + n);
  return isoLocal(d);
}
function addJalaliMonths(iso: string, n: number): string {
  const d = parseIso(iso);
  const [jy, jm, jd] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const idx = jy * 12 + (jm - 1) + n;
  const ny = Math.floor(idx / 12), nm = (idx % 12) + 1;
  for (let day = Math.min(jd, jalaliMonthLength(nm)); day >= 1; day--) {
    const out = jalaliToIso(ny, nm, day);
    if (out) return out;
  }
  return iso;
}
function shiftAnchor(period: TradeSharePeriod, iso: string, dir: 1 | -1): string {
  if (period === "day") return addDays(iso, dir);
  if (period === "week") return addDays(iso, 7 * dir);
  return addJalaliMonths(iso, dir);
}
/** شروع بازه‌ای که iso داخلشه — هفته از شنبه، ماه = اول ماه شمسی */
function rangeStart(period: TradeSharePeriod, iso: string): string {
  if (period === "day") return iso;
  const d = parseIso(iso);
  if (period === "week") return addDays(iso, -((d.getDay() + 1) % 7));
  const [jy, jm] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return jalaliToIso(jy, jm, 1) ?? iso;
}

const queryKey = (q: TradeShareQuery) => `${q.period}|${q.date}|${q.account}`;

export function TradeSharePanel({
  open,
  onClose,
  initialAccount = ALL,
}: {
  open: boolean;
  onClose: () => void;
  /** حساب از پیش انتخاب‌شده (صفحه‌ی یک حساب)؛ پیش‌فرض همه‌ی حساب‌ها */
  initialAccount?: string;
}) {
  useLockBodyScroll(open);
  const invite = useMyInvite();

  // ── انتخاب‌ها؛ هر بار بازشدن از امروز و حساب ورودی شروع می‌شه ──
  const [today, setToday] = useState(() => tehranToday());
  const [period, setPeriod] = useState<TradeSharePeriod>("day");
  const [anchor, setAnchor] = useState(today);
  const [account, setAccount] = useState<string>(initialAccount);
  useEffect(() => {
    if (!open) return;
    const t = tehranToday();
    setToday(t);
    setAnchor(t);
    setPeriod("day");
    setAccount(initialAccount);
  }, [open, initialAccount]);

  const query = useMemo<TradeShareQuery>(() => ({ period, date: anchor, account }), [period, anchor, account]);
  const qKey = queryKey(query);
  const nextDisabled = rangeStart(period, shiftAnchor(period, anchor, 1)) > today;
  const goPrev = () => setAnchor((a) => shiftAnchor(period, a, -1));
  const goNext = () => {
    if (nextDisabled) return;
    setAnchor((a) => { const n = shiftAnchor(period, a, 1); return n > today ? today : n; });
  };

  // ── داده: هر تغییر انتخاب یک درخواست، درخواست کهنه abort می‌شه ──
  const [resp, setResp] = useState<{ key: string; body: TradeShareResponse } | null>(null);
  const [accounts, setAccounts] = useState<TradeShareAccount[] | null>(null);
  const [fetchErr, setFetchErr] = useState(false);
  const [fetchAttempt, setFetchAttempt] = useState(0);
  useEffect(() => {
    if (!open) return;
    const ac = new AbortController();
    setFetchErr(false);
    const qs = new URLSearchParams({ period: query.period, date: query.date, account: query.account });
    fetch(`/api/trade/share?${qs}`, { signal: ac.signal, cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        return (await r.json()) as TradeShareResponse;
      })
      .then((body) => {
        if (ac.signal.aborted) return;
        setResp({ key: queryKey(query), body });
        setAccounts(body.accounts);
      })
      .catch(() => { if (!ac.signal.aborted) setFetchErr(true); });
    return () => ac.abort();
  }, [open, query, fetchAttempt]);
  useEffect(() => { if (!open) { setResp(null); setFetchErr(false); } }, [open]);

  // حساب انتخاب‌شده دیگه در فهرست نیست (مثلا آرشیو شد) → همه‌ی حساب‌ها
  useEffect(() => {
    if (accounts && account !== ALL && !accounts.some((a) => a.id === account)) setAccount(ALL);
  }, [accounts, account]);

  const data = resp?.key === qKey ? resp.body.data : null;
  const rangeLabel = resp?.body.data.rangeLabel ?? null;

  // کارت رنگ‌های تم فعلی رو می‌گیره — عوض‌شدن تم باید پیش‌نمایش رو تازه کنه
  const [theme, setTheme] = useState("");
  useEffect(() => {
    if (!open) return;
    const read = () => setTheme(document.body.getAttribute("data-theme") ?? "");
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.body, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, [open]);

  // ── تصویر: پیش‌نمایش با تراکم 1، بعد blob کامل در زمان بیکاری ──
  const inviteCode = invite?.code ?? null;
  const renderKey = data ? JSON.stringify([theme, inviteCode, data]) : null;
  const dataRef = useRef(data);
  dataRef.current = data;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const openedAt = useRef(0);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [aspect, setAspect] = useState<string>("1080 / 1350");
  const [full, setFull] = useState<{ key: string; blob: Blob } | null>(null);
  const [renderErr, setRenderErr] = useState(false);
  const [renderAttempt, setRenderAttempt] = useState(0);
  useEffect(() => {
    if (open) openedAt.current = performance.now();
    else { setPreviewKey(null); setFull(null); }
  }, [open]);
  useEffect(() => {
    const d = dataRef.current;
    if (!open || !renderKey || !d) return;
    let alive = true;
    setRenderErr(false);
    const w = window as IdleWindow;
    const later = (fn: () => void) => (w.requestIdleCallback ? w.requestIdleCallback(fn, { timeout: 500 }) : window.setTimeout(fn, 0));
    const siteHost = window.location.host.replace(/^www\./, "");
    // بار اول صبر تا انیمیشن بازشدن (280ms)؛ بعدش debounce کوتاه بین انتخاب‌های پشت‌سرهم
    const wait = Math.max(160, 300 - (performance.now() - openedAt.current));
    const t = setTimeout(async () => {
      try {
        const src = await renderTradeShareCard(d, { dpr: 1, inviteCode, siteHost });
        const target = canvasRef.current;
        if (!alive || !target) return;
        target.width = src.width;
        target.height = src.height;
        target.getContext("2d")?.drawImage(src, 0, 0);
        setAspect(`${src.width} / ${src.height}`);
        setPreviewKey(renderKey);
      } catch {
        if (alive) setRenderErr(true);
        return;
      }
      later(async () => {
        if (!alive) return;
        try {
          const blob = await canvasToBlob(await renderTradeShareCard(d, { inviteCode, siteHost }));
          if (alive) setFull({ key: renderKey, blob });
        } catch {
          if (alive) setRenderErr(true);
        }
      });
    }, wait);
    return () => { alive = false; clearTimeout(t); };
    // inviteCode و theme داخل renderKey هستن
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, renderKey, renderAttempt]);

  const failed = fetchErr || renderErr;
  const ready = !!full && full.key === renderKey && !failed;
  const preparing = !ready && !failed;
  const shown = previewKey !== null;
  const stale = shown && previewKey !== renderKey;

  const { canShare, phase, result, share, reset } = useImageShare();
  useEffect(() => { if (!open) reset(); }, [open, reset]);

  const retry = useCallback(() => {
    if (fetchErr) setFetchAttempt((n) => n + 1);
    else setRenderAttempt((n) => n + 1);
  }, [fetchErr]);

  function onButton() {
    if (failed) { retry(); return; }
    if (!ready || !full || !data) return;
    const lead = `کارنامه‌ی ترید من: ${data.rangeLabel} 📈`;
    const inv = invite ? { code: invite.code, url: invite.url, percent: REFERRAL_DISCOUNT_PERCENT } : null;
    share(full.blob, `arion-trade-${data.period}-${anchor}.png`, "کارنامه‌ی ترید", shareText(lead, inv));
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

  // ── دکمه: همون حالت‌های پنجره‌ی داشبورد؛ خطا = «تلاش دوباره» روی خود دکمه ──
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
  } else if (busy || preparing) {
    btnLabel = busy ? "در حال اشتراک" : "در حال آماده‌سازی تصویر";
    btnBody = <Spinner size={16} />;
  } else {
    btnLabel = failed || phase === "error" ? "تلاش دوباره" : saveOnly ? "ذخیره تصویر" : "اشتراک‌گذاری";
    btnBody = <span className="db-share-btn-in">{failed ? null : saveOnly ? <Download size={17} /> : <Share2 size={16} />} {btnLabel}</span>;
  }

  const accountOptions = useMemo(() => {
    const list = accounts ?? [];
    return [{ id: ALL, name: "همه‌ی حساب‌ها", color: "" }, ...list.map((a) => ({ id: a.id, name: a.name, color: a.color }))];
  }, [accounts]);
  const selectedColor = accountOptions.find((a) => a.id === account)?.color ?? "";

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="db-share-root ts-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            ref={sheetRef}
            tabIndex={-1}
            className="db-share ts-share"
            role="dialog"
            aria-modal="true"
            aria-label="اشتراک کارنامه‌ی ترید"
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.28, ease: D_EASE }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
          >
            <button type="button" className="trade-icon-btn db-share-close" onClick={onClose} aria-label="بستن"><X size={18} /></button>

            <SegmentedTabs options={PERIOD_OPTIONS} active={period} onChange={setPeriod} className="ts-tabs" ariaLabel="بازه" />

            <div className="ts-nav">
              <button type="button" className="trade-icon-btn ts-nav-btn" onClick={goPrev} aria-label="بازه‌ی قبلی"><ChevronRight size={18} /></button>
              <span className={`ts-nav-label${data ? "" : " is-dim"}`} aria-live="polite">
                {rangeLabel ?? <span className="db-skel ts-nav-skel" aria-hidden="true" />}
              </span>
              <button type="button" className="trade-icon-btn ts-nav-btn" onClick={goNext} disabled={nextDisabled} aria-label="بازه‌ی بعدی"><ChevronLeft size={18} /></button>
            </div>

            {accounts && accountOptions.length > 1 && (
              accountOptions.length <= MAX_ACCOUNT_TABS ? (
                <SegmentedTabs
                  options={accountOptions.map((a) => ({
                    value: a.id,
                    label: a.color ? <span className="ts-acc-opt"><span className="ts-dot" style={{ background: a.color }} />{a.name}</span> : a.name,
                  }))}
                  active={account}
                  onChange={setAccount}
                  className="ts-tabs"
                  ariaLabel="حساب"
                />
              ) : (
                <span className={`acc-select-wrap ts-select-wrap${selectedColor ? " has-dot" : ""}`}>
                  {selectedColor && <span className="ts-dot ts-select-dot" style={{ background: selectedColor }} aria-hidden="true" />}
                  <select className="wsearch-newform-name trade-glass-field acc-select" value={account} onChange={(e) => setAccount(e.target.value)} aria-label="حساب">
                    {accountOptions.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  <ChevronDown size={15} />
                </span>
              )
            )}

            <div className="db-share-preview" style={{ aspectRatio: aspect }} aria-busy={preparing || undefined}>
              {renderErr ? (
                <div className="db-share-fail" role="alert"><p>ساخت تصویر ممکن نشد</p></div>
              ) : fetchErr && !shown ? (
                <div className="db-share-fail" role="alert"><p>دریافت کارنامه ممکن نشد</p></div>
              ) : (
                <>
                  <canvas
                    ref={canvasRef}
                    className={`db-share-canvas${shown ? "" : " is-hidden"}${stale || fetchErr ? " is-dim" : ""}`}
                    role="img"
                    aria-label="پیش‌نمایش کارنامه‌ی ترید"
                  />
                  {!shown && <div className="db-share-skel ts-skel" aria-hidden="true"><span className="db-skel" /></div>}
                  {stale && !fetchErr && <span className="db-share-preview-spin"><Spinner size={18} /></span>}
                </>
              )}
            </div>

            <button
              type="button"
              className={`trade-primary-btn db-share-btn${phase === "done" ? " is-done" : ""}`}
              onClick={onButton}
              disabled={(!ready && !failed) || busy}
              aria-label={btnLabel}
              aria-busy={busy || preparing || undefined}
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
