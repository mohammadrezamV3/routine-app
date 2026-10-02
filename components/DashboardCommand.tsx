"use client";

// پالت فرمان (⌘K / Ctrl+K / «/») — دسترسی سریع به همه‌ی صفحه‌ها و کارها از
// داشبورد، بدون گشتن در منو. فقط ناوبری است (هیچ نوشتنی مستقیم انجام
// نمی‌ده)، پس هیچ گیت امنیتی‌ای رو دور نمی‌زنه: مقصدها خودشون ModuleGate/
// FeatureGate و روت‌های API گیت‌شده دارن. آیتم‌های پولی بی‌دسترسی فقط قفل
// نشون داده می‌شن؛ آیتم‌های فلگ خاموش اصلا نمیان (هم‌رفتار با NavDrawer).

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { normalizeFa } from "@/lib/utils";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { featureVisible, type FeatureKey } from "@/lib/featureFlags";
import { DashIcon, type DashIconName } from "./DashboardIcons";
import { D_EASE } from "./DashboardKit";
import { useDashAction, type DashAction } from "./DashboardActions";

export type CommandItem = {
  id: string;
  label: string;
  hint?: string;
  href: string;
  icon: DashIconName;
  group: "کار سریع" | "صفحه‌ها" | "ترید" | "حساب";
  keywords?: string;
  module?: string;
  feature?: FeatureKey;
  adminOnly?: boolean;
  /** داخل داشبورد به‌جای ناوبری، پاپ‌آپ همون بخش همین‌جا باز می‌شه */
  action?: DashAction;
};

export const COMMANDS: CommandItem[] = [
  // کارهای سریع — مستقیم به فرم/تب مربوط
  { id: "a-program", group: "کار سریع", label: "افزودن برنامه به روتین", hint: "روتین", href: "/weekly?add=1", icon: "plus", keywords: "برنامه جدید تسک کار add", action: "program", feature: "routine" },
  { id: "a-workout", group: "کار سریع", label: "شروع تمرین امروز", hint: "بدنسازی", href: "/exercise?tab=exercise", icon: "dumbbell", keywords: "ورزش باشگاه workout gym", module: "EXERCISE", feature: "exercise" },
  { id: "a-food", group: "کار سریع", label: "ثبت غذا", hint: "کالری‌شمار", href: "/exercise?tab=calorie", icon: "apple", keywords: "کالری غذا وعده food", module: "CALORIE", action: "food", feature: "calorie" },
  { id: "a-trade", group: "کار سریع", label: "ثبت معامله", hint: "ژورنال", href: "/trade/journal", icon: "journal", keywords: "ترید معامله پوزیشن trade", module: "TRADE", action: "trade", feature: "tradeJournal" },
  { id: "a-roadmap", group: "کار سریع", label: "ساخت رودمپ یادگیری با AI", hint: "رودمپ", href: "/roadmaps/new", icon: "spark", keywords: "یادگیری هوش مصنوعی roadmap", feature: "roadmaps" },

  { id: "p-weekly", group: "صفحه‌ها", label: "روتین و برنامه‌ی هفتگی", href: "/weekly", icon: "routine", keywords: "روتین هفتگی تقویم weekly", feature: "routine" },
  { id: "p-streak", group: "صفحه‌ها", label: "استریک و اچیومنت‌ها", href: "/streak", icon: "flame", keywords: "استریک اچیومنت نشان رکورد streak achievement طلایی", feature: "streak" },
  { id: "p-friends", group: "صفحه‌ها", label: "دوستان و رتبه‌بندی", href: "/friends", icon: "friends", keywords: "دوست رفیق رتبه رقابت friends leaderboard", feature: "friends" },
  { id: "p-sleep", group: "صفحه‌ها", label: "خواب", href: "/sleep", icon: "moon", keywords: "خواب بیداری sleep شب", feature: "sleep" },
  { id: "p-exercise", group: "صفحه‌ها", label: "برنامه‌ی تمرینی", href: "/exercise?tab=exercise", icon: "dumbbell", keywords: "بدنسازی ورزش", module: "EXERCISE", feature: "exercise" },
  { id: "p-calorie", group: "صفحه‌ها", label: "کالری‌شمار", href: "/exercise?tab=calorie", icon: "apple", keywords: "رژیم تغذیه ماکرو", module: "CALORIE", feature: "calorie" },
  { id: "p-roadmaps", group: "صفحه‌ها", label: "رودمپ‌ها", href: "/roadmaps", icon: "roadmap", keywords: "یادگیری مسیر", feature: "roadmaps" },
  { id: "p-mentors", group: "صفحه‌ها", label: "پیدا کردن مربی", href: "/mentors", icon: "mentors", keywords: "منتور مربی استاد", feature: "mentors" },
  { id: "p-mentorship", group: "صفحه‌ها", label: "مربی‌های من", href: "/mentorship", icon: "chat", keywords: "منتور گفتگو پیام", feature: "mentors" },
  { id: "p-analysis", group: "صفحه‌ها", label: "آنالیز هفتگی", href: "/analysis/weekly", icon: "analysis", keywords: "گزارش تحلیل هوش مصنوعی", module: "AI_INSIGHT", feature: "weeklyAnalysis" },

  { id: "t-hub", group: "ترید", label: "هاب ترید", href: "/trade", icon: "candles", keywords: "ترید فارکس", module: "TRADE", feature: "trade" },
  { id: "t-chart", group: "ترید", label: "چارت", href: "/trade/chart", icon: "chart", keywords: "تریدینگ ویو نمودار", module: "TRADE", feature: "tradeChart" },
  { id: "t-journal", group: "ترید", label: "حساب‌های معاملاتی", href: "/trade/journal", icon: "journal", keywords: "ژورنال حساب", module: "TRADE", feature: "tradeJournal" },
  { id: "t-check", group: "ترید", label: "چک‌لیست‌ها", href: "/trade/checklists", icon: "checklist", keywords: "چک لیست شرط ورود", module: "TRADE", feature: "tradeChecklists" },
  { id: "t-cal", group: "ترید", label: "تقویم اقتصادی", href: "/trade/calendar", icon: "calendarBolt", keywords: "اخبار خبر رویداد news", module: "TRADE", feature: "economicCalendar" },
  { id: "t-clock", group: "ترید", label: "ساعت فارکس", href: "/trade/clock", icon: "globeClock", keywords: "سشن جلسه لندن نیویورک", module: "TRADE", feature: "forexClock" },
  { id: "t-notes", group: "ترید", label: "یادداشت‌های ترید", href: "/trade/notes", icon: "notes", keywords: "نوت تحلیل", module: "TRADE", feature: "tradeNotes" },
  { id: "t-mt", group: "ترید", label: "اتصال متاتریدر", href: "/trade/metatrader", icon: "link", keywords: "متاتریدر mt4 mt5 اکسپرت", module: "TRADE", feature: "metatrader" },

  { id: "c-account", group: "حساب", label: "پنل کاربری", href: "/account", icon: "user", keywords: "پروفایل تنظیمات حساب" },
  { id: "c-sub", group: "حساب", label: "اشتراک و پلن‌ها", href: "/subscription", icon: "card", keywords: "خرید پلن اشتراک پرداخت" },
  { id: "c-notif", group: "حساب", label: "تنظیمات اعلان‌ها", href: "/account/notifications", icon: "bell", keywords: "نوتیفیکیشن یادآوری", feature: "notifications" },
  { id: "c-admin", group: "حساب", label: "پنل ادمین", href: "/admin", icon: "shield", keywords: "مدیریت ادمین admin", adminOnly: true },
];

export function DashboardCommand({
  open,
  onClose,
  features,
  modules,
  isAdmin,
}: {
  open: boolean;
  onClose: () => void;
  features: Partial<Record<FeatureKey, boolean>> | null;
  modules: Set<string> | null;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const run = useDashAction();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useLockBodyScroll(open);

  const visible = useMemo(
    () => COMMANDS.filter((c) => (!c.feature || featureVisible(features, c.feature)) && (!c.adminOnly || isAdmin)),
    [features, isAdmin]
  );
  const results = useMemo(() => {
    const nq = normalizeFa(q);
    if (!nq) return visible;
    const terms = nq.split(/\s+/);
    return visible
      .map((c) => {
        const hay = normalizeFa(`${c.label} ${c.hint ?? ""} ${c.keywords ?? ""}`);
        const label = normalizeFa(c.label);
        if (!terms.every((t) => hay.includes(t))) return null;
        const score = (label.startsWith(terms[0]) ? 0 : 1) + (label.includes(nq) ? 0 : 1);
        return { c, score };
      })
      .filter(Boolean)
      .sort((a, b) => a!.score - b!.score)
      .map((x) => x!.c);
  }, [q, visible]);

  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => {
    if (!open) return;
    setQ("");
    // فوکوس بعد از فریم اول تا انیمیشن ورود نپره
    const t = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [open]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function go(c: CommandItem) {
    onClose();
    // «ثبت»ها پاپ‌آپ خود همون بخش رو همین‌جا باز می‌کنن (DashboardActions)؛
    // آیتم قفل (ماژول پولی بی‌دسترسی) لینک می‌مونه تا مقصد گیت رو نشون بده.
    const locked = !!c.module && modules !== null && !modules.has(c.module);
    if (c.action && run && !locked) { run(c.action); return; }
    router.push(c.href);
  }
  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(results.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); const c = results[active]; if (c) go(c); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  }

  if (typeof document === "undefined") return null;
  let lastGroup = "";
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="db-cmd-root dash-scope"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
          dir="rtl"
        >
          <motion.div
            className="db-cmd"
            role="dialog"
            aria-modal="true"
            aria-label="دسترسی سریع"
            initial={{ opacity: 0, y: -14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.26, ease: D_EASE }}
            onKeyDown={onKey}
          >
            <div className="db-cmd-search">
              <DashIcon name="command" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="کجا بریم؟ اسم صفحه یا کار رو بنویس…"
                aria-label="جست‌وجو"
                aria-controls="db-cmd-list"
                aria-activedescendant={results[active] ? `db-cmd-${results[active].id}` : undefined}
                autoComplete="off"
                spellCheck={false}
              />
              <kbd className="db-kbd">Esc</kbd>
            </div>
            <div className="db-cmd-list thin-scroll" id="db-cmd-list" role="listbox" ref={listRef}>
              {results.length === 0 && <p className="db-cmd-empty">چیزی پیدا نشد</p>}
              {results.map((c, i) => {
                const head = c.group !== lastGroup ? c.group : null;
                lastGroup = c.group;
                const locked = !!c.module && modules !== null && !modules.has(c.module);
                return (
                  <div key={c.id}>
                    {head && <div className="db-cmd-group">{head}</div>}
                    <button
                      type="button"
                      id={`db-cmd-${c.id}`}
                      data-idx={i}
                      role="option"
                      aria-selected={i === active}
                      className={`db-cmd-item${i === active ? " is-active" : ""}`}
                      onMouseMove={() => { if (active !== i) setActive(i); }}
                      onClick={() => go(c)}
                    >
                      <span className="db-cmd-icon"><DashIcon name={c.icon} /></span>
                      <span className="db-cmd-label">{c.label}</span>
                      {locked && <span className="db-cmd-lock" title="نیاز به اشتراک"><DashIcon name="lock" /></span>}
                      {c.hint && <span className="db-cmd-hint">{c.hint}</span>}
                      <span className="db-cmd-enter" aria-hidden="true">↵</span>
                    </button>
                  </div>
                );
              })}
            </div>
            <footer className="db-cmd-foot">
              <span><kbd className="db-kbd">↑</kbd><kbd className="db-kbd">↓</kbd> جابه‌جایی</span>
              <span><kbd className="db-kbd">↵</kbd> باز کردن</span>
              <span><kbd className="db-kbd">Ctrl</kbd><kbd className="db-kbd">K</kbd> باز/بسته</span>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/** میان‌بر کیبورد: Ctrl/⌘+K همه‌جا، «/» وقتی داخل فیلد تایپ نمی‌کنی */
export function useCommandHotkey(setOpen: (fn: (v: boolean) => boolean) => void) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K" || e.code === "KeyK")) {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setOpen(() => true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);
}
