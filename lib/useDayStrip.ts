"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { isoLocal } from "@/lib/jalali";

// نوارِ روزهای آزاد (مشترکِ همه‌ی نوارهای افقیِ روز: روتین من، بدنسازی،
// کالری، تقویمِ اقتصادی). دیگر پنجره‌ی چندروزه با فلشِ قبلی/بعدی نیست —
// یک نوارِ پیوسته که با لمس (اسکرولِ بومی با شتاب) و با ماوس (کشیدن +
// شتابِ رهاسازی، همان تکنیکِ ردیف‌های افقیِ بخشِ منتور) آزادانه جابه‌جا
// می‌شود، بدونِ snap. روزها تنبل ساخته می‌شوند: اول ~۳۰ روز دورِ امروز،
// و نزدیکِ هر لبه ~۳۰ روزِ دیگر اضافه می‌شود (با حفظِ جای اسکرول).
//
// قرارداد: هر پیلِ روز باید `data-iso={iso}` داشته باشد (برای نگه‌داشتنِ
// جای اسکرول و وسط‌چین‌کردنِ روزِ فعال).

const CHUNK = 30;
const HALF = CHUNK / 2;
const DAY_MS = 86_400_000;

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export type StripDay = { date: Date; iso: string };

// دسکتاپ باید مثل قبل از «کشیدنِ آزاد» پیج‌بشه (فلشِ قبلی/بعدی)، نه با
// ماوس آزادانه کشیده بشه؛ موبایل همون کشیدنِ آزادِ فعلی رو نگه می‌داره.
// «دسکتاپ» یعنی هم صفحه‌ی عریض (min-width:1024px) هم واقعاً ماوس/hover
// داره (تبلتِ لمسیِ عریض رو دسکتاپ حساب نکنه).
const DESKTOP_QUERY = "(min-width: 1024px) and (hover: hover) and (pointer: fine)";

/**
 * آیا نوار باید حالتِ دسکتاپِ صفحه‌بندی‌شده داشته باشه. مقدارِ اولیه همیشه
 * `false` (SSR-safe) — سرور نمی‌دونه عرضِ صفحه‌ی کلاینت چقدره، پس تا قبل
 * از mount مثلِ موبایل فرض می‌شه و بلافاصله بعدِ mount به مقدارِ واقعی
 * سوییچ می‌کنه؛ این یعنی HTMLِ سرور و اولین رندرِ کلاینت دقیقاً یکی‌ان
 * (بدونِ hydration mismatch)، فقط یک فریمِ بعد رفتار درست می‌شه.
 */
export function useDesktopDayStrip(): boolean {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(DESKTOP_QUERY);
    setDesktop(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return desktop;
}

export function useDayStrip(activeIso: string) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = useMemo(() => startOfLocalDay(new Date()), []);
  const [bounds, setBounds] = useState({ start: -HALF, end: HALF });

  // روزِ فعال (مثلا از «تاریخچه») اگر بیرونِ بازه بود، بازه همان لحظه دورش باز می‌شود.
  const activeOff = Math.round((parseIso(activeIso).getTime() - today.getTime()) / DAY_MS);
  const start = Math.min(bounds.start, activeOff - HALF);
  const end = Math.max(bounds.end, activeOff + HALF);

  const days: StripDay[] = useMemo(() => {
    const out: StripDay[] = [];
    for (let i = start; i <= end; i++) {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      out.push({ date, iso: isoLocal(date) });
    }
    return out;
  }, [start, end, today]);

  // ── حفظِ جای اسکرول هنگامِ اضافه‌شدنِ روز ─────────────────────────────
  // مستقل از جهت (RTL/LTR): جای یک پیلِ مرجع قبل از تغییر ثبت می‌شود و بعد
  // از چیدمان هر جابه‌جایی‌اش با scrollLeft خنثی می‌شود.
  const anchor = useRef<{ iso: string; left: number } | null>(null);
  const extending = useRef(false);

  const captureAnchor = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const er = el.getBoundingClientRect();
    const pills = el.querySelectorAll<HTMLElement>("[data-iso]");
    for (const p of Array.from(pills)) {
      const r = p.getBoundingClientRect();
      if (r.right > er.left && r.left < er.right) {
        anchor.current = { iso: p.dataset.iso!, left: r.left };
        return;
      }
    }
  }, []);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    const a = anchor.current;
    anchor.current = null;
    extending.current = false;
    if (!el || !a) return;
    const p = el.querySelector<HTMLElement>(`[data-iso="${a.iso}"]`);
    if (!p) return;
    const delta = p.getBoundingClientRect().left - a.left;
    if (Math.abs(delta) >= 0.5) el.scrollLeft += delta;
  }, [start, end]);

  const checkEdges = useCallback(() => {
    const el = scrollRef.current;
    if (!el || extending.current) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 0) return;
    // مدلِ استاندارد: در RTL scrollLeft از ۰ تا -max است؛ قدرِ مطلق = فاصله از ابتدا.
    const pos = Math.abs(el.scrollLeft);
    const threshold = Math.max(200, el.clientWidth * 0.75);
    const nearStart = pos < threshold;
    const nearEnd = max - pos < threshold;
    if (!nearStart && !nearEnd) return;
    extending.current = true;
    captureAnchor();
    setBounds((b) => ({
      start: nearStart ? Math.min(b.start, start) - CHUNK : Math.min(b.start, start),
      end: nearEnd ? Math.max(b.end, end) + CHUNK : Math.max(b.end, end),
    }));
  }, [captureAnchor, start, end]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkEdges, { passive: true });
    // بعد از هر بار اضافه‌شدن (و بارِ اول) هم یک بار چک شود، نه فقط حینِ اسکرول.
    const t = requestAnimationFrame(checkEdges);
    return () => {
      cancelAnimationFrame(t);
      el.removeEventListener("scroll", checkEdges);
    };
  }, [checkEdges]);

  // ── وسط‌چین‌کردنِ روزِ فعال ───────────────────────────────────────────
  // فقط scrollLeftِ خودِ نوار (نه scrollIntoView که صفحه را هم تکان می‌دهد).
  const mounted = useRef(false);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const pill = el.querySelector<HTMLElement>(`[data-iso="${activeIso}"]`);
    if (!pill) return;
    const er = el.getBoundingClientRect();
    const pr = pill.getBoundingClientRect();
    const delta = pr.left + pr.width / 2 - (er.left + er.width / 2);
    if (!mounted.current || Math.abs(delta) > el.clientWidth * 2) {
      // بارِ اول (و پرشِ دور از «تاریخچه») بی‌انیمیشن
      mounted.current = true;
      el.scrollLeft += delta;
    } else if (Math.abs(delta) >= 1) {
      el.scrollBy({ left: delta, behavior: "smooth" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIso]);

  const desktop = useDesktopDayStrip();
  // فقط موبایل/تبلتِ لمسی کشیدنِ آزادِ ماوس داره؛ دسکتاپ فقط با فلش پیج می‌شه.
  useDragScroll(scrollRef, !desktop);

  /** پیج‌کردنِ نوار یک صفحه به قبل/بعد — دقیقاً همون رفتارِ قدیمیِ فلش‌های
   * دسکتاپ، رویِ همون نوارِ پیوسته‌ی تنبل‌بارشونده (لبه‌ها هنگامِ پیج هم
   * طبقِ همون checkEdges بالا خودکار گسترش پیدا می‌کنن). */
  const pageBy = useCallback((dir: "prev" | "next") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = (el.clientWidth || 300) * 0.92;
    el.scrollBy({ left: dir === "prev" ? amount : -amount, behavior: "smooth" });
  }, []);

  return { scrollRef, days, todayIso: isoLocal(today), pageBy, desktop };
}

/**
 * کشیدنِ افقی با ماوس، همان تکنیکِ MentorCarousel (لمس همان اسکرولِ بومیِ
 * مرورگر با شتابِ خودش است) — به‌علاوه‌ی شتابِ رهاسازی برای ماوس. اگر
 * ماوس بیشتر از چند پیکسل جابه‌جا شد، کلیکِ بعدی (روی پیلِ روز) خنثی می‌شود.
 * جابه‌جایی نسبی است (نه startScroll - dx) تا اضافه‌شدنِ روز وسطِ کشیدن پرش نسازد.
 */
export function useDragScroll(ref: React.RefObject<HTMLElement>, enabled: boolean = true) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    let down = false;
    let moved = false;
    let startX = 0;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0; // px/ms
    let raf = 0;

    const stopMomentum = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
    const onDown = (e: PointerEvent) => {
      stopMomentum();
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      down = true;
      moved = false;
      startX = lastX = e.clientX;
      lastT = performance.now();
      velocity = 0;
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      if (!moved && Math.abs(e.clientX - startX) > 5) {
        moved = true;
        el.classList.add("is-dragging");
      }
      if (!moved) return;
      const now = performance.now();
      const dx = e.clientX - lastX;
      const dt = Math.max(1, now - lastT);
      velocity = 0.8 * (dx / dt) + 0.2 * velocity;
      el.scrollLeft -= dx;
      lastX = e.clientX;
      lastT = now;
    };
    const onUp = () => {
      if (!down) return;
      down = false;
      el.classList.remove("is-dragging");
      if (!moved || performance.now() - lastT > 80) return;
      let v = velocity * 16; // px/frame
      let prev = performance.now();
      const step = (t: number) => {
        const f = Math.min(3, (t - prev) / 16);
        prev = t;
        el.scrollLeft -= v * f;
        v *= Math.pow(0.95, f);
        raf = Math.abs(v) > 0.3 ? requestAnimationFrame(step) : 0;
      };
      if (Math.abs(v) > 1) raf = requestAnimationFrame(step);
    };
    const onClick = (e: MouseEvent) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    };
    const onWheelOrTouch = () => stopMomentum();

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    el.addEventListener("click", onClick, true);
    el.addEventListener("wheel", onWheelOrTouch, { passive: true });
    el.addEventListener("touchstart", onWheelOrTouch, { passive: true });
    return () => {
      stopMomentum();
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("click", onClick, true);
      el.removeEventListener("wheel", onWheelOrTouch);
      el.removeEventListener("touchstart", onWheelOrTouch);
    };
  }, [ref, enabled]);
}
