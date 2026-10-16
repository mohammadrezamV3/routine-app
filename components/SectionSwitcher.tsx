"use client";

// پنجره‌ی جابه‌جایی بین بخش‌های آریون (روتین / ترید / ورزش) که با زدن لوگوی هدر باز می‌شه.
// فقط با اولین کلیک روی لوگو لود می‌شه (NavDrawer، dynamic) و به بادی پورتال می‌شه — چون
// .app-topbar خودش backdrop-filter داره و شیشه‌ی داخلش بلور واقعی نمی‌گرفت.
// ناوبری: وقتی زیردامنه‌ها روشنن بین بخش‌ها ناوبری *کامل* (لینک واقعی به origin بخش)،
// وگرنه ناوبری کلاینتی به صفحه‌ی اصلی همون بخش. قرارداد: lib/sections.ts
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SmartLink as Link } from "./SmartLink";
import { tr } from "@/lib/i18n";
import { SECTION_META, isSectionHostingEnabled, sectionUrl, type SectionKey } from "@/lib/sections";
import { SECTION_WORDMARK_DARK, SECTION_WORDMARK_LIGHT, warmSectionAssets } from "@/lib/sectionAssets";
import "./section-switcher.css";

type Props = {
  state: "open" | "closed";
  anchorRef: React.RefObject<HTMLElement>;
  section: SectionKey | null;
  signedIn: boolean;
  onClose: () => void;
};

// وقتی زیردامنه‌ها خاموشن (یک دامنه) هر بخش به صفحه‌ی اصلی خودش می‌ره
const FALLBACK_HOME: Record<SectionKey, string> = { routine: "/weekly", trade: "/trade", workout: "/exercise" };

// ترتیب طرح رسمی: ترید، ورزش، روتین
const ORDER: readonly SectionKey[] = ["trade", "workout", "routine"];

const PANEL_MAX = 232;
const EDGE = 12;
const GAP = 6;

type Pos = { top: number; left: number; width: number; originX: number };

// پنجره درست زیر نشان هدر باز می‌شه: لبه‌ی چپ پنجره = لبه‌ی چپ نشان (لوگو همیشه چپ به راسته)
function measure(anchor: HTMLElement | null): Pos {
  const vw = typeof window === "undefined" ? 360 : window.innerWidth;
  const width = Math.min(PANEL_MAX, vw - EDGE * 2);
  const r = anchor?.getBoundingClientRect();
  if (!r) return { top: 60, left: EDGE, width, originX: 18 };
  const left = Math.max(EDGE, Math.min(r.left, vw - width - EDGE));
  // مبدا انیمیشن: وسط نشان (نسبت به پنل)، تا پنل از خود نشان باز بشه
  const originX = Math.max(12, Math.min(width - 12, r.left + Math.min(r.width, 34) / 2 - left));
  return { top: r.bottom + GAP, left, width, originX };
}

export default function SectionSwitcher({ state, anchorRef, section, signedIn, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Pos>(() => measure(anchorRef.current));
  const hosting = isSectionHostingEnabled();
  const origin = typeof window === "undefined" ? undefined : window.location.origin;
  const home = signedIn ? "/dashboard" : "/";
  const open = state === "open";

  useLayoutEffect(() => { setPos(measure(anchorRef.current)); }, [anchorRef]);
  useEffect(() => { warmSectionAssets(); }, []);
  useEffect(() => {
    const on = () => setPos(measure(anchorRef.current));
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, [anchorRef]);

  const restoreFocus = useCallback(() => { anchorRef.current?.focus({ preventScroll: true }); }, [anchorRef]);

  // فوکوس میره داخل پنل: ردیف بخش جاری، وگرنه اولین ردیف
  useEffect(() => {
    if (!open) return;
    const items = panelRef.current?.querySelectorAll<HTMLElement>("[data-ssw-item]");
    if (!items?.length) return;
    const cur = Array.from(items).find((el) => el.getAttribute("aria-checked") === "true") ?? items[0];
    const raf = requestAnimationFrame(() => cur.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Escape و کلیک بیرون
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); restoreFocus(); onClose(); }
    }
    function onDown(e: PointerEvent) {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, onClose, restoreFocus, anchorRef]);

  function onPanelKeyDown(e: React.KeyboardEvent) {
    const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>("[data-ssw-item]") ?? []);
    if (!items.length) return;
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    else if (e.key === "Home") { e.preventDefault(); items[0].focus(); }
    else if (e.key === "End") { e.preventDefault(); items[items.length - 1].focus(); }
    else if (e.key === "Tab") { e.preventDefault(); restoreFocus(); onClose(); }
  }

  function rowProps(key: SectionKey) {
    const current = section === key;
    // بخش جاری یا وقتی زیردامنه‌ها خاموشن: ناوبری کلاینتی؛ بین بخش‌ها: لینک واقعی (بارگذاری کامل)
    if (current) return { client: true as const, href: home };
    if (hosting) return { client: false as const, href: sectionUrl(key, home, origin) };
    return { client: true as const, href: FALLBACK_HOME[key] };
  }

  const common = { "data-ssw-item": "", tabIndex: -1, onClick: onClose } as const;

  return createPortal(
    <div
      ref={panelRef}
      className="ssw-panel"
      role="menu"
      aria-label={tr("انتخاب بخش", "Choose a section")}
      data-state={state}
      data-popup-exit="self"
      onKeyDown={onPanelKeyDown}
      style={{
        top: pos.top,
        left: pos.left,
        width: pos.width,
        ["--ssw-origin" as string]: `${pos.originX}px 0`,
        // رنگ هر بخش برای هاله‌ی پس‌زمینه‌ی شیشه
        ["--ssw-routine" as string]: SECTION_META.routine.colors.mid,
        ["--ssw-trade" as string]: SECTION_META.trade.colors.mid,
        ["--ssw-workout" as string]: SECTION_META.workout.colors.mid,
      }}
    >
      <div className="ssw-list">
        {ORDER.map((key, i) => {
          const meta = SECTION_META[key];
          const current = section === key;
          const rp = rowProps(key);
          const inner = (
            <>
              {/* <img> ساده و eager (نه next/image): بدون بهینه‌ساز و بدون lazy، همون URLی که warmSectionAssets
                  از قبل گرفته؛ پس اولین باز شدن هر سه ردیف رو هم‌زمان با تصویر رنگ می‌کنه */}
              <img src={meta.icon} alt="" width={256} height={217} loading="eager" decoding="sync" draggable={false} className="ssw-icon" />
              <span className="ssw-wm" aria-hidden="true">
                <img src={SECTION_WORDMARK_DARK} alt="" width={358} height={49} loading="eager" decoding="sync" draggable={false} className="ssw-wm-dark" />
                <img src={SECTION_WORDMARK_LIGHT} alt="" width={328} height={46} loading="eager" decoding="sync" draggable={false} className="ssw-wm-light" />
              </span>
              <span className="ssw-sep" aria-hidden="true" />
              <span className="ssw-word" aria-hidden="true">{meta.wordmark}</span>
            </>
          );
          const cls = `ssw-row${current ? " is-current" : ""}`;
          const style = {
            ["--i" as string]: i,
            ["--sec-from" as string]: meta.colors.from,
            ["--sec-mid" as string]: meta.colors.mid,
            ["--sec-to" as string]: meta.colors.to,
          } as React.CSSProperties;
          const aria = {
            role: "menuitemradio",
            "aria-label": `Arion ${meta.label}`,
            "aria-checked": current,
            "aria-current": current ? ("true" as const) : undefined,
          };
          return rp.client ? (
            <Link key={key} href={rp.href} className={cls} style={style} {...aria} {...common}>{inner}</Link>
          ) : (
            <a key={key} href={rp.href} className={cls} style={style} {...aria} {...common}>{inner}</a>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}
