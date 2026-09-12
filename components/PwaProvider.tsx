"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

/**
 * دو کار که هردو لازمه‌ی «مثل یه اپ واقعی» بودن‌اند:
 *
 *  ۱) ثبتِ سرویس‌ورکر در *هر* بار لود. قبلا `lib/pushClient.ts` تنها جایی
 *     بود که SW را رجیستر می‌کرد، آن هم فقط وقتی کاربر نوتیف را روشن
 *     می‌کرد — یعنی برای اکثر کاربرها اصلا ثبت نمی‌شد و هیچ کشی اتفاق
 *     نمی‌افتاد. (رجیسترِ دوباره در pushClient بی‌ضرر است: مرورگر همان
 *     رجیستریشن موجود را برمی‌گرداند.)
 *
 *  ۲) دکمه‌ی نصب واقعی. کروم اندروید رویداد `beforeinstallprompt` را
 *     می‌دهد و اگر نگهش نداریم، تنها راهِ نصب منوی سه‌نقطه‌ی مرورگر است که
 *     عملا هیچ‌کس پیدایش نمی‌کند.
 */

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "arion-install-dismissed";

export function PwaProvider() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  // ── ثبت سرویس‌ورکر ──
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // بعد از load ثبت می‌شود، نه قبلش: در غیر این صورت دانلود و نصبِ SW با
    // منابعِ خودِ لودِ اول رقابت می‌کند و اولین بازدید را کندتر می‌کند —
    // دقیقا خلافِ چیزی که می‌خواهیم.
    const onLoad = () => { navigator.serviceWorker.register("/sw.js").catch(() => {}); };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, []);

  // ── گرفتنِ رویدادِ نصب ──
  useEffect(() => {
    function onBeforeInstall(e: Event) {
      // جلوگیری از بنرِ پیش‌فرضِ مرورگر تا خودمان در جای مناسب نشانش بدهیم
      e.preventDefault();
      setDeferred(e as InstallPromptEvent);
      let dismissed = false;
      try { dismissed = localStorage.getItem(DISMISS_KEY) === "1"; } catch { /* حالت ناشناس/کوکی‌بسته */ }
      if (!dismissed) setVisible(true);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    // وقتی نصب شد دیگر پیشنهاد بی‌معنی‌ست
    const onInstalled = () => { setVisible(false); setDeferred(null); };
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    setVisible(false);
    await deferred.prompt();
    await deferred.userChoice.catch(() => null);
    setDeferred(null);
  }

  function dismiss() {
    setVisible(false);
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* بی‌اهمیت */ }
  }

  if (!visible) return null;

  return (
    <div className="pwa-install-bar" role="dialog" aria-label="نصب اپ آریون">
      <div className="pwa-install-text">
        <b>آریون را نصب کن</b>
        <span>سریع‌تر باز می‌شود و بدون نوار مرورگر، مثل یک اپ واقعی.</span>
      </div>
      <div className="pwa-install-actions">
        <button type="button" className="pwa-install-btn" onClick={install}>
          <Download size={15} aria-hidden="true" /> نصب
        </button>
        <button type="button" className="pwa-install-close" onClick={dismiss} aria-label="بستن">
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
