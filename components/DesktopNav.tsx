"use client";

// منوی افقی هدر برای دسکتاپ/تبلت (>= 1024px، هر دو زبان؛ rtl آینه‌ی ltr).
// همه‌ی لینک‌ها از همون منبع واحد navLinks.ts میان (فلگ
// ویژگی‌ها، قفل ماژول)، پس دقیقا هم‌خوان با کشوی همبرگری‌اند. فقط CSS (بدون
// framer-motion): نشانگر فعال با transform می‌لغزه، پنل‌های کشویی فقط با اولین
// هاور/فوکوس/کلیک ساخته می‌شن. زیر 1024px کل این بخش با CSS مخفیه.
import { useCallback, useEffect, useRef, useState } from "react";
import { SmartLink as Link } from "./SmartLink";
import { ChevronDown, Lock } from "lucide-react";
import { featureVisible, type FeatureKey } from "@/lib/featureFlags";
import { tr } from "@/lib/i18n";
import { getVisibleLinks, isGroup, isLockedModule, visibleChildren, type NavLink } from "./navLinks";

type Entry = { id: string; label: string; href?: string; module?: string; children?: NavLink[] };
type Features = Partial<Record<FeatureKey, boolean>> | null;

const baseOf = (h: string) => h.split("?")[0];
// در rtl فلش راست = آیتم قبلی (جهت دیداری)
const rtlSign = (): 1 | -1 => (document.documentElement.dir === "rtl" ? -1 : 1);

function buildEntries(features: Features): Entry[] {
  const links = getVisibleLinks(features);
  const byHref = (href: string) => links.find((l) => !isGroup(l) && l.href === href) as NavLink | undefined;
  const groupBy = (icon: string) => links.find((l) => isGroup(l) && l.icon === icon);
  const out: Entry[] = [];

  const link = (id: string, l: NavLink | undefined) => {
    if (l) out.push({ id, label: l.label, href: l.href, module: l.module });
  };
  const group = (id: string, icon: string) => {
    const g = groupBy(icon);
    if (!g || !isGroup(g)) return;
    const kids = visibleChildren(g, features);
    if (kids.length === 0) return;
    // یک زیرمجموعه‌ی باقی‌مانده = لینک ساده (منوی تک‌گزینه‌ای بی‌معنیه)
    if (kids.length === 1) out.push({ id, label: g.label, href: kids[0].href, module: kids[0].module });
    else out.push({ id, label: g.label, children: kids });
  };

  link("dashboard", byHref("/dashboard"));
  group("routine", "weekly");
  group("workout", "exercise");
  link("trade", byHref("/trade"));
  link("roadmaps", byHref("/roadmaps"));
  group("mentors", "mentors");
  link("blog", byHref("/blog"));
  const more = ["/analysis/weekly", "/about"].map(byHref).filter(Boolean) as NavLink[];
  if (more.length) out.push({ id: "more", label: tr("بیشتر", "More"), children: more });
  return out;
}

type Props = {
  pathname: string;
  features: Features;
  activeModules: Set<string> | null;
};

export default function DesktopNav({ pathname, features, activeModules }: Props) {
  const entries = buildEntries(features);
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

  const isActive = (e: Entry) => {
    const hrefs = e.href ? [e.href] : (e.children ?? []).map((c) => c.href);
    return hrefs.some((h) => {
      const b = baseOf(h);
      return pathname === b || pathname.startsWith(b + "/");
    });
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

  // نشانگر فعال: transform-only (translate + scaleX روی یک عنصر 1px)
  const measure = useCallback(() => {
    const list = listRef.current, ind = indRef.current;
    if (!list || !ind) return;
    const el = list.querySelector<HTMLElement>('[data-active="true"] > .dnav-link');
    if (!el || el.offsetWidth === 0) { ind.style.opacity = "0"; return; }
    const inset = 12;
    ind.style.transform = `translate3d(${el.parentElement!.offsetLeft + inset}px,0,0) scaleX(${Math.max(1, el.offsetWidth - inset * 2)})`;
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
      <ul ref={listRef} className="dnav-list">
        {entries.map((e) => {
          const active = isActive(e);
          const open = openId === e.id;
          const exact = !!e.href && pathname === baseOf(e.href);
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
                    const here = (pathname === b || pathname.startsWith(b + "/")) && e.children!.filter((x) => baseOf(x.href) === b).length === 1;
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
