"use client";

// پاپ‌آپ و بنر/کارت گوشه‌ی اطلاعیه‌ها روی سایت (تنظیم از /admin/announcements).
// - هیچ‌چیز روی مسیر لود منتظر نمی‌مونه: درخواست بعد از اولین پینت در زمان
//   بیکاری مرورگر (requestIdleCallback) می‌ره.
// - مخاطب/زمان‌بندی/بسته‌شده‌های کاربر لاگین‌کرده سمت سرور فیلتر می‌شن؛ این‌جا
//   فقط صفحه (pathMatches)، بسته‌شده‌های مهمان (localStorage) و بسته‌شده‌های
//   همین بازدید.
// - حداکثر یک پاپ‌آپ در لحظه (صف با اولویت) و یک بنر در هر جایگاه؛ روی
//   موبایل گوشه‌ها و نوار پایین یک کارت پایین می‌شن (بالاترین اولویت).
// - هیچ‌وقت روی /admin و /auth.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  isAnnouncementFreePath,
  pathMatches,
  pickPlacements,
  type AnnouncementPosition,
  type DisplayAnnouncement,
} from "@/lib/announcements";
import { AnnouncementView } from "./AnnouncementView";

const GUEST_KEY = "annDismissed";
const SESSION_KEY = "annClosedSession";
const GUEST_KEEP = 200;
const MOBILE_QUERY = "(max-width: 640px)";

function readList(store: "local" | "session", key: string): string[] {
  try {
    const raw = (store === "local" ? window.localStorage : window.sessionStorage).getItem(key);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function addToList(store: "local" | "session", key: string, id: string, keep = GUEST_KEEP) {
  try {
    const list = readList(store, key);
    if (list.includes(id)) return;
    (store === "local" ? window.localStorage : window.sessionStorage).setItem(key, JSON.stringify([...list, id].slice(-keep)));
  } catch {
    // حالت خصوصی/ذخیره‌ی مسدود — فقط برای همین بازدید بسته می‌مونه
  }
}

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const on = () => setMobile(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return mobile;
}

const CORNER_OR_BOTTOM: AnnouncementPosition[] = ["BOTTOM", "TOP_RIGHT", "TOP_LEFT", "BOTTOM_RIGHT", "BOTTOM_LEFT"];

export function AnnouncementDelivery() {
  const pathname = usePathname() || "/";
  const { status } = useSession();
  const loggedIn = status === "authenticated";
  const [items, setItems] = useState<DisplayAnnouncement[] | null>(null);
  // بسته‌شده‌ها: snapshot لحظه‌ی لود (مهمان) + بسته‌شده در همین بازدید.
  // «یک بار» که همین حالا ثبت شد در snapshot نیست، پس تا بستن/خروج می‌مونه.
  const [closed, setClosed] = useState<Set<string>>(() => new Set());
  const seenRecorded = useRef<Set<string>>(new Set());
  const mobile = useIsMobile();

  useEffect(() => {
    if (status === "loading") return;
    let alive = true;
    const load = () => {
      fetch("/api/announcements/display", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!alive) return;
          const list: DisplayAnnouncement[] = Array.isArray(d?.items) ? d.items : [];
          const skip = new Set<string>(readList("session", SESSION_KEY));
          if (!loggedIn) readList("local", GUEST_KEY).forEach((id) => skip.add(id));
          setClosed(skip);
          setItems(list);
        })
        .catch(() => {});
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (h: number) => void };
    let idle: number | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (w.requestIdleCallback) idle = w.requestIdleCallback(load, { timeout: 4000 });
    else timer = setTimeout(load, 1200);
    return () => {
      alive = false;
      if (idle !== null) w.cancelIdleCallback?.(idle);
      if (timer) clearTimeout(timer);
    };
  }, [status, loggedIn]);

  const persistDismiss = useCallback(
    (id: string) => {
      if (loggedIn) {
        fetch(`/api/announcements/${encodeURIComponent(id)}/dismiss`, { method: "POST" }).catch(() => {});
      } else {
        addToList("local", GUEST_KEY, id);
      }
    },
    [loggedIn],
  );

  const visible = useMemo(() => {
    if (!items || isAnnouncementFreePath(pathname)) return { popup: null, banners: {} as Partial<Record<AnnouncementPosition, DisplayAnnouncement>> };
    const onPage = items.filter((it) => pathMatches(it.pages, pathname));
    const picked = pickPlacements(onPage, closed);
    if (mobile) {
      // روی موبایل گوشه‌ها و نوار پایین یک کارت پایین می‌شن
      const bottomish = CORNER_OR_BOTTOM.map((p) => picked.banners[p]).filter(Boolean) as DisplayAnnouncement[];
      bottomish.sort((a, b) => b.priority - a.priority);
      const banners: Partial<Record<AnnouncementPosition, DisplayAnnouncement>> = {};
      if (picked.banners.TOP) banners.TOP = picked.banners.TOP;
      if (bottomish[0]) banners.BOTTOM = bottomish[0];
      return { popup: picked.popup, banners, mobileCorner: bottomish[0]?.position !== "BOTTOM" };
    }
    return picked;
  }, [items, pathname, closed, mobile]);

  // «فقط یک بار»: همون لحظه‌ای که واقعا نشون داده شد ثبت می‌شه
  useEffect(() => {
    const shown = [visible.popup, ...Object.values(visible.banners)].filter(Boolean) as DisplayAnnouncement[];
    for (const it of shown) {
      if (it.frequency === "ONCE" && !seenRecorded.current.has(it.id)) {
        seenRecorded.current.add(it.id);
        persistDismiss(it.id);
      }
    }
  }, [visible, persistDismiss]);

  const close = useCallback(
    (it: DisplayAnnouncement) => {
      setClosed((prev) => new Set(prev).add(it.id));
      if (it.dismissible) {
        if (!seenRecorded.current.has(it.id)) persistDismiss(it.id);
        seenRecorded.current.add(it.id);
      } else {
        // بستن پاپ‌آپ غیرقابل‌ردکردن فقط برای همین بازدید
        addToList("session", SESSION_KEY, it.id);
      }
    },
    [persistDismiss],
  );

  // Escape پاپ‌آپ رو می‌بنده
  useEffect(() => {
    const p = visible.popup;
    if (!p) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(p); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible.popup, close]);

  if (!items) return null;
  const { popup, banners } = visible;
  const mobileCorner = "mobileCorner" in visible ? visible.mobileCorner : false;

  return (
    <>
      {(Object.keys(banners) as AnnouncementPosition[]).map((pos) => {
        const it = banners[pos]!;
        const corner = pos !== "TOP" && pos !== "BOTTOM";
        const variant = corner || (pos === "BOTTOM" && mobileCorner) ? "corner" : "bar";
        return (
          <div key={it.id} className={`ann-slot ann-pos-${pos.toLowerCase().replace("_", "-")}`} role="region" aria-label={it.title}>
            <AnnouncementView
              item={it}
              variant={variant}
              closable={it.dismissible}
              onClose={() => close(it)}
              onCta={() => { if (it.dismissible) close(it); }}
            />
          </div>
        );
      })}
      {popup && (
        <>
          <div className="modal-overlay open ann-overlay" onClick={() => close(popup)} />
          <div className="modal-panel open ann-popup-panel" role="dialog" aria-modal="true" aria-label={popup.title}>
            <AnnouncementView item={popup} variant="popup" closable onClose={() => close(popup)} onCta={() => close(popup)} />
          </div>
        </>
      )}
    </>
  );
}
