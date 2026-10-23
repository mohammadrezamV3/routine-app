"use client";

// منوی افقی هدر برای دسکتاپ/تبلت (>= 1024px، هر دو زبان؛ rtl آینه‌ی ltr).
// همه‌ی لینک‌ها از همون منبع واحد navLinks.ts میان (فلگ
// ویژگی‌ها، قفل ماژول، فیلتر بخش)، پس دقیقا هم‌خوان با کشوی همبرگری‌اند. فقط CSS (بدون
// framer-motion): نشانگر فعال با transform می‌لغزه، پنل‌های کشویی فقط با اولین
// هاور/فوکوس/کلیک ساخته می‌شن. زیر 1024px کل این بخش با CSS مخفیه.
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SmartLink as Link } from "./SmartLink";
import { ChevronDown, Lock } from "lucide-react";
import { featureVisible, type FeatureKey } from "@/lib/featureFlags";
import { tr } from "@/lib/i18n";
import type { SectionKey } from "@/lib/sections";
import { useSection } from "./SectionProvider";
import { getVisibleLinks, isGroup, isLockedModule, visibleChildren, type NavLink } from "./navLinks";

type Entry = { id: string; label: string; href?: string; module?: string; children?: NavLink[] };
type Features = Partial<Record<FeatureKey, boolean>> | null;

const baseOf = (h: string) => h.split("?")[0];
const tabOf = (h: string) => new URLSearchParams(h.split("?")[1] ?? "").get("tab");

// ?tab= فعلی فقط برای بخش ورزش لازمه (زیرمنوهای «بدنسازی» همون صفحه‌ی /dashboard رو با تب
// متفاوت باز می‌کنن). useSearchParams بیرون از Suspense صفحه‌های استاتیک رو CSR می‌کنه، پس
// توی یک پروب کوچک و بی‌خروجی جداست و مقدار رو به state منو می‌ده.
function TabProbe({ onTab }: { onTab: (t: string | null) => void }) {
  const t = useSearchParams().get("tab");
  useEffect(() => { onTab(t); }, [t, onTab]);
  return null;
}
// در rtl فلش راست = آیتم قبلی (جهت دیداری)
const rtlSign = (): 1 | -1 => (document.documentElement.dir === "rtl" ? -1 : 1);

// منوی دسکتاپ دقیقا همون ساختار navLinks.ts رو نشون می‌ده: لینک‌های بالاسطحی و
// دو گروه («مربی‌ها»، «بیشتر»). گروهی که یک زیرمجموعه‌ی دیدنی داشته باشه لینک ساده می‌شه.
function buildEntries(features: Features, section: SectionKey | null): Entry[] {
  const out: Entry[] = [];
  for (const item of getVisibleLinks(features, section)) {
    if (!isGroup(item)) {
      out.push({ id: item.href, label: item.label, href: item.href, module: item.module });
      continue;
    }
    const kids = visibleChildren(item, features);
    if (kids.length === 0) continue;
    if (kids.length === 1) out.push({ id: item.icon, label: item.label, href: kids[0].href, module: kids[0].module });
    else out.push({ id: item.icon, label: item.label, children: kids });
  }
  return out;
}

type Props = {
  pathname: string;
  features: Features;
  activeModules: Set<string> | null;
};

export default function DesktopNav({ pathname, features, activeModules }: Props) {
  const section = useSection();
  const entries = buildEntries(features, section);
  const [openId, setOpenId] = useState<string | null>(null);
  // پنل هر منو فقط بعد از اولین هاور/فوکوس/کلیک ساخته می‌شه
  const [armed, setArmed] = useState<Record<string, true>>({});
  const navRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const indRef = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openedBy = useRef<"hover" | "click" | "key">("hover");
  const focusFirst = useRef(false);
  const skipFocusOpen = useRef(false);

  const [tab, setTab] = useState<string | null>(null);
  // بخش ورزش: «داشبورد» (بدون tab) و «بدنسازی» (tab=exercise|calorie) هر دو /dashboard‌ان؛
  // فقط یکی‌شون فعال نشون داده می‌شه
  const workoutDash = section === "workout";
  const hrefActive = (h: string) => {
    const b = baseOf(h);
    if (!(pathname === b || pathname.startsWith(b + "/"))) return false;
    if (workoutDash && b === "/dashboard") {
      const t = tabOf(h);
      return t ? tab === t : tab === null;
    }
    return true;
  };
  const isActive = (e: Entry) => {
    const hrefs = e.href ? [e.href] : (e.children ?? []).map((c) => c.href);
    return hrefs.some(hrefActive);
  };

  const clearTimer = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  const arm = useCallback((id: string) => setArmed((a) => (a[id] ? a : { ...a, [id]: true })), []);
  const openNow = useCallback((id: string, by: "hover" | "click" | "key") => {
    clearTimer();
    arm(id);
    openedBy.current = by;
    setOpenId(id);
  }, [arm]);
  const schedule = useCallback((id: string | null, delay: number) => {
    clearTimer();
    timer.current = setTimeout(() => {
      if (id) { arm(id); openedBy.current = "hover"; }
      setOpenId(id);
    }, delay);
  }, [arm]);

  // مسیر عوض شد = منو بسته
  useEffect(() => { setOpenId(null); }, [pathname]);
  useEffect(() => clearTimer, []);

  // کلیک/لمس بیرون منو
  useEffect(() => {
    if (!openId) return;
    function onDown(e: PointerEvent) {
      if (!navRef.current?.contains(e.target as Node)) setOpenId(null);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [openId]);

  // فوکوس روی اولین آیتم بعد از باز شدن با کیبورد
  useEffect(() => {
    if (!openId || !focusFirst.current) return;
    focusFirst.current = false;
    const raf = requestAnimationFrame(() => {
      navRef.current?.querySelector<HTMLElement>(`[data-menu="${openId}"] [role="menuitem"]`)?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [openId, armed]);

  // نشانگر فعال: transform-only (translate + scaleX روی یک عنصر 1px). همیشه زیر خود
  // «لیبل» آیتم فعاله (نه کل دکمه): برای لینک ساده، منوی کشویی و آیتم قفل/شورون‌دار
  // یک منطق و یک عرض؛ فاصله‌ی عمودی از لیبل در CSS ثابته (site-header.css).
  const measure = useCallback(() => {
    const nav = navRef.current, list = listRef.current, ind = indRef.current;
    if (!nav || !list || !ind) return;
    const label = list.querySelector<HTMLElement>('[data-active="true"] > .dnav-link > span:first-child');
    const lr = label?.getBoundingClientRect();
    if (!label || !lr || lr.width === 0) { ind.style.opacity = "0"; return; }
    const nr = nav.getBoundingClientRect();
    ind.style.transform = `translate3d(${lr.left - nr.left}px,0,0) scaleX(${lr.width})`;
    ind.style.opacity = "1";
    requestAnimationFrame(() => ind.classList.add("is-ready"));
  }, []);
  const activeKey = entries.map((e) => (isActive(e) ? e.id : "")).join("|");
  useEffect(() => { measure(); }, [measure, activeKey, entries.length]);
  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    list.querySelectorAll("li").forEach((li) => ro.observe(li));
    // لود فونت عرض لیبل‌ها رو عوض می‌کنه
    (document as any).fonts?.ready?.then(measure);
    return () => ro.disconnect();
  }, [measure, entries.length]);

  function moveTop(from: HTMLElement, dir: number) {
    const all = Array.from(navRef.current?.querySelectorAll<HTMLElement>(".dnav-list > li > .dnav-link") ?? []);
    const i = all.indexOf(from);
    if (i < 0) return;
    all[(i + dir + all.length) % all.length]?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent, entry: Entry) {
    const t = e.target as HTMLElement;
    const inMenu = !!t.closest('[role="menu"]');
    const trigger = () => navRef.current?.querySelector<HTMLElement>(`[data-trigger="${entry.id}"]`);
    if (e.key === "Escape") {
      if (openId) { e.preventDefault(); setOpenId(null); if (inMenu) { skipFocusOpen.current = true; trigger()?.focus(); } }
      return;
    }
    if (inMenu) {
      const items = Array.from(navRef.current?.querySelectorAll<HTMLElement>(`[data-menu="${entry.id}"] [role="menuitem"]`) ?? []);
      const i = items.indexOf(t);
      if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
      else if (e.key === "Home") { e.preventDefault(); items[0]?.focus(); }
      else if (e.key === "End") { e.preventDefault(); items[items.length - 1]?.focus(); }
      else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault(); setOpenId(null);
        skipFocusOpen.current = true;
        const trg = trigger();
        if (trg) { trg.focus(); moveTop(trg, (e.key === "ArrowRight" ? 1 : -1) * rtlSign()); }
      }
      return;
    }
    if (e.key === "ArrowRight") { e.preventDefault(); moveTop(t, rtlSign()); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); moveTop(t, -rtlSign()); }
    else if (entry.children && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      focusFirst.current = true;
      openNow(entry.id, "key");
      // پنل از قبل ساخته شده بود: افکت فوکوس باید دوباره اجرا شه
      if (openId === entry.id) navRef.current?.querySelector<HTMLElement>(`[data-menu="${entry.id}"] [role="menuitem"]`)?.focus();
    }
  }

  return (
    <nav ref={navRef} className="dnav" aria-label={tr("منوی اصلی", "Primary")}>
      {workoutDash && <Suspense fallback={null}><TabProbe onTab={setTab} /></Suspense>}
      <ul ref={listRef} className="dnav-list">
        {entries.map((e) => {
          const active = isActive(e);
          const open = openId === e.id;
          const exact = !!e.href && pathname === baseOf(e.href) && hrefActive(e.href);
          const locked = e.children ? e.children.every((c) => isLockedModule(activeModules, c.module)) : isLockedModule(activeModules, e.module);
          return (
            <li
              key={e.id}
              className="dnav-item"
              data-active={active ? "true" : undefined}
              data-open={open ? "true" : undefined}
              onKeyDown={(ev) => onKeyDown(ev, e)}
              onPointerEnter={e.children ? (ev) => { if (ev.pointerType === "mouse") schedule(e.id, openId ? 0 : 90); } : (ev) => { if (ev.pointerType === "mouse" && openId) schedule(null, 120); }}
              onPointerLeave={e.children ? (ev) => { if (ev.pointerType === "mouse") schedule(null, 170); } : undefined}
              onFocus={e.children ? (ev) => {
                // فقط فوکوس کیبوردی؛ فوکوس ناشی از کلیک ماوس خودش با onClick مدیریت می‌شه
                if (skipFocusOpen.current) { skipFocusOpen.current = false; return; }
                if ((ev.target as HTMLElement).matches(":focus-visible") && !(ev.target as HTMLElement).closest('[role="menu"]')) openNow(e.id, "key");
              } : undefined}
              onBlur={e.children ? (ev) => {
                if (!ev.currentTarget.contains(ev.relatedTarget as Node | null)) setOpenId((cur) => (cur === e.id ? null : cur));
              } : undefined}
            >
              {e.children ? (
                <button
                  type="button"
                  className="dnav-link dnav-trigger"
                  data-trigger={e.id}
                  aria-haspopup="menu"
                  aria-expanded={open}
                  aria-controls={armed[e.id] ? `dnav-menu-${e.id}` : undefined}
                  onClick={() => {
                    if (open && openedBy.current === "click") setOpenId(null);
                    else openNow(e.id, "click");
                  }}
                >
                  <span>{e.label}</span>
                  {locked && <Lock size={12} className="nav-link-lock" aria-hidden="true" />}
                  <ChevronDown size={14} className="dnav-chev" aria-hidden="true" />
                </button>
              ) : (
                <Link href={e.href!} className="dnav-link" aria-current={exact ? "page" : undefined}>
                  <span>{e.label}</span>
                  {locked && <Lock size={12} className="nav-link-lock" aria-hidden="true" />}
                </Link>
              )}
              {e.children && armed[e.id] && (
                <div
                  id={`dnav-menu-${e.id}`}
                  data-menu={e.id}
                  role="menu"
                  aria-label={e.label}
                  className="notif-panel dnav-panel"
                  data-popup-exit="self"
                  data-open={open ? "true" : "false"}
                >
                  {e.children.map((c) => {
                    const b = baseOf(c.href);
                    const here = (pathname === b || pathname.startsWith(b + "/")) && (e.children!.filter((x) => baseOf(x.href) === b).length === 1 || (workoutDash && hrefActive(c.href)));
                    return (
                      <Link
                        key={c.href}
                        href={c.href}
                        role="menuitem"
                        tabIndex={-1}
                        aria-current={here ? "page" : undefined}
                        className="notif-panel-item dnav-menu-link"
                        onClick={() => setOpenId(null)}
                      >
                        <span>{c.label}</span>
                        {isLockedModule(activeModules, c.module) && <Lock size={12} className="nav-link-lock" aria-hidden="true" />}
                      </Link>
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <span ref={indRef} className="dnav-ind" aria-hidden="true" />
    </nav>
  );
}
