"use client";

import { useCallback, useEffect } from "react";
import { RotateCw } from "lucide-react";
import { tr } from "@/lib/i18n";

/** آدرسی که کاربر می‌خواست (سرویس‌ورکر توی `from` می‌ذاره)؛ فقط مسیر همین سایت */
function targetPath(): string | null {
  try {
    const from = new URLSearchParams(window.location.search).get("from");
    if (from && from.startsWith("/") && !from.startsWith("//") && !from.startsWith("/offline")) return from;
  } catch { /* بی‌اهمیت */ }
  return null;
}

/**
 * دکمه‌ی «تلاش دوباره» صفحه‌ی آفلاین: همون صفحه‌ای که کاربر می‌خواست رو دوباره باز می‌کنه و
 * با برگشتن اینترنت هم خودکار می‌ره (سرویس‌ورکر صفحه‌ی ذخیره‌شده یا نسخه‌ی تازه رو می‌ده).
 */
export function OfflineRetry() {
  const retry = useCallback(() => {
    const to = targetPath();
    if (to) window.location.replace(to);
    else window.location.reload();
  }, []);

  useEffect(() => {
    if (!targetPath()) return;
    window.addEventListener("online", retry);
    // دیپلوی/ری‌استارت سرور: مرورگر آنلاینه و رویداد online هیچ‌وقت نمیاد، پس کاربری که
    // همون چند ثانیه روی لینکی زده بود روی این صفحه می‌موند و «تلاش دوباره» می‌خواست.
    // سلامت سرور رو آروم چک می‌کنیم و به محض برگشتن، خودکار به مقصد می‌ریم.
    let stopped = false;
    let busy = false;
    const probe = async () => {
      if (stopped || busy || document.visibilityState === "hidden") return;
      busy = true;
      try {
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), 4000);
        const res = await fetch("/api/health", { cache: "no-store", signal: ctl.signal });
        clearTimeout(timer);
        if (res.ok && !stopped) retry();
      } catch { /* هنوز بالا نیومده */ }
      busy = false;
    };
    const id = window.setInterval(probe, 3000);
    document.addEventListener("visibilitychange", probe);
    return () => {
      stopped = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", probe);
      window.removeEventListener("online", retry);
    };
  }, [retry]);

  return (
    <button type="button" className="btn btn-primary" onClick={retry}>
      <RotateCw size={16} aria-hidden="true" />
      {tr("تلاش دوباره", "Try again")}
    </button>
  );
}
